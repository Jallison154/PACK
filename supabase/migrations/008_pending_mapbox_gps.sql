-- Pack pending cloud columns (008)
-- Idempotent. Run in Supabase SQL Editor if sync upserts return HTTP 400 / PGRST204
-- for mapbox_* or where_met_* fields.

-- From 006_where_met_gps.sql
ALTER TABLE people ADD COLUMN IF NOT EXISTS where_met_latitude DOUBLE PRECISION;
ALTER TABLE people ADD COLUMN IF NOT EXISTS where_met_longitude DOUBLE PRECISION;
ALTER TABLE people ADD COLUMN IF NOT EXISTS where_met_location_source TEXT;
ALTER TABLE people ADD COLUMN IF NOT EXISTS where_met_location_accuracy DOUBLE PRECISION;
ALTER TABLE people ADD COLUMN IF NOT EXISTS where_met_captured_at TIMESTAMPTZ;
ALTER TABLE people ADD COLUMN IF NOT EXISTS where_met_is_approximate BOOLEAN DEFAULT FALSE;
ALTER TABLE people ADD COLUMN IF NOT EXISTS where_met_area_label TEXT;

-- From 007_mapbox_places.sql
ALTER TABLE places ADD COLUMN IF NOT EXISTS mapbox_id TEXT;
ALTER TABLE places ADD COLUMN IF NOT EXISTS postal_code TEXT;
ALTER TABLE places ADD COLUMN IF NOT EXISTS country TEXT;
ALTER TABLE places ADD COLUMN IF NOT EXISTS poi_categories TEXT;
ALTER TABLE places ADD COLUMN IF NOT EXISTS brand TEXT;
ALTER TABLE places ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';
ALTER TABLE places ADD COLUMN IF NOT EXISTS feature_type TEXT;

CREATE INDEX IF NOT EXISTS idx_places_mapbox_id ON places(mapbox_id);
