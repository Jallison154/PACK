-- Mapbox metadata for saved Pack places (dedup + sync)
ALTER TABLE places ADD COLUMN IF NOT EXISTS mapbox_id TEXT;
ALTER TABLE places ADD COLUMN IF NOT EXISTS postal_code TEXT;
ALTER TABLE places ADD COLUMN IF NOT EXISTS country TEXT;
ALTER TABLE places ADD COLUMN IF NOT EXISTS poi_categories TEXT;
ALTER TABLE places ADD COLUMN IF NOT EXISTS brand TEXT;
ALTER TABLE places ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';
ALTER TABLE places ADD COLUMN IF NOT EXISTS feature_type TEXT;

CREATE INDEX IF NOT EXISTS idx_places_mapbox_id ON places(mapbox_id);
