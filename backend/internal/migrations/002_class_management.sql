-- 1. Give ownership of courses to specific lecturers
-- This allows a lecturer to only manage their own classes.
ALTER TABLE courses ADD COLUMN lecturer_id INTEGER REFERENCES lecturers(id);

-- 2. Create the Junction Table to link students to courses
CREATE TABLE course_students (
    course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
    student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
    PRIMARY KEY (course_id, student_id)
);

-- 3. (Optional but good) Update the existing fake course to belong to our Admin
UPDATE courses SET lecturer_id = (SELECT id FROM lecturers WHERE nip = 'admin123') WHERE course_code = 'ADS4B';