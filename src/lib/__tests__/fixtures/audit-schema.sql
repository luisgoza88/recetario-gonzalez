CREATE TYPE user_role AS ENUM ('admin','familia','empleado');
-- Isolated schema fixture for the September migrations; never a production baseline.
CREATE ROLE anon; CREATE ROLE authenticated;
CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('test.uid', true), '')::uuid $$;
CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$ SELECT coalesce(nullif(current_setting('test.role', true), ''), 'authenticated') $$;
CREATE TABLE auth.users(id uuid PRIMARY KEY);
CREATE TABLE households(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), owner_id uuid, name text NOT NULL, slug text, owner_name text, settings jsonb, dietary_preferences jsonb, cooking_profile jsonb, setup_completed boolean DEFAULT false, updated_at timestamptz);
CREATE TABLE household_memberships(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid, household_id uuid REFERENCES households(id), role text, is_active boolean DEFAULT true, permissions jsonb DEFAULT '{}');
CREATE TABLE recipes(id text PRIMARY KEY DEFAULT gen_random_uuid()::text, household_id uuid, name text);
CREATE TABLE market_items(id text PRIMARY KEY DEFAULT gen_random_uuid()::text, household_id uuid, name text);
CREATE TABLE inventory(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), household_id uuid, item_id text UNIQUE, current_number numeric);
CREATE TABLE market_checklist(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), household_id uuid, item_id text UNIQUE, checked boolean);
CREATE TABLE day_menu(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), household_id uuid, day_number int, breakfast_id text, lunch_id text, dinner_id text);
CREATE TABLE generated_menus(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), household_id uuid, menu_data jsonb);
CREATE TABLE shopping_lists(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), household_id uuid, menu_id uuid);
CREATE TABLE spaces(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), household_id uuid, custom_name text NOT NULL, category text);
CREATE TABLE home_employees(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), household_id uuid, name text NOT NULL, role text, work_days text[]);
CREATE TABLE task_templates(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), household_id uuid);
CREATE TABLE scheduled_tasks(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), household_id uuid, employee_id uuid, space_id uuid, task_template_id uuid, status text, notes text, updated_at timestamptz, completed_at timestamptz, completed_by uuid);

CREATE TABLE household_ai_trust(household_id uuid, successful_actions int DEFAULT 0, failed_actions int DEFAULT 0, incident_count int DEFAULT 0, last_incident_at timestamptz, updated_at timestamptz);

-- Production invitation contract used by the live-schema follow-up migration.
CREATE TABLE household_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), household_id uuid REFERENCES households(id),
  email text NOT NULL DEFAULT '', role varchar(50) DEFAULT 'familia', invited_by uuid,
  token text NOT NULL, code text, expires_at timestamptz NOT NULL,
  accepted_at timestamptz, created_at timestamptz DEFAULT now(), suggested_name text,
  max_uses integer DEFAULT 1, current_uses integer DEFAULT 0, used_at timestamptz
);
CREATE TABLE user_profiles(id uuid PRIMARY KEY, full_name text);

ALTER TABLE household_memberships ADD COLUMN display_name text, ADD COLUMN invited_by uuid;
