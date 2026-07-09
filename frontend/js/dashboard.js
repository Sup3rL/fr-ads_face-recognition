document.addEventListener('DOMContentLoaded', () => {
    
    // 1. THE BOUNCER: Check if the user has a digital ID card (token)
    const token = localStorage.getItem('token');
    
    if (!token) {
        // If there is no token, kick them back to the login page immediately!
        alert("Unauthorized! Please log in first.");
        window.location.href = '/app/login.html';
        return; // Stop running code
    }

    // 2. Say Hello
    // Get the name we saved during login and put it in the navbar
    const lecturerName = localStorage.getItem('lecturerName') || 'Lecturer';
    document.getElementById('welcomeMessage').textContent = `Hello, ${lecturerName}`;

    // 3. Handle Logout
    const logoutBtn = document.getElementById('logoutBtn');
    logoutBtn.addEventListener('click', () => {
        // To log out on the frontend, we simply rip up the ID card!
        // We delete the token from localStorage.
        localStorage.removeItem('token');
        localStorage.removeItem('lecturerName');
        
        // Send them back to the login page
        window.location.href = '/app/login.html';
    });
});