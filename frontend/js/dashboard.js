document.addEventListener('DOMContentLoaded', async () => {
    
    const token = localStorage.getItem('token');
    const name = localStorage.getItem('name');
    
    // Security check
    if (!token) {
        window.location.href = '/app/login.html';
        return;
    }

    // --- ROBUST JWT DECODER ---
    const base64Url = token.split('.')[1];
    let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    // Add padding if missing (fixes crashes in some browsers)
    while (base64.length % 4) {
        base64 += '=';
    }
    const payload = JSON.parse(window.atob(base64));
    const lecturerId = payload.id; 

    // Note: If the screen still says "Hello," after saving this, you MUST Hard Refresh!
    document.getElementById('welcomeMessage').textContent = `Welcome, ${name}`;

    const classGrid = document.getElementById('classGrid');
    const createClassCard = document.getElementById('createClassCard');
    const createClassForm = document.getElementById('createClassForm');
    const newClassForm = document.getElementById('newClassForm');

    // 1. Function to Fetch and Render Classes
    async function loadClasses() {
        try {
            const response = await fetch(`/api/courses?lecturer_id=${lecturerId}`);
            const courses = await response.json();

            // Clear old courses safely without destroying our "Create" button
            Array.from(classGrid.children).forEach(child => {
                if (child.id !== 'createClassCard') {
                    classGrid.removeChild(child);
                }
            });
            
            courses.forEach(course => {
                const card = document.createElement('a');
                card.href = `/app/class-details.html?course_id=${course.id}`;
                card.className = 'card';
                card.innerHTML = `
                    <h3>🏫 ${course.course_name}</h3>
                    <p style="color: #666; font-size: 14px;">Code: ${course.course_code}</p>
                `;
                // Insert the new class BEFORE the "Create New Class" button
                classGrid.insertBefore(card, createClassCard);
            });
        } catch (error) {
            console.error("Error loading courses:", error);
        }
    }

    // 2. UI Toggles for the Create Form
    createClassCard.addEventListener('click', () => {
        createClassForm.style.display = 'block';
        createClassCard.style.display = 'none';
    });

    document.getElementById('cancelCreateBtn').addEventListener('click', () => {
        createClassForm.style.display = 'none';
        createClassCard.style.display = 'flex';
    });

    // 3. Handle Class Creation
    newClassForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const code = document.getElementById('courseCode').value;
        const courseName = document.getElementById('courseName').value;

        try {
            const response = await fetch('/api/courses', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    course_code: code,
                    course_name: courseName,
                    lecturer_id: lecturerId
                })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error);

            // Success! Reset UI and reload the grid
            newClassForm.reset();
            createClassForm.style.display = 'none';
            createClassCard.style.display = 'flex';
            loadClasses();

        } catch (error) {
            alert(error.message);
        }
    });

    // 4. Handle Logout
    document.getElementById('logoutBtn').addEventListener('click', () => {
        localStorage.clear();
        window.location.href = '/app/login.html';
    });

    // Load classes instantly!
    loadClasses();
});