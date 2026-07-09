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

	api := router.Group("/api")
	{
		api.GET("/ping", func(c *gin.Context) {
			c.JSON(200, gin.H{"message": "pong"})
		})
		api.POST("/login", handlers.Login)
	}

	return router
}
