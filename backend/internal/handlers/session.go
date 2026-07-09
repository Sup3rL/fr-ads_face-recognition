package handlers

import (
	"net/http"

	"attendance-system/backend/internal/database"

	"github.com/gin-gonic/gin"
)

// StartSessionRequest defines the JSON we expect from the frontend
type StartSessionRequest struct {
	CourseID   int `json:"course_id" binding:"required"`
	LecturerID int `json:"lecturer_id" binding:"required"`
}

// StartSession handles POST /api/sessions
func StartSession(c *gin.Context) {
	var req StartSessionRequest

	// 1. Read the incoming JSON
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request data"})
		return
	}

	// 2. Insert a new session into the database
	var sessionID int
	query := `
		INSERT INTO attendance_sessions (course_id, lecturer_id, status) 
		VALUES ($1, $2, 'OPEN') 
		RETURNING id;
	`

	// We use QueryRow because we want PostgreSQL to RETURN the generated ID to us
	err := database.DB.QueryRow(query, req.CourseID, req.LecturerID).Scan(&sessionID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create session"})
		return
	}

	// 3. Return the new Session ID to the frontend!
	c.JSON(http.StatusOK, gin.H{
		"message":    "Session started successfully",
		"session_id": sessionID,
	})
}
