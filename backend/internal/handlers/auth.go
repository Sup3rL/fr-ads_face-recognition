package handlers

import (
	"database/sql"
	"net/http"

	"attendance-system/backend/internal/database"
	"attendance-system/backend/internal/models"
	"attendance-system/backend/internal/services"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
)

// LoginRequest defines what we expect the frontend to send us
type LoginRequest struct {
	NIP      string `json:"nip" binding:"required"`
	Password string `json:"password" binding:"required"`
}

// Login is the function that handles POST /api/login
func Login(c *gin.Context) {
	var req LoginRequest

	// 1. Read the JSON from the frontend and put it into our 'req' struct
	// ShouldBindJSON also checks the 'binding:"required"' rules we set above!
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "NIP and Password are required"})
		return
	}

	// 2. Search the database for the lecturer
	var lecturer models.Lecturer
	// $1 is a placeholder to prevent "SQL Injection" (hackers putting code in the login box)
	query := `SELECT id, nip, name, password_hash FROM lecturers WHERE nip = $1`

	// QueryRow executes the query and Scan copies the result into our variables
	err := database.DB.QueryRow(query, req.NIP).Scan(&lecturer.ID, &lecturer.NIP, &lecturer.Name, &lecturer.PasswordHash)
	if err != nil {
		if err == sql.ErrNoRows { // This specific error means "User not found"
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid NIP or Password"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	// 3. Compare the typed password with the encrypted database hash
	err = bcrypt.CompareHashAndPassword([]byte(lecturer.PasswordHash), []byte(req.Password))
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid NIP or Password"})
		return
	}

	// 4. If password matches, generate the JWT token!
	token, err := services.GenerateToken(lecturer.ID, lecturer.NIP)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	// 5. Send the success message and token back to the frontend
	c.JSON(http.StatusOK, gin.H{
		"message": "Login successful",
		"token":   token,
		"name":    lecturer.Name,
	})
}
