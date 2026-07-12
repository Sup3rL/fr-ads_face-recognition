-- Add Name and Details columns to the sessions table
ALTER TABLE attendance_sessions ADD COLUMN session_name VARCHAR(100) DEFAULT 'Unnamed Session';
ALTER TABLE attendance_sessions ADD COLUMN details TEXT DEFAULT '';