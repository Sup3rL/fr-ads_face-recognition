document.addEventListener('DOMContentLoaded', async () => {
    const tbody = document.getElementById('studentTableBody');
    
    const res = await fetch('/api/students');
    const students = await res.json();
    
    tbody.innerHTML = students.map(s => `
        <tr>
            <td>${s.nim}</td>
            <td>${s.name}</td>
            <td>${s.program}</td>
            <td>
                <button onclick="deleteStudent(${s.id})" class="btn-danger" style="padding:5px; font-size:12px;">Delete</button>
            </td>
        </tr>
    `).join('');
});

async function deleteStudent(id) {
    if(confirm('Are you sure you want to delete this student?')) {
        await fetch(`/api/students/${id}`, { method: 'DELETE' });
        window.location.reload();
    }
}