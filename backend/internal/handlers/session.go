package handlers

import (
	"net/http"

	"attendance-system/backend/internal/database"

	"github.com/gin-gonic/gin"
)

// StartSessionRequest defines the JSON we expect from the frontend
type StartSessionRequest struct {
	CourseID    int    `json:"course_id" binding:"required"`
	LecturerID  int    `json:"lecturer_id" binding:"required"`
	SessionName string `json:"session_name"` // NEW
	Details     string `json:"details"`
}

// StartSession handles POST /api/sessions
func StartSession(c *gin.Context) {
	var req StartSessionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request data"})
		return
	}

	if req.SessionName == "" {
		req.SessionName = "Unnamed Session"
	}

	var sessionID int
	// THE CORRECT QUERY THAT INCLUDES THE NEW COLUMNS:
	query := `
		INSERT INTO attendance_sessions (course_id, lecturer_id, status, session_name, details) 
		VALUES ($1, $2, 'OPEN', $3, $4) 
		RETURNING id;
	`

	err := database.DB.QueryRow(query, req.CourseID, req.LecturerID, req.SessionName, req.Details).Scan(&sessionID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create session"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":    "Session started successfully",
		"session_id": sessionID,
	})
}

// --- GET SESSIONS FOR A COURSE ---
type SessionResponse struct {
	ID          int    `json:"id"`
	SessionName string `json:"session_name"` // NEW
	Details     string `json:"details"`      // NEW
	OpenedAt    string `json:"opened_at"`
	Status      string `json:"status"`
}

func GetClassSessions(c *gin.Context) {
	courseID := c.Query("course_id")
	if courseID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "course_id is required"})
		return
	}

	// Fetch the new columns from the database
	query := `SELECT id, session_name, details, opened_at, status FROM attendance_sessions WHERE course_id = $1 ORDER BY opened_at DESC`
	rows, err := database.DB.Query(query, courseID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}
	defer rows.Close()

	var sessions []SessionResponse
	for rows.Next() {
		var s SessionResponse
		if err := rows.Scan(&s.ID, &s.SessionName, &s.Details, &s.OpenedAt, &s.Status); err == nil {
			sessions = append(sessions, s)
		}
	}

	if sessions == nil {
		sessions = []SessionResponse{}
	}
	c.JSON(http.StatusOK, sessions)
}

// --- OVERRIDE / MANUAL ATTENDANCE ---
type OverrideRequest struct {
	SessionID int    `json:"session_id" binding:"required"`
	StudentID int    `json:"student_id" binding:"required"`
	Status    string `json:"status" binding:"required"` // e.g., "PRESENT", "ABSENT", "IZIN"
}

func OverrideAttendance(c *gin.Context) {
	var req OverrideRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	// 1. Check if an attendance record already exists for this student in this session
	var existingID int
	checkQuery := `SELECT id FROM attendances WHERE session_id = $1 AND student_id = $2`
	err := database.DB.QueryRow(checkQuery, req.SessionID, req.StudentID).Scan(&existingID)

	if err == nil {
		// 2. If it exists, UPDATE the status
		updateQuery := `UPDATE attendances SET status = $1 WHERE id = $2`
		_, err = database.DB.Exec(updateQuery, req.Status, existingID)
	} else {
		// 3. If it doesn't exist (student never showed up), INSERT a new record manually
		// We set confidence to 100.0 since it was done manually by the teacher
		insertQuery := `INSERT INTO attendances (session_id, student_id, confidence, status) VALUES ($1, $2, 100.0, $3)`
		_, err = database.DB.Exec(insertQuery, req.SessionID, req.StudentID, req.Status)
	}

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update attendance"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Attendance successfully updated!"})
}

// --- GET ATTENDANCE FOR A SPECIFIC SESSION ---
type SessionAttendanceRecord struct {
	StudentID int    `json:"student_id"`
	Status    string `json:"status"`
}

func GetSessionAttendance(c *gin.Context) {
	sessionID := c.Query("session_id")
	if sessionID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "session_id is required"})
		return
	}

	query := `SELECT student_id, status FROM attendances WHERE session_id = $1`
	rows, err := database.DB.Query(query, sessionID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}
	defer rows.Close()

	var records []SessionAttendanceRecord
	for rows.Next() {
		var r SessionAttendanceRecord
		if err := rows.Scan(&r.StudentID, &r.Status); err == nil {
			records = append(records, r)
		}
	}

	if records == nil {
		records = []SessionAttendanceRecord{}
	}
	c.JSON(http.StatusOK, records)
}

// --- DELETE A SESSION ---
func DeleteSession(c *gin.Context) {
	sessionID := c.Query("session_id")
	if sessionID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "session_id is required"})
		return
	}

	// 1. Delete associated attendance records first (due to foreign key constraints)
	_, err := database.DB.Exec("DELETE FROM attendances WHERE session_id = $1", sessionID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete attendance records"})
		return
	}

	// 2. Delete the session
	_, err = database.DB.Exec("DELETE FROM attendance_sessions WHERE id = $1", sessionID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete session"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Session deleted successfully"})
}
