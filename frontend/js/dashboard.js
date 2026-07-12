document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token');
    const name = localStorage.getItem('name');
    
    if (!token) {
        window.location.href = '/app/login.html';
        return;
    }

    const base64Url = token.split('.')[1];
    let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) base64 += '=';
    const payload = JSON.parse(window.atob(base64));
    const lecturerId = payload.id; 

    document.getElementById('welcomeMessage').textContent = `Welcome, ${name}`;

    const classGrid = document.getElementById('classGrid');
    const createClassCard = document.getElementById('createClassCard');
    const createClassForm = document.getElementById('createClassForm');
    const newClassForm = document.getElementById('newClassForm');

    async function loadClasses() {
        try {
            const response = await fetch(`/api/courses?lecturer_id=${lecturerId}`);
            const courses = await response.json();

            Array.from(classGrid.children).forEach(child => {
                if (child.id !== 'createClassCard') classGrid.removeChild(child);
            });
            
            courses.forEach(course => {
                const card = document.createElement('a');
                card.href = `/app/class-details.html?course_id=${course.id}`;
                card.className = 'card';
                card.innerHTML = `<h3>🏫 ${course.course_name}</h3><p style="color: #666; font-size: 14px;">Code: ${course.course_code}</p>`;
                classGrid.insertBefore(card, createClassCard);
            });
        } catch (error) { console.error("Error loading courses:", error); }
    }

    // Toggle form as a popup
    createClassCard.addEventListener('click', () => {
        createClassForm.style.display = 'flex'; // Centered overlay
    });

    document.getElementById('cancelCreateBtn').addEventListener('click', () => {
        createClassForm.style.display = 'none'; // Hidden
    });

    newClassForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            const response = await fetch('/api/courses', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    course_code: document.getElementById('courseCode').value,
                    course_name: document.getElementById('courseName').value,
                    lecturer_id: lecturerId
                })
            });

            if (!response.ok) throw new Error((await response.json()).error);

            newClassForm.reset();
            createClassForm.style.display = 'none'; // Close on success
            loadClasses();
        } catch (error) { alert(error.message); }
    });

    document.getElementById('logoutBtn').addEventListener('click', () => {
        localStorage.clear();
        window.location.href = '/app/login.html';
    });

    loadClasses();
});