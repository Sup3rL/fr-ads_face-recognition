const video = document.getElementById('video');
const statusText = document.getElementById('statusText');

let currentSessionId = null;
let isProcessing = false;

// --- 1. DYNAMIC DATA EXTRACTION ---
const urlParams = new URLSearchParams(window.location.search);
const currentCourseId = parseInt(urlParams.get('course_id'));
const existingSessionId = urlParams.get('session_id'); // Catch the session if it exists!

if (!currentCourseId) {
    alert("Error: No class selected.");
    window.location.href = '/app/dashboard.html';
}

// --- END SESSION BUTTON ---
document.getElementById('endSessionBtn').addEventListener('click', () => {
    window.location.href = `/app/class-details.html?course_id=${currentCourseId}`;
});

const token = localStorage.getItem('token');
if (!token) window.location.href = '/app/login.html';

const base64Url = token.split('.')[1];
let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
while (base64.length % 4) { base64 += '='; }
const payload = JSON.parse(window.atob(base64));
const currentLecturerId = payload.id;

// --- 2. LOAD AI MODELS ---
Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
    faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
    faceapi.nets.faceRecognitionNet.loadFromUri('/models')
]).then(startVideo).catch(err => {
    console.error(err);
    statusText.textContent = "Error loading AI models.";
});

function startVideo() {
    navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => { video.srcObject = stream; })
        .catch(err => console.error(err));
}

// --- 3. DYNAMIC SESSION HANDLER ---
async function initializeSession() {
    // If a session_id was passed in the URL, use it!
    if (existingSessionId) {
        currentSessionId = existingSessionId;
        console.log("Resuming existing session: " + currentSessionId);
    } else {
        // Otherwise, create a new one
        try {
            const response = await fetch('/api/sessions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    course_id: currentCourseId, 
                    lecturer_id: currentLecturerId,
                    session_name: "Auto-Started Session"
                })
            });
            const data = await response.json();
            if (response.ok) {
                currentSessionId = data.session_id;
                console.log("New session created: " + currentSessionId);
            }
        } catch (error) {
            console.error("Failed to start session:", error);
        }
    }
}

// --- 4. THE MAIN AI LOOP ---
video.addEventListener('play', async () => {
    
    await initializeSession(); // Call the new dynamic initializer

    const canvas = faceapi.createCanvasFromMedia(video);
    document.querySelector('.camera-container').append(canvas);
    const displaySize = { width: video.width, height: video.height };
    faceapi.matchDimensions(canvas, displaySize);

    setInterval(async () => {
        if (isProcessing || !currentSessionId) return;

        const detection = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
                                       .withFaceLandmarks()
                                       .withFaceDescriptor();

        canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);

        if (detection) {
            const resizedDetection = faceapi.resizeResults(detection, displaySize);
            
            // Blue Box remains here!
            faceapi.draw.drawDetections(canvas, resizedDetection);
            faceapi.draw.drawFaceLandmarks(canvas, resizedDetection);

            isProcessing = true; 
            statusText.textContent = "Verifying...";

            try {
                const response = await fetch('/api/authenticate-face', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        session_id: parseInt(currentSessionId), // Ensure it's an int
                        course_id: currentCourseId, 
                        descriptor: Array.from(detection.descriptor)
                    })
                });

                const data = await response.json();

                if (data.status === "PRESENT") {
                    statusText.innerHTML = `✅ ${data.name} Recorded`;
                    statusText.style.color = "var(--success)";
                    setTimeout(() => { isProcessing = false; }, 3000);
                } else if (data.status === "UNKNOWN") {
                    statusText.innerHTML = `⚠️ Unknown Person`;
                    statusText.style.color = "var(--danger)";
                    setTimeout(() => { isProcessing = false; }, 1500);
                } else {
                    statusText.innerHTML = `✅ ${data.name} ${data.status}`;
                    statusText.style.color = "var(--success)";
                    setTimeout(() => { isProcessing = false; }, 1500);
                }

            } catch (err) {
                console.error("Backend Error:", err);
                isProcessing = false; 
            }
        } else {
            statusText.textContent = "Please step forward";
        }
    }, 100);
});