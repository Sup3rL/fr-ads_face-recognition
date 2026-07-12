package routes

import (
	"attendance-system/backend/internal/handlers" // Import our new handlers folder!

	"github.com/gin-gonic/gin"
)

func SetupRoutes() *gin.Engine {
	router := gin.Default()
	router.SetTrustedProxies(nil)

	// 1. TELL GIN TO SERVE OUR FRONTEND FILES!
	// This means if a user goes to /app/login.html, Gin will look inside the "frontend" folder.
	router.Static("/app", "./frontend")

	router.Static("/models", "./face-models")

	api := router.Group("/api")
	{
		api.GET("/ping", func(c *gin.Context) {
			c.JSON(200, gin.H{"message": "pong"})
		})
		api.POST("/login", handlers.Login)

		api.POST("/register-face", handlers.RegisterStudent)

		api.POST("/sessions", handlers.StartSession)

		api.POST("/authenticate-face", handlers.AuthenticateFace)

		api.GET("/history", handlers.GetAttendanceHistory)

		// --- COURSE MANAGEMENT ROUTES ---
		api.GET("/courses", handlers.GetCourses)
		api.POST("/courses", handlers.CreateCourse) // <-- NEW

		api.GET("/courses/students", handlers.GetEnrolledStudents) // <-- NEW
		api.GET("/students/search", handlers.SearchStudent)

		api.POST("/courses/enroll", handlers.EnrollStudent)
		api.POST("/courses/unenroll", handlers.RemoveStudent)

		api.GET("/sessions/class", handlers.GetClassSessions) // <-- NEW
		api.POST("/sessions/override", handlers.OverrideAttendance)
		api.GET("/sessions/attendance", handlers.GetSessionAttendance)

		api.DELETE("/sessions", handlers.DeleteSession) // <-- ADD THIS

		api.DELETE("/courses", handlers.DeleteCourse) // <-- ADD THIS

		api.GET("/students", handlers.GetAllStudents)
		api.PUT("/students/:id", handlers.UpdateStudent)
		api.DELETE("/students/:id", handlers.DeleteStudent)

		api.GET("/export-attendance", handlers.ExportAttendanceCSV)
	}

	return router
}
