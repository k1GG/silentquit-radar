-- Create employee_attendance table for CSV upload functionality
-- This table stores employee attendance data uploaded by HR

CREATE TABLE IF NOT EXISTS employee_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  attendance_date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'wfh', 'leave')),
  uploaded_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure unique attendance records per employee per date
  UNIQUE(employee_id, attendance_date)
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_attendance_employee_id ON employee_attendance(employee_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON employee_attendance(attendance_date);
CREATE INDEX IF NOT EXISTS idx_attendance_uploaded_by ON employee_attendance(uploaded_by);

-- Add RLS (Row Level Security) policies
ALTER TABLE employee_attendance ENABLE ROW LEVEL SECURITY;

-- HR users can view all attendance data
CREATE POLICY "hr_view_all_attendance" ON employee_attendance
  FOR SELECT USING (auth.jwt() ->> 'role' = 'hr');

-- HR users can insert attendance data
CREATE POLICY "hr_insert_attendance" ON employee_attendance
  FOR INSERT WITH CHECK (auth.jwt() ->> 'role' = 'hr');

-- HR users can update attendance data
CREATE POLICY "hr_update_attendance" ON employee_attendance
  FOR UPDATE USING (auth.jwt() ->> 'role' = 'hr');