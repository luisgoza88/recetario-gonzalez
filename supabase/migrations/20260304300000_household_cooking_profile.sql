-- Add cooking_profile column to households table
-- Allows each household to configure their AI prompt context (city, region, cooking style, etc.)

ALTER TABLE households ADD COLUMN IF NOT EXISTS cooking_profile JSONB DEFAULT '{
  "city": "Medellín",
  "region": "Andina",
  "country": "Colombia",
  "cooking_style": "colombiana casera con variaciones internacionales",
  "family_name": null,
  "family_size": 2,
  "portions_config": null
}'::jsonb;

COMMENT ON COLUMN households.cooking_profile IS 'Perfil de cocina del hogar: ciudad, región, estilo, miembros';
