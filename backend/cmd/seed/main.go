package main

import (
	"fmt"
	"log"

	"attendance-system/backend/internal/database"

	"github.com/joho/godotenv"
	"golang.org/x/crypto/bcrypt"
)

func main() {
	// 1. Connect to DB
	godotenv.Load()
	database.Connect()

	// 2. Information for our test admin
	nip := "123"
	name := "Lecturer"
	plainPassword := "123" // The password they will type

	// 3. Hash the password securely
	hashedBytes, err := bcrypt.GenerateFromPassword([]byte(plainPassword), bcrypt.DefaultCost)
	if err != nil {
		log.Fatal(err)
	}
	hashedPassword := string(hashedBytes)

	// 4. Insert into database
	query := `INSERT INTO lecturers (nip, name, password_hash) VALUES ($1, $2, $3)`
	_, err = database.DB.Exec(query, nip, name, hashedPassword)
	if err != nil {
		log.Fatalf("Failed to insert admin: %v\n(Maybe you already ran this script?)", err)
	}

	fmt.Println("✅ Successfully created test admin!")
	fmt.Printf("NIP: %s\nPassword: %s\n", nip, plainPassword)
}
