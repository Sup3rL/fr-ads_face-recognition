package database

import (
	"database/sql"
	"fmt"
	"log"
	"os"

	// We use the blank identifier "_" because we don't call this package directly.
	// We just need it to register itself with the "database/sql" package behind the scenes.
	_ "github.com/lib/pq"
)

// DB is a global variable that will hold our connection pool.
// Notice it starts with a capital letter. In Go, starting a variable with a
// capital letter makes it "public" (exported), so other folders can use it.
var DB *sql.DB

// Connect establishes a connection to PostgreSQL
func Connect() {
	// 1. Read the secret variables from our .env file
	host := os.Getenv("DB_HOST")
	port := os.Getenv("DB_PORT")
	user := os.Getenv("DB_USER")
	password := os.Getenv("DB_PASSWORD")
	dbname := os.Getenv("DB_NAME")

	// 2. Format them into a Data Source Name (DSN) string
	dsn := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
		host, port, user, password, dbname)

	// 3. Open the connection blueprint
	var err error
	DB, err = sql.Open("postgres", dsn)
	if err != nil {
		log.Fatalf("Failed to open database: %v", err)
	}

	// 4. sql.Open doesn't actually connect. It just sets up the configuration.
	// We must Ping() the database to actually verify the connection works.
	err = DB.Ping()
	if err != nil {
		log.Fatalf("Database is not responding: %v", err)
	}

	fmt.Println("✅ Successfully connected to the PostgreSQL database!")
}
