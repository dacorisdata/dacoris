-- Add missing columns to grant_opportunities table
ALTER TABLE grant_opportunities ADD COLUMN IF NOT EXISTS eligibility TEXT;
ALTER TABLE grant_opportunities ADD COLUMN IF NOT EXISTS criteria TEXT;
ALTER TABLE grant_opportunities ADD COLUMN IF NOT EXISTS application_url VARCHAR(500);
ALTER TABLE grant_opportunities ADD COLUMN IF NOT EXISTS contact_email VARCHAR(200);

-- Change amount columns from integer to float (if they exist as integer)
ALTER TABLE grant_opportunities ALTER COLUMN amount_min TYPE DOUBLE PRECISION;
ALTER TABLE grant_opportunities ALTER COLUMN amount_max TYPE DOUBLE PRECISION;

-- Change deadline from timestamp to date
ALTER TABLE grant_opportunities ALTER COLUMN deadline TYPE DATE;

-- Make institution_id nullable
ALTER TABLE grant_opportunities ALTER COLUMN institution_id DROP NOT NULL;

-- Make created_by_id not nullable (update any NULL values first)
UPDATE grant_opportunities SET created_by_id = 1 WHERE created_by_id IS NULL;
ALTER TABLE grant_opportunities ALTER COLUMN created_by_id SET NOT NULL;
