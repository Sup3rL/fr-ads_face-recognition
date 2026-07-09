document.addEventListener('DOMContentLoaded', async () => {
    
    // 1. Security Check
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/app/login.html';
        return;
    }

    const tableBody = document.getElementById('historyTableBody');
    const exportBtn = document.getElementById('exportBtn');
    let attendanceData = []; // We will store the data here so the CSV exporter can use it

    // 2. Fetch the data from our Golang backend
    try {
        const response = await fetch('/api/history');
        attendanceData = await response.json();

        // Clear the "Loading..." message
        tableBody.innerHTML = '';

        if (attendanceData.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No attendance records found.</td></tr>';
            return;
        }

        // 3. Loop through the data and create table rows
        attendanceData.forEach(record => {
            // Format the messy database timestamp into a readable date/time
            const dateObj = new Date(record.attendance_time);
            const formattedTime = dateObj.toLocaleString();

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${record.student_nim}</td>
                <td><strong>${record.student_name}</strong></td>
                <td>${record.course_name}</td>
                <td>${formattedTime}</td>
                <td>
                    <span style="color: white; background-color: var(--success); padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold;">
                        ${record.status}
                    </span>
                </td>
            `;
            tableBody.appendChild(row);
        });

    } catch (error) {
        console.error("Error fetching history:", error);
        tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center; color: red;">Failed to load data.</td></tr>';
    }

    // 4. The CSV Exporter!
    exportBtn.addEventListener('click', () => {
        if (attendanceData.length === 0) {
            alert("No data to export!");
            return;
        }

        // A. Create the CSV Headers
        let csvContent = "NIM,Name,Course,Time,Status,Confidence Score\n";

        // B. Loop through the data and add rows separated by commas
        attendanceData.forEach(record => {
            // We put quotes around strings just in case a name has a comma in it!
            const row = [
                `"${record.student_nim}"`,
                `"${record.student_name}"`,
                `"${record.course_name}"`,
                `"${new Date(record.attendance_time).toLocaleString()}"`,
                `"${record.status}"`,
                record.confidence.toFixed(4) // Round the math to 4 decimal places
            ];
            // Join the array with commas, and add a new line (\n) at the end
            csvContent += row.join(",") + "\n";
        });

        // C. The Blob Trick: Convert the text into a downloadable file
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        
        // D. Create an invisible HTML link, click it, and delete it!
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `attendance_report_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });
});