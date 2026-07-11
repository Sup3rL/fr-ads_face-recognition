document.addEventListener('DOMContentLoaded', async () => {
    
    // Security Check
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/app/login.html';
        return;
    }

    const courseSelect = document.getElementById('courseSelect');
    const searchForm = document.getElementById('searchForm');
    const searchError = document.getElementById('searchError');
    const resultCard = document.getElementById('resultCard');
    const enrollBtn = document.getElementById('enrollBtn');
    const enrollMessage = document.getElementById('enrollMessage');

    let currentStudentId = null;

    // 1. Fetch Courses for this Lecturer
    try {
        // We use lecturer_id=1 for our Admin. In a real app, this would come from the JWT token!
        const response = await fetch('/api/courses?lecturer_id=1');
        const courses = await response.json();
        
        courseSelect.innerHTML = '<option value="">-- Select a Course --</option>';
        courses.forEach(course => {
            courseSelect.innerHTML += `<option value="${course.id}">${course.course_code} - ${course.course_name}</option>`;
        });
    } catch (error) {
        courseSelect.innerHTML = '<option value="">Failed to load courses</option>';
    }

    // 2. Search for a Student
    searchForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        searchError.style.display = 'none';
        resultCard.style.display = 'none';
        enrollMessage.textContent = '';

        const nim = document.getElementById('searchNim').value;

        try {
            const response = await fetch(`/api/students/search?nim=${nim}`);
            const data = await response.json();

            if (!response.ok) throw new Error(data.error || 'Student not found');

            // Populate the result card
            document.getElementById('foundName').textContent = data.name;
            document.getElementById('foundNim').textContent = `NIM: ${data.nim}`;
            currentStudentId = data.id; // Remember their database ID!
            
            // Show the card
            resultCard.style.display = 'block';

        } catch (error) {
            searchError.textContent = error.message;
            searchError.style.display = 'block';
        }
    });

    // 3. Enroll the Student in the Class
    enrollBtn.addEventListener('click', async () => {
        const courseId = courseSelect.value;
        
        if (!courseId) {
            enrollMessage.textContent = "Please select a course first!";
            enrollMessage.style.color = "var(--danger)";
            return;
        }

        enrollBtn.disabled = true;
        enrollMessage.textContent = "Enrolling...";
        enrollMessage.style.color = "#666";

        try {
            const response = await fetch('/api/courses/enroll', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    course_id: parseInt(courseId),
                    student_id: parseInt(currentStudentId)
                })
            });

            const data = await response.json();

            if (!response.ok) throw new Error(data.error);

            // Success!
            enrollMessage.textContent = "✅ " + data.message;
            enrollMessage.style.color = "var(--success)";

        } catch (error) {
            enrollMessage.textContent = "❌ " + error.message;
            enrollMessage.style.color = "var(--danger)";
        } finally {
            enrollBtn.disabled = false;
        }
    });
});