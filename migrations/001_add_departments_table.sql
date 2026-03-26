-- Migration 001: Add departments table
-- This migration adds the missing departments table to the database

-- ============ DEPARTMENTS TABLE ============
CREATE TABLE IF NOT EXISTS departments (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  head_id INT REFERENCES employees(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_departments_name ON departments(name);

-- Insert sample departments
INSERT INTO departments (name, description) VALUES
  ('Emergency', 'Emergency Department'),
  ('Cardiology', 'Heart and Cardiovascular'),
  ('Pediatrics', 'Children Health'),
  ('Orthopedics', 'Bones and Joints'),
  ('General Surgery', 'General Surgery'),
  ('Neurology', 'Brain and Nervous System'),
  ('Oncology', 'Cancer Treatment'),
  ('ICU', 'Intensive Care Unit'),
  ('Pharmacy', 'Pharmacy Services'),
  ('Administration', 'Administrative Services')
ON CONFLICT DO NOTHING;

-- Update employees to use department_id if needed (optional foreign key migration)
-- ALTER TABLE employees ADD COLUMN IF NOT EXISTS department_id INT REFERENCES departments(id) ON DELETE SET NULL;
