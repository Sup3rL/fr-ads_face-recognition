package handlers

import (
	"database/sql"
	"net/http"

	"attendance-system/backend/internal/database"

	"github.com/gin-gonic/gin"
)

// --- 1. FETCH COURSES ---
type CourseResponse struct {
	ID         int    `json:"id"`
	CourseCode string `json:"course_code"`
	CourseName string `json:"course_name"`
}

func GetCourses(c *gin.Context) {
	// We will pass the lecturer_id in the URL (e.g., /api/courses?lecturer_id=1)
	lecturerID := c.Query("lecturer_id")
	if lecturerID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "lecturer_id is required"})
		return
	}

	query := `SELECT id, course_code, course_name FROM courses WHERE lecturer_id = $1`
	rows, err := database.DB.Query(query, lecturerID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}
	defer rows.Close()

	var courses []CourseResponse
	for rows.Next() {
		var course CourseResponse
		if err := rows.Scan(&course.ID, &course.CourseCode, &course.CourseName); err == nil {
			courses = append(courses, course)
		}
	}

	if courses == nil {
		courses = []CourseResponse{} // Return empty array instead of null
	}
	c.JSON(http.StatusOK, courses)
}

// --- 2. SEARCH STUDENT ---
func SearchStudent(c *gin.Context) {
	nim := c.Query("nim")
	if nim == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "NIM is required"})
		return
	}

	var student struct {
		ID   int    `json:"id"`
		NIM  string `json:"nim"`
		Name string `json:"name"`
	}

	query := `SELECT id, nim, name FROM students WHERE nim = $1`
	err := database.DB.QueryRow(query, nim).Scan(&student.ID, &student.NIM, &student.Name)
	if err != nil {
		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, gin.H{"error": "Student not found in global registry"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	c.JSON(http.StatusOK, student)
}

// --- 3. ENROLL STUDENT ---
type EnrollRequest struct {
	CourseID  int `json:"course_id" binding:"required"`
	StudentID int `json:"student_id" binding:"required"`
}

func EnrollStudent(c *gin.Context) {
	var req EnrollRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	// Insert into our new Junction Table!
	query := `INSERT INTO course_students (course_id, student_id) VALUES ($1, $2)`
	_, err := database.DB.Exec(query, req.CourseID, req.StudentID)
	if err != nil {
		// If the database throws an error, it's likely because of our PRIMARY KEY rule
		// preventing the same student from being added to the same class twice.
		c.JSON(http.StatusConflict, gin.H{"error": "Student is already enrolled in this course!"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Student successfully enrolled!"})
}

// --- 4. CREATE A NEW CLASS ---
type CreateCourseRequest struct {
	CourseCode string `json:"course_code" binding:"required"`
	CourseName string `json:"course_name" binding:"required"`
	LecturerID int    `json:"lecturer_id" binding:"required"`
}

func CreateCourse(c *gin.Context) {
	var req CreateCourseRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Please provide class code and name"})
		return
	}

	var newID int
	// We insert the new class and RETURN the new ID so the frontend can use it immediately
	query := `INSERT INTO courses (course_code, course_name, lecturer_id) VALUES ($1, $2, $3) RETURNING id`
	err := database.DB.QueryRow(query, req.CourseCode, req.CourseName, req.LecturerID).Scan(&newID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create class. Class code might already exist."})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Class created successfully!", "id": newID})
}

// --- 5. GET ENROLLED STUDENTS ---
type EnrolledStudent struct {
	ID   int    `json:"id"`
	NIM  string `json:"nim"`
	Name string `json:"name"`
}

func GetEnrolledStudents(c *gin.Context) {
	courseID := c.Query("course_id")
	if courseID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "course_id is required"})
		return
	}

	// We use an INNER JOIN to pull only the students linked to this specific course
	query := `
		SELECT s.id, s.nim, s.name 
		FROM students s
		JOIN course_students cs ON s.id = cs.student_id
		WHERE cs.course_id = $1
		ORDER BY s.name ASC
	`
	rows, err := database.DB.Query(query, courseID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}
	defer rows.Close()

	var students []EnrolledStudent
	for rows.Next() {
		var s EnrolledStudent
		if err := rows.Scan(&s.ID, &s.NIM, &s.Name); err == nil {
			students = append(students, s)
		}
	}

	if students == nil {
		students = []EnrolledStudent{} // Return empty array instead of null
	}
	c.JSON(http.StatusOK, students)
}

// --- 6. REMOVE STUDENT FROM CLASS ---
type RemoveStudentRequest struct {
	CourseID  int `json:"course_id" binding:"required"`
	StudentID int `json:"student_id" binding:"required"`
}

func RemoveStudent(c *gin.Context) {
	var req RemoveStudentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	query := `DELETE FROM course_students WHERE course_id = $1 AND student_id = $2`
	_, err := database.DB.Exec(query, req.CourseID, req.StudentID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to remove student from class"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Student successfully removed from class."})
}

// --- DELETE A CLASS ---
func DeleteCourse(c *gin.Context) {
	// Check both query parameters and path parameters
	courseID := c.Query("course_id")

	if courseID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "course_id is required"})
		return
	}

	// Execute the deletion
	result, err := database.DB.Exec("DELETE FROM courses WHERE id = $1", courseID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error: " + err.Error()})
		return
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Class not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Class deleted successfully"})
}
