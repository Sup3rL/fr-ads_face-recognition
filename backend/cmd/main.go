package main

import (
	"fmt"
	"log"
	"os"

	// Import our local packages
	"attendance-system/backend/internal/database"
	"attendance-system/backend/internal/routes"

	"github.com/joho/godotenv"
)

func main() {
	fmt.Println("🚀 Starting University Attendance System...")

	// 1. Load the .env file
	err := godotenv.Load()
	if err != nil {
		log.Fatal("Error loading .env file")
	}

	// 2. Connect to the Database
	database.Connect()

	// 3. Setup our Web Router
	router := routes.SetupRoutes()

	// 4. Get the PORT from our .env file (it should be 8080)
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080" // Fallback just in case
	}

	// 5. Start the server!
	fmt.Printf("🌐 Server is running on http://localhost:%s\n", port)

	// router.Run essentially traps the program here, constantly listening for web traffic
	err = router.Run(":" + port)
	if err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
