package handlers

import (
	"encoding/base64"
	"encoding/json"
	"net/http"
	"os"
	"strings"

	"attendance-system/backend/internal/database"

	"github.com/gin-gonic/gin"
)

// RegisterRequest defines what we expect the frontend to send us
type RegisterRequest struct {
	NIM            string    `json:"nim" binding:"required"`
	Name           string    `json:"name" binding:"required"`
	Program        string    `json:"program" binding:"required"`
	FaceDescriptor []float32 `json:"face_descriptor" binding:"required"`
	PhotoBase64    string    `json:"photo_base64" binding:"required"`
}

// RegisterStudent handles the POST /api/register-face route
func RegisterStudent(c *gin.Context) {
	var req RegisterRequest

	// 1. Read the JSON from the frontend
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Please fill all fields and capture a face."})
		return
	}

	// 2. Convert the Base64 string back into a real image file
	// The frontend sends something like "data:image/jpeg;base64,/9j/4AAQSkZJR..."
	// We need to split it at the comma and only keep the actual data part.
	parts := strings.Split(req.PhotoBase64, ",")
	if len(parts) != 2 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid photo format"})
		return
	}

	// Decode the text back into raw image bytes
	imgData, err := base64.StdEncoding.DecodeString(parts[1])
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to decode image"})
		return
	}

	// 3. Save the image to our storage folder, naming it after the student's NIM
	photoPath := "storage/faces/" + req.NIM + ".jpg"
	err = os.WriteFile(photoPath, imgData, 0644)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save photo file"})
		return
	}

	// 4. Convert the 128-number float array into a JSON string so PostgreSQL can store it in the JSONB column
	descriptorJSON, err := json.Marshal(req.FaceDescriptor)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to process face data"})
		return
	}

	// 5. Insert the student into the database
	query := `INSERT INTO students (nim, name, program, face_descriptor, photo_path) VALUES ($1, $2, $3, $4, $5)`
	_, err = database.DB.Exec(query, req.NIM, req.Name, req.Program, descriptorJSON, photoPath)
	if err != nil {
		// If the NIM already exists, PostgreSQL will throw a unique constraint error
		if strings.Contains(err.Error(), "unique constraint") {
			c.JSON(http.StatusConflict, gin.H{"error": "A student with this NIM is already registered!"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error while saving student"})
		return
	}

	// 6. Success!
	c.JSON(http.StatusOK, gin.H{
		"message": "Student successfully registered!",
	})
}
