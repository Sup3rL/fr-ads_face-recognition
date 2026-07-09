package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"

	"attendance-system/backend/internal/database"
	"attendance-system/backend/internal/services"

	"github.com/gin-gonic/gin"
)

type AuthenticateRequest struct {
	SessionID      int       `json:"session_id" binding:"required"`
	FaceDescriptor []float32 `json:"descriptor" binding:"required"`
}

func AuthenticateFace(c *gin.Context) {
	var req AuthenticateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	// 1. Fetch ALL registered students from the database
	// *Senior Note: In a massive system with millions of users, we would use a specialized "Vector Database"
	// like pgvector. But for a single university, loading students into memory is incredibly fast and perfectly fine.*
	rows, err := database.DB.Query(`SELECT id, nim, name, face_descriptor FROM students`)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}
	defer rows.Close()

	var bestMatchName, bestMatchNIM string
	var bestMatchID int
	// We set the initial "lowest distance" to our threshold of 0.45.
	// If no face scores lower than this, it remains a stranger.
	lowestDistance := 0.45
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
