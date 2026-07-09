document.addEventListener('DOMContentLoaded', async () => {
    
    // Security check: ensure lecturer is logged in
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/app/login.html';
        return;
    }

    const video = document.getElementById('video');
    const statusText = document.getElementById('statusText');
    const submitBtn = document.getElementById('submitBtn');
    const registerForm = document.getElementById('registerForm');
    const errorMessage = document.getElementById('error-message');

    // 1. Load AI Models
    try {
        await Promise.all([
            faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
            faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
            faceapi.nets.faceRecognitionNet.loadFromUri('/models')
        ]);
        
        // 2. Start Camera
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        video.srcObject = stream;
        
        statusText.textContent = "Camera Ready. Position the student's face in the frame.";
        statusText.style.color = "var(--success)";
        
        // Enable the submit button now that everything is loaded
        submitBtn.textContent = "Capture & Register Student";
        submitBtn.disabled = false;

    } catch (err) {
        statusText.textContent = "Error loading camera or AI models.";
        statusText.style.color = "var(--danger)";
        console.error(err);
    }

    // 3. Handle Form Submission
    registerForm.addEventListener('submit', async (event) => {
        event.preventDefault(); // Stop page refresh

        // Change button state so they don't click it twice
        submitBtn.disabled = true;
        submitBtn.textContent = "Extracting Face Data...";
        errorMessage.style.display = 'none';

        try {
            // A. Detect the face in the current video frame
            const detection = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
                                           .withFaceLandmarks()
                                           .withFaceDescriptor();

            if (!detection) {
                throw new Error("No face detected! Please ask the student to look at the camera.");
            }

            // B. Take a snapshot photo (The invisible canvas trick!)
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            // We must flip the context horizontally so the saved photo isn't backwards!
            ctx.translate(canvas.width, 0);
            ctx.scale(-1, 1);
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const photoBase64 = canvas.toDataURL('image/jpeg');

            // C. Gather the text data
            const requestData = {
                nim: document.getElementById('nim').value,
                name: document.getElementById('name').value,
                program: document.getElementById('program').value,
                // Array.from converts the Float32Array into a standard Javascript array so JSON can read it
                face_descriptor: Array.from(detection.descriptor), 
                photo_base64: photoBase64
            };

            // D. Send everything to our Golang Backend!
            submitBtn.textContent = "Saving to Database...";
            
            const response = await fetch('/api/register-face', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                    // In a real app, we would also send the JWT token here for security, 
                    // but we are keeping it simple for the tutorial!
                },
                body: JSON.stringify(requestData)
            });

            const responseData = await response.json();

            if (!response.ok) {
                throw new Error(responseData.error || "Failed to register student.");
            }

            // SUCCESS!
            alert(`Success: ${responseData.message}`);
            
            // Clear the form for the next student
            registerForm.reset();

        } catch (error) {
            errorMessage.textContent = error.message;
            errorMessage.style.display = 'block';
        } finally {
            // Turn the button back on
            submitBtn.disabled = false;
            submitBtn.textContent = "Capture & Register Student";
        }
    });
});