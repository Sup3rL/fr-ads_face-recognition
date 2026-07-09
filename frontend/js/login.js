// Wait for the HTML to fully load before running our script
document.addEventListener('DOMContentLoaded', () => {
    
    // Find our form and error message elements on the page
    const loginForm = document.getElementById('loginForm');
    const errorMessage = document.getElementById('error-message');

    // Listen for the moment the user clicks the "Login" button
    loginForm.addEventListener('submit', async (event) => {
        // Prevent the default HTML form submission (which refreshes the page)
        event.preventDefault();

        // Get the values the user typed in
        const nip = document.getElementById('nip').value;
        const password = document.getElementById('password').value;

        try {
            // We use the 'fetch' API. This is Javascript's built-in way to make HTTP requests (like cURL!)
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                // Convert our Javascript variables into a JSON string
                body: JSON.stringify({ nip: nip, password: password })
            });

            // Parse the JSON response from our Golang backend
            const data = await response.json();

            // If the response is NOT OK (e.g., 401 Unauthorized)
            if (!response.ok) {
                errorMessage.textContent = data.error || 'Login failed. Please try again.';
                errorMessage.style.display = 'block';
                return; // Stop running code
            }

            // IF SUCCESS:
            // 1. Hide any previous errors
            errorMessage.style.display = 'none';
            
            // 2. Save the digital ID card (JWT token) into LocalStorage.
            // LocalStorage is a tiny database inside the user's browser that remembers things even if they close the tab.
            localStorage.setItem('token', data.token);
            localStorage.setItem('lecturerName', data.name);

            // 3. Alert the user and redirect to the dashboard
            alert(`Welcome, ${data.name}!`);
            window.location.href = '/app/dashboard.html'; // We will build this page next!

        } catch (error) {
            console.error('Error connecting to the server:', error);
            errorMessage.textContent = 'Could not connect to the server. Is it running?';
            errorMessage.style.display = 'block';
        }
    });
});