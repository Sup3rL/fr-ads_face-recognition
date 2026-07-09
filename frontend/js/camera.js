const video = document.getElementById('video');
const statusText = document.getElementById('statusText');

let currentSessionId = null;
let isProcessing = false; // Our Spam Prevention Lock!

// 1. Load the AI Models
Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
    faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
    faceapi.nets.faceRecognitionNet.loadFromUri('/models')
]).then(startVideo).catch(err => {
    console.error(err);
    statusText.textContent = "Error loading AI models.";
});

// 2. Turn on the Webcam
function startVideo() {
    navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => { video.srcObject = stream; })
        .catch(err => console.error(err));
}

// 3. Helper Function: Start the Database Session
async function startAttendanceSession() {
    try {
        // For this tutorial, we hardcode Course 1 and Lecturer 1.
        // In a real app, the lecturer would select this from a dropdown.
        const response = await fetch('/api/sessions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ course_id: 1, lecturer_id: 1 })
        });
        const data = await response.json();
        if (response.ok) {
            currentSessionId = data.session_id;
            console.log("Database Session Started: ID " + currentSessionId);
        }
    } catch (error) {
        console.error("Failed to start session:", error);
    }
}

// 4. The Main Loop!
video.addEventListener('play', async () => {
    
    // Create the session in PostgreSQL!
    await startAttendanceSession();

    // Setup the invisible canvas
    const canvas = faceapi.createCanvasFromMedia(video);
    document.querySelector('.camera-container').append(canvas);
    const displaySize = { width: video.width, height: video.height };
    faceapi.matchDimensions(canvas, displaySize);

    setInterval(async () => {
        // If we are already talking to the backend, OR the session hasn't started yet, DO NOTHING.
        if (isProcessing || !currentSessionId) return;

        const detection = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
                                       .withFaceLandmarks()
                                       .withFaceDescriptor();

        canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);

        if (detection) {
            // Draw the box
            const resizedDetection = faceapi.resizeResults(detection, displaySize);
            faceapi.draw.drawDetections(canvas, resizedDetection);

            // LOCK THE CAMERA!
            isProcessing = true; 
            statusText.textContent = "Verifying Identity...";
            statusText.style.color = "var(--primary)";

            try {
                // Send the 128 numbers to Golang!
                const response = await fetch('/api/authenticate-face', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        session_id: currentSessionId,
                        descriptor: Array.from(detection.descriptor)
                    })
                });

                const data = await response.json();

                // Handle the Backend's Answer:
                if (data.status === "PRESENT") {
                    statusText.innerHTML = `✅ Success: ${data.name} (${data.nim})`;
                    statusText.style.color = "var(--success)";
                    // Pause for 3 seconds so they can read it, then unlock
                    setTimeout(() => { isProcessing = false; }, 3000);
                
                } else if (data.status === "Already Recorded") {
                    statusText.innerHTML = `⚠️ ${data.name} already recorded!`;
                    statusText.style.color = "var(--primary)";
                    // Pause for 3 seconds, then unlock
                    setTimeout(() => { isProcessing = false; }, 3000);
                
                } else {
                    statusText.innerHTML = `❌ Unknown Face`;
                    statusText.style.color = "var(--danger)";
                    // Pause for 1.5 seconds, then unlock
                    setTimeout(() => { isProcessing = false; }, 1500);
                }

            } catch (err) {
                console.error("Backend Error:", err);
                isProcessing = false; // Unlock if there was an error
            }

        } else {
            // No face detected
            statusText.textContent = "Silakan Maju (Please Step Forward)";
            statusText.style.color = "var(--success)";
        }
    }, 100);
});