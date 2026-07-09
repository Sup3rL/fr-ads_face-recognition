package models

// Lecturer represents the admin user in our system.
type Lecturer struct {
	ID           int    `json:"id"`
	NIP          string `json:"nip"`
	Name         string `json:"name"`
	PasswordHash string `json:"-"`
}
