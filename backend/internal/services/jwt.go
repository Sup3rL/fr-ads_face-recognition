package services

import (
	"os"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// GenerateToken creates a digital ID card (JWT) for a logged-in lecturer
func GenerateToken(lecturerID int, nip string) (string, error) {
	// 1. Get our super secret key from the .env file
	// This secret is used to "sign" the ID card so hackers cannot forge fake ones.
	secret := os.Getenv("JWT_SECRET")

	// 2. Create the "claims"
	// Claims are just the pieces of information written on the ID card.
	claims := jwt.MapClaims{
		"id":  lecturerID,
		"nip": nip,
		// This token will expire 24 hours from right now
		"exp": time.Now().Add(time.Hour * 24).Unix(),
	}

	// 3. Create the token blueprint using a standard encryption algorithm (HS256)
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)

	// 4. "Stamp" the token using our secret key to make it official, and return it.
	return token.SignedString([]byte(secret))
}
