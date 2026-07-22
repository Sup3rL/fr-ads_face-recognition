package handlers

import (
	"database/sql"
	"encoding/csv"
	"encoding/json"
	"net/http"

	"attendance-system/backend/internal/database"
	"attendance-system/backend/internal/services"

	"github.com/gin-gonic/gin"
)

type AuthenticateRequest struct {
	SessionID      int       `json:"session_id" binding:"required"`
	CourseID       int       `json:"course_id" binding:"required"` // ADD THIS
	FaceDescriptor []float32 `json:"descriptor" binding:"required"`
}

func AuthenticateFace(c *gin.Context) {
	var req AuthenticateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}
	query := `
		SELECT s.id, s.nim, s.name, s.face_descriptor 
		FROM students s
		JOIN course_students cs ON s.id = cs.student_id
		WHERE cs.course_id = $1`

	rows, err := database.DB.Query(query, req.CourseID)

	// 1. Fetch ALL registered students from the database
	// *Senior Note: In a massive system with millions of users, we would use a specialized "Vector Database"
	// like pgvector. But for a single university, loading students into memory is incredibly fast and perfectly fine.*
	//rows, err := database.DB.Query(`SELECT id, nim, name, face_descriptor FROM students`)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}
	defer rows.Close()

	var bestMatchName, bestMatchNIM string
	var bestMatchID int
	// We set the initial "lowest distance" to our threshold of 0.45.
	// If no face scores lower than this, it remains a stranger.
	lowestDistance := 0.30
	foundMatch := false

	// 2. Loop through every student to find the closest match
	for rows.Next() {
		var id int
		var nim, name string
		var descriptorJSON []byte

		if err := rows.Scan(&id, &nim, &name, &descriptorJSON); err != nil {
			continue // Skip this row if there is an error
		}

		// Convert the database JSONB string back into a []float32 array
		var dbDescriptor []float32
		json.Unmarshal(descriptorJSON, &dbDescriptor)

		// CALCULATE THE MATH!
		distance := services.EuclideanDistance(req.FaceDescriptor, dbDescriptor)

		// If this is the closest face we've seen so far, remember it!
		if distance < lowestDistance {
			lowestDistance = distance
			bestMatchID = id
			bestMatchName = name
			bestMatchNIM = nim
			foundMatch = true
		}
	}

	// 3. If no one scored below 0.45, it is an unknown face.
	if !foundMatch {
		c.JSON(http.StatusOK, gin.H{
			"status": "UNKNOWN",
		})
		return
	}

	// 4. A Match was found! Now, check if they already took attendance today to prevent duplicates.
	var existingID int
	checkQuery := `SELECT id FROM attendances WHERE session_id = $1 AND student_id = $2`
	err = database.DB.QueryRow(checkQuery, req.SessionID, bestMatchID).Scan(&existingID)

	if err == nil {
		// No error means it found an existing row!
		c.JSON(http.StatusOK, gin.H{
			"status": "Already Recorded",
			"name":   bestMatchName,
		})
		return
	} else if err != sql.ErrNoRows {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error checking duplicates"})
		return
	}

	// 5. Save the successful attendance to the database!
	insertQuery := `INSERT INTO attendances (session_id, student_id, confidence, status) VALUES ($1, $2, $3, 'PRESENT')`
	// Note: We save the 'distance' as our confidence score. Lower is better.
	_, err = database.DB.Exec(insertQuery, req.SessionID, bestMatchID, lowestDistance)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save attendance"})
		return
	}

	// 6. Return the success message to the frontend camera!
	c.JSON(http.StatusOK, gin.H{
		"status":     "PRESENT",
		"name":       bestMatchName,
		"nim":        bestMatchNIM,
		"confidence": lowestDistance,
	})
}

func ExportAttendanceCSV(c *gin.Context) {
	courseID := c.Query("course_id")

	// 1. Get sessions
	rows, err := database.DB.Query("SELECT id, session_name FROM attendance_sessions WHERE course_id = $1 ORDER BY id ASC", courseID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Query sessions failed: " + err.Error()})
		return
	}
	defer rows.Close()

	type Session struct {
		id   int
		name string
	}
	var sessions []Session
	for rows.Next() {
		var s Session
		rows.Scan(&s.id, &s.name)
		sessions = append(sessions, s)
	}

	// 2. Fetch attendance, joining with students to get NIM and Name
	// We now select s.nim AND s.name
	data := make(map[string]map[int]string)
	studentNimMap := make(map[string]string) // Store NIM linked to Name

	rows, err = database.DB.Query(`
        SELECT s.nim, s.name, a.session_id, 'Present' 
        FROM attendances a
        JOIN students s ON a.student_id = s.id
        WHERE a.session_id IN (SELECT id FROM attendance_sessions WHERE course_id = $1)`, courseID)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Query attendance failed: " + err.Error()})
		return
	}
	defer rows.Close()

	for rows.Next() {
		var nim, name, status string
		var sessionID int
		rows.Scan(&nim, &name, &sessionID, &status)
		if _, ok := data[name]; !ok {
			data[name] = make(map[int]string)
		}
		data[name][sessionID] = status
		studentNimMap[name] = nim // Save NIM for this student
	}

	// 3. Write CSV
	c.Header("Content-Type", "text/csv")
	c.Header("Content-Disposition", "attachment;filename=attendance.csv")

	writer := csv.NewWriter(c.Writer)

	// Updated header: NIM first, then Name
	header := []string{"NIM", "Student Name"}
	for _, s := range sessions {
		header = append(header, s.name)
	}
	writer.Write(header)

	// Data rows
	for name, nim := range studentNimMap {
		row := []string{nim, name} // Add NIM and Name
		for _, s := range sessions {
			val := data[name][s.id]
			if val == "" {
				val = "Absent"
			}
			row = append(row, val)
		}
		writer.Write(row)
	}
	writer.Flush()
}
