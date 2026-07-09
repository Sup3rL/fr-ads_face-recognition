-- 1. Table for Lecturers (Admins)
CREATE TABLE lecturers (
    id SERIAL PRIMARY KEY,
    nip VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Table for Students
CREATE TABLE students (
    id SERIAL PRIMARY KEY,
    nim VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    program VARCHAR(100) NOT NULL,
    face_descriptor JSONB NOT NULL,
    photo_path VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Table for Courses
CREATE TABLE courses (
    id SERIAL PRIMARY KEY,
    course_code VARCHAR(20) UNIQUE NOT NULL,
    course_name VARCHAR(100) NOT NULL
);

-- 4. Table for Attendance Sessions
CREATE TABLE attendance_sessions (
    id SERIAL PRIMARY KEY,
    course_id INTEGER REFERENCES courses(id),
    lecturer_id INTEGER REFERENCES lecturers(id),
    opened_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    closed_at TIMESTAMP,
    status VARCHAR(20) DEFAULT 'OPEN'
);

-- 5. Table for Individual Attendance Records
CREATE TABLE attendances (
    id SERIAL PRIMARY KEY,
    session_id INTEGER REFERENCES attendance_sessions(id),
    student_id INTEGER REFERENCES students(id),
    attendance_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    confidence FLOAT NOT NULL,
    status VARCHAR(20) NOT NULL
);