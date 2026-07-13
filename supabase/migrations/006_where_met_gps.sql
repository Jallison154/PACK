-- Approximate where-met GPS fields (no fake Place records from GPS captures)
ALTER TABLE people ADD COLUMN IF NOT EXISTS where_met_latitude DOUBLE PRECISION;
ALTER TABLE people ADD COLUMN IF NOT EXISTS where_met_longitude DOUBLE PRECISION;
ALTER TABLE people ADD COLUMN IF NOT EXISTS where_met_location_source TEXT;
ALTER TABLE people ADD COLUMN IF NOT EXISTS where_met_location_accuracy DOUBLE PRECISION;
ALTER TABLE people ADD COLUMN IF NOT EXISTS where_met_captured_at TIMESTAMPTZ;
ALTER TABLE people ADD COLUMN IF NOT EXISTS where_met_is_approximate BOOLEAN DEFAULT FALSE;
ALTER TABLE people ADD COLUMN IF NOT EXISTS where_met_area_label TEXT;
