const video = document.getElementById('video');
const statusText = document.getElementById('statusText');

let currentSessionId = null;
let isProcessing = false; // Our Spam Prevention Lock!

// --- 1. DYNAMIC DATA EXTRACTION ---
// Get Course ID from the URL
const urlParams = new URLSearchParams(window.location.search);
const currentCourseId = parseInt(urlParams.get('course_id'));

if (!currentCourseId) {
    alert("Error: No class selected.");
    window.location.href = '/app/dashboard.html';
}

// Get Lecturer ID from the JWT Token
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

// --- 3. TURN ON WEBCAM ---
function startVideo() {
    navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => { video.srcObject = stream; })
        .catch(err => console.error(err));
}

// --- 4. START SESSION (DYNAMIC) ---
async function startAttendanceSession() {
    try {
        const response = await fetch('/api/sessions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                course_id: currentCourseId, 
                lecturer_id: currentLecturerId 
            })
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

// --- 5. THE MAIN AI LOOP ---
video.addEventListener('play', async () => {
    
    await startAttendanceSession();

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
            
            // --- THE CLASSIC BLUE BOX IS BACK! ---
            faceapi.draw.drawDetections(canvas, resizedDetection);
            faceapi.draw.drawFaceLandmarks(canvas, resizedDetection);

            isProcessing = true; 
            statusText.textContent = "Verifying Identity...";
            statusText.style.color = "var(--primary)";

            try {
                // SEND DYNAMIC COURSE ID TO BACKEND!
                const response = await fetch('/api/authenticate-face', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        session_id: currentSessionId,
                        course_id: currentCourseId, 
                        descriptor: Array.from(detection.descriptor)
                    })
                });

                const data = await response.json();

                if (data.status === "PRESENT") {
                    statusText.innerHTML = `✅ Success: ${data.name} (${data.nim})`;
                    statusText.style.color = "var(--success)";
                    setTimeout(() => { isProcessing = false; }, 3000);
                } else if (data.status === "Already Recorded") {
                    statusText.innerHTML = `⚠️ ${data.name} already recorded!`;
                    statusText.style.color = "var(--primary)";
                    setTimeout(() => { isProcessing = false; }, 3000);
                } else {
                    statusText.innerHTML = `❌ Unknown Face`;
                    statusText.style.color = "var(--danger)";
                    setTimeout(() => { isProcessing = false; }, 1500);
                }

            } catch (err) {
                console.error("Backend Error:", err);
                isProcessing = false; 
            }

        } else {
            statusText.textContent = "Silakan Maju (Please Step Forward)";
            statusText.style.color = "var(--success)";
        }
    }, 100);
});