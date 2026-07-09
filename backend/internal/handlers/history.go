package handlers

import (
	"net/http"

	"attendance-system/backend/internal/database"

	"github.com/gin-gonic/gin"
)

// AttendanceRecord represents a single row in our history table
type AttendanceRecord struct {
	ID             int     `json:"id"`
	StudentName    string  `json:"student_name"`
	StudentNIM     string  `json:"student_nim"`
	CourseName     string  `json:"course_name"`
	AttendanceTime string  `json:"attendance_time"`
	Status         string  `json:"status"`
	Confidence     float64 `json:"confidence"`
}

// GetAttendanceHistory handles GET /api/history
func GetAttendanceHistory(c *gin.Context) {
	// We use an INNER JOIN to combine data from the attendances, students, and courses tables!
	query := `
		SELECT 
			a.id, 
			s.name as student_name, 
			s.nim as student_nim, 
			c.course_name, 
			a.attendance_time, 
			a.status, 
			a.confidence
		FROM attendances a
		JOIN students s ON a.student_id = s.id
		JOIN attendance_sessions asess ON a.session_id = asess.id
		JOIN courses c ON asess.course_id = c.id
		ORDER BY a.attendance_time DESC;
	`

	rows, err := database.DB.Query(query)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch history"})
		return
	}
	defer rows.Close()

	var history []AttendanceRecord

	for rows.Next() {
		var record AttendanceRecord
		if err := rows.Scan(
			&record.ID,
			&record.StudentName,
			&record.StudentNIM,
			&record.CourseName,
			&record.AttendanceTime,
			&record.Status,
			&record.Confidence,
		); err != nil {
			continue
		}
		history = append(history, record)
	}

	// If history is empty, return an empty array instead of null
	if history == nil {
		history = []AttendanceRecord{}
	}

	c.JSON(http.StatusOK, history)
}
