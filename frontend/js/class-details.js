document.addEventListener('DOMContentLoaded', async () => {
    
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/app/login.html';
        return;
    }

    // 1. Get the course_id from the URL (e.g., ?course_id=5)
    const urlParams = new URLSearchParams(window.location.search);
    const courseId = urlParams.get('course_id');

    if (!courseId) {
        alert("No class selected!");
        window.location.href = '/app/dashboard.html';
        return;
    }

    const rosterTableBody = document.getElementById('rosterTableBody');
    const searchForm = document.getElementById('searchForm');
    const resultCard = document.getElementById('resultCard');
    const enrollBtn = document.getElementById('enrollBtn');
    let currentSearchedStudentId = null;

    // 2. Setup the Big Action Buttons
    document.getElementById('startSessionBtn').addEventListener('click', () => {
        // Pass the course_id to the camera page so it knows WHICH class is starting!
        window.location.href = `/app/camera.html?course_id=${courseId}`;
    });

    document.getElementById('viewHistoryBtn').addEventListener('click', () => {
        // We will update the history page later, but let's pass the course_id anyway
        window.location.href = `/app/history.html?course_id=${courseId}`;
    });

    // 3. Load Enrolled Students
    async function loadRoster() {
        try {
            const response = await fetch(`/api/courses/students?course_id=${courseId}`);
            const students = await response.json();

            rosterTableBody.innerHTML = '';

            if (students.length === 0) {
                rosterTableBody.innerHTML = '<tr><td colspan="3" style="text-align:center;">No students enrolled yet.</td></tr>';
                return;
            }

            students.forEach(student => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${student.nim}</td>
                    <td><strong>${student.name}</strong></td>
                    <td style="text-align: right;">
                        <button class="btn-danger remove-btn" data-id="${student.id}" style="padding: 5px 10px; font-size: 12px;">Remove</button>
                    </td>
                `;
                rosterTableBody.appendChild(row);
            });

            // Attach event listeners to the new "Remove" buttons
            document.querySelectorAll('.remove-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const studentId = e.target.getAttribute('data-id');
                    if(confirm("Are you sure you want to remove this student from the class?")) {
                        await removeStudent(studentId);
                    }
                });
            });

        } catch (error) {
            rosterTableBody.innerHTML = '<tr><td colspan="3" style="text-align:center; color: red;">Failed to load roster.</td></tr>';
        }
    }

    // 4. Remove Student API Call
    async function removeStudent(studentId) {
        try {
            const response = await fetch('/api/courses/unenroll', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    course_id: parseInt(courseId),
                    student_id: parseInt(studentId)
                })
            });
            if (response.ok) {
                loadRoster(); // Reload the table!
            } else {
                alert("Failed to remove student");
            }
        } catch (err) {
            console.error(err);
        }
    }

    // 5. Search Student API Call
    searchForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        document.getElementById('searchError').style.display = 'none';
        resultCard.style.display = 'none';
        document.getElementById('enrollMessage').textContent = '';

        const nim = document.getElementById('searchNim').value;

        try {
            const response = await fetch(`/api/students/search?nim=${nim}`);
            const data = await response.json();

            if (!response.ok) throw new Error(data.error || 'Student not found');

            document.getElementById('foundName').textContent = data.name;
            document.getElementById('foundNim').textContent = `NIM: ${data.nim}`;
            currentSearchedStudentId = data.id; 
            
            resultCard.style.display = 'block';

        } catch (error) {
            document.getElementById('searchError').textContent = error.message;
            document.getElementById('searchError').style.display = 'block';
        }
    });

    // 6. Enroll Student API Call
    enrollBtn.addEventListener('click', async () => {
        const msg = document.getElementById('enrollMessage');
        enrollBtn.disabled = true;
        msg.textContent = "Enrolling...";

        try {
            const response = await fetch('/api/courses/enroll', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    course_id: parseInt(courseId),
                    student_id: parseInt(currentSearchedStudentId)
                })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error);

            msg.textContent = "✅ " + data.message;
            msg.style.color = "var(--success)";
            
            // Reload the roster immediately to show the new student!
            loadRoster();

        } catch (error) {
            msg.textContent = "❌ " + error.message;
            msg.style.color = "var(--danger)";
        } finally {
            enrollBtn.disabled = false;
        }
    });

    // Initial Load
    loadRoster();
});