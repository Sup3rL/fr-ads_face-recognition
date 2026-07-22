document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token');
    if (!token) { window.location.href = '/app/login.html'; return; }

    const urlParams = new URLSearchParams(window.location.search);
    const courseId = urlParams.get('course_id');

    if (!courseId) {
        alert("No class selected!");
        window.location.href = '/app/dashboard.html';
        return;
    }

    const sessionSelect = document.getElementById('sessionSelect');
    const tableBody = document.getElementById('attendanceTableBody');

    document.getElementById('backBtn').addEventListener('click', () => {
        window.location.href = `/app/class-details.html?course_id=${courseId}`;
    });

    // 1. Load Sessions
    try {
        const res = await fetch(`/api/sessions/class?course_id=${courseId}`);
        const sessions = await res.json();
        sessionSelect.innerHTML = '<option value="">-- Select a Session --</option>';
        sessions.forEach(session => {
            const date = new Date(session.opened_at).toLocaleString();
            sessionSelect.innerHTML += `<option value="${session.id}" data-name="${session.session_name}" data-details="${session.details}">${session.session_name} (${date})</option>`;
        });
    } catch (e) { console.error(e); }

    // 2. Load Roster
    let roster = [];
    try {
        const res = await fetch(`/api/courses/students?course_id=${courseId}`);
        roster = await res.json();
    } catch (e) { console.error(e); }

    // 3. Render Table Function (This was missing!)
    async function renderTable(sessionId, attendances) {
        tableBody.innerHTML = '';
        roster.forEach(student => {
            const att = attendances.find(a => a.student_id === student.id);
            const status = att ? att.status : 'ABSENT';
            const displayStatus = status === 'IZIN' ? 'LEAVE' : status;
            const statusClass = status === 'PRESENT' ? 'status-present' : status === 'IZIN' ? 'status-leave' : 'status-absent';

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${student.nim}</td>
                <td>${student.name}</td>
                <td style="text-align: right;">
                    <select class="override-dropdown ${statusClass}" data-sid="${student.id}" data-sessionid="${sessionId}">
                        <option value="PRESENT" ${status === 'PRESENT' ? 'selected' : ''} class="option-present">PRESENT (P)</option>
                        <option value="IZIN" ${status === 'IZIN' ? 'selected' : ''} class="option-leave">LEAVE (L)</option>
                        <option value="ABSENT" ${status === 'ABSENT' ? 'selected' : ''} class="option-absent">ABSENT (A)</option>
                    </select>
                </td>
            `;
            tableBody.appendChild(row);
        });

        // Add Listeners to dropdowns
        document.querySelectorAll('.override-dropdown').forEach(select => {
            select.addEventListener('change', async (e) => {
                await overrideAttendance(e.target.dataset.sessionid, e.target.dataset.sid, e.target.value);
            });
        });
    }

    // 4. API Call for Override
    async function overrideAttendance(sessionId, studentId, status) {
        await fetch('/api/sessions/override', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                session_id: parseInt(sessionId),
                student_id: parseInt(studentId),
                status: status
            })
        });
        // Refresh data
        const attRes = await fetch(`/api/sessions/attendance?session_id=${sessionId}`);
        const attendances = await attRes.json();
        renderTable(sessionId, attendances);
    }

    // 5. Handle Session Change
    sessionSelect.addEventListener('change', async (e) => {
        const sessionId = e.target.value;
        if (!sessionId) {
            document.getElementById('sessionDetailsDisplay').textContent = '-';
            document.getElementById('sessionDetailsDisplay').style.opacity = '0.5';
            tableBody.innerHTML = '<tr><td colspan="3" style="text-align:center;">Please select a session first.</td></tr>';
            return;
        }
        
        // Display session details
        const selectedOption = e.target.selectedOptions[0];
        const sessionDetails = selectedOption.getAttribute('data-details');
        
        const detailsElement = document.getElementById('sessionDetailsDisplay');
        if (sessionDetails && sessionDetails.trim()) {
            detailsElement.textContent = sessionDetails;
            detailsElement.style.opacity = '1';
        } else {
            detailsElement.textContent = 'No detail';
            detailsElement.style.opacity = '0.5';
        }
        
        const attRes = await fetch(`/api/sessions/attendance?session_id=${sessionId}`);
        const attendances = await attRes.json();
        renderTable(sessionId, attendances);
    });

    document.getElementById('deleteSessionBtn').addEventListener('click', async () => {
    const sessionId = sessionSelect.value;
    if (!sessionId) {
        alert("Please select a session to delete first.");
        return;
    }

    if (confirm("Are you sure? This will permanently delete all attendance records for this session.")) {
        try {
            const res = await fetch(`/api/sessions?session_id=${sessionId}`, { method: 'DELETE' });
            if (res.ok) {
                alert("Session deleted.");
                window.location.reload(); // Refresh the page to update the list
            } else {
                alert("Failed to delete session.");
            }
        } catch (e) { console.error(e); }
    }
});
});