document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/app/login.html';
        return;
    }

    // 1. Get Course ID and decode Lecturer ID from Token
    const urlParams = new URLSearchParams(window.location.search);
    const courseId = urlParams.get('course_id');

    if (!courseId) {
        alert("No class selected!");
        window.location.href = '/app/dashboard.html';
        return;
    }

    const base64Url = token.split('.')[1];
    let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) { base64 += '='; }
    const payload = JSON.parse(window.atob(base64));
    const lecturerId = payload.id;

    // UI Elements
    const rosterTableBody = document.getElementById('rosterTableBody');
    const searchForm = document.getElementById('searchForm');
    const resultCard = document.getElementById('resultCard');
    const enrollBtn = document.getElementById('enrollBtn');
    
    // Modal Elements
    const sessionModal = document.getElementById('sessionModal');
    const startSessionBtn = document.getElementById('startSessionBtn');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const startSessionForm = document.getElementById('startSessionForm');

    let currentSearchedStudentId = null;

    // --- 2. SESSION MODAL LOGIC ---
    startSessionBtn.addEventListener('click', () => {
        sessionModal.style.display = 'flex';
    });

    closeModalBtn.addEventListener('click', () => {
        sessionModal.style.display = 'none';
    });

    startSessionForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const sessionName = document.getElementById('sessionName').value;
        const details = document.getElementById('sessionDetails').value;

        const response = await fetch('/api/sessions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                course_id: parseInt(courseId),
                lecturer_id: lecturerId,
                session_name: sessionName,
                details: details
            })
        });

        const data = await response.json();
        if (response.ok) {
            // Redirect to camera with the new session ID
            window.location.href = `/app/camera.html?course_id=${courseId}&session_id=${data.session_id}`;
        } else {
            alert("Failed to start session: " + data.error);
        }
    });

    // --- 3. HISTORY NAVIGATION ---
    document.getElementById('viewHistoryBtn').addEventListener('click', () => {
        window.location.href = `/app/history.html?course_id=${courseId}`;
    });

    // --- 4. ROSTER MANAGEMENT ---
    async function loadRoster() {
        const response = await fetch(`/api/courses/students?course_id=${courseId}`);
        const students = await response.json();

        rosterTableBody.innerHTML = '';
        if (students.length === 0) {
            rosterTableBody.innerHTML = '<tr><td colspan="3" style="text-align:center;">No students enrolled.</td></tr>';
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

        document.querySelectorAll('.remove-btn').forEach(btn => {
            btn.addEventListener('click', (e) => removeStudent(e.target.getAttribute('data-id')));
        });
    }

    async function removeStudent(studentId) {
        if(!confirm("Remove this student?")) return;
        await fetch('/api/courses/unenroll', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ course_id: parseInt(courseId), student_id: parseInt(studentId) })
        });
        loadRoster();
    }

    // --- 5. SEARCH & ENROLL ---
    searchForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nim = document.getElementById('searchNim').value;
        const response = await fetch(`/api/students/search?nim=${nim}`);
        const data = await response.json();

        if (response.ok) {
            document.getElementById('foundName').textContent = data.name;
            document.getElementById('foundNim').textContent = `NIM: ${data.nim}`;
            currentSearchedStudentId = data.id;
            resultCard.style.display = 'block';
        } else {
            alert(data.error);
        }
    });

    enrollBtn.addEventListener('click', async () => {
        await fetch('/api/courses/enroll', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ course_id: parseInt(courseId), student_id: currentSearchedStudentId })
        });
        resultCard.style.display = 'none';
        loadRoster();
    });

    loadRoster();

    document.getElementById('deleteClassBtn').addEventListener('click', async () => {
        if (confirm("WARNING: This will permanently delete this class and all associated data. Continue?")) {
            try {
                // Ensure the URL matches the route defined in backend/internal/routes/routes.go
                const response = await fetch(`/api/courses?course_id=${courseId}`, {
                    method: 'DELETE'
                });

                const data = await response.json();
                if (response.ok) {
                    alert("Class deleted successfully.");
                    window.location.href = '/app/dashboard.html';
                } else {
                    // This will show the real error from the server
                    alert("Failed to delete class: " + data.error);
                }
            } catch (err) {
                console.error("Network error:", err);
                alert("Network error. Check console for details.");
            }
        }
    });

    document.getElementById('exportCsvBtn').addEventListener('click', () => {
        // Ensure courseId is available in your scope (usually defined at the top of your JS)
        if (courseId) {
            window.location.href = `/api/export-attendance?course_id=${courseId}`;
        } else {
            alert("Course ID not found.");
        }
    });
});