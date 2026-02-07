-- Create engagement_interventions table
-- This table tracks interventions to measure effectiveness
-- Part of the Intervention Tracking feature

CREATE TABLE IF NOT EXISTS engagement_interventions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  intervention_type TEXT NOT NULL,
  intervention_date DATE NOT NULL,
  owner TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_interventions_employee_id ON engagement_interventions(employee_id);
CREATE INDEX IF NOT EXISTS idx_interventions_date ON engagement_interventions(intervention_date);

-- Add RLS (Row Level Security) policies if needed
-- ALTER TABLE engagement_interventions ENABLE ROW LEVEL SECURITY;
