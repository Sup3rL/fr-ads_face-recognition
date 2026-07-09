package services

import (
	"math"
)

// EuclideanDistance calculates the distance between two 128-dimensional face descriptors.
// The closer the number is to 0, the more identical the faces are.
func EuclideanDistance(descriptor1, descriptor2 []float32) float64 {
	// A face descriptor must always have exactly 128 numbers.
	if len(descriptor1) != 128 || len(descriptor2) != 128 {
		return 999.9 // Return a huge distance if the data is broken, so it never matches.
	}

	var sum float64 = 0.0

	// Loop through all 128 numbers
	for i := 0; i < 128; i++ {
		// 1. Find the difference between the two numbers
		diff := float64(descriptor1[i] - descriptor2[i])
		// 2. Multiply the difference by itself (Square it) and add to the total
		sum += diff * diff
	}

	// 3. Take the square root of the total sum
	return math.Sqrt(sum)
}
