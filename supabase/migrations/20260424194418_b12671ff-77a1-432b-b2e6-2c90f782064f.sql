-- 1. Source enum for routine templates
DO $$ BEGIN
  CREATE TYPE public.routine_source AS ENUM ('manual', 'prayer');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Prayer key enum
DO $$ BEGIN
  CREATE TYPE public.prayer_key AS ENUM ('fajr', 'dhuhr', 'asr', 'maghrib', 'isha');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. Add source + prayer_key to routine_templates (idempotent)
ALTER TABLE public.routine_templates
  ADD COLUMN IF NOT EXISTS source public.routine_source NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS prayer_key public.prayer_key;

-- Unique: only one active prayer template per (user, prayer_key)
CREATE UNIQUE INDEX IF NOT EXISTS routine_templates_user_prayer_unique
  ON public.routine_templates (user_id, prayer_key)
  WHERE prayer_key IS NOT NULL AND archived_at IS NULL;

-- 4. Prayer settings table (one row per user)
CREATE TABLE IF NOT EXISTS public.prayer_settings (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL UNIQUE,
  fajr_time    TIME,
  dhuhr_time   TIME,
  asr_time     TIME,
  maghrib_time TIME,
  isha_time    TIME,
  fajr_reminder    BOOLEAN NOT NULL DEFAULT true,
  dhuhr_reminder   BOOLEAN NOT NULL DEFAULT true,
  asr_reminder     BOOLEAN NOT NULL DEFAULT true,
  maghrib_reminder BOOLEAN NOT NULL DEFAULT true,
  isha_reminder    BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.prayer_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ps_select ON public.prayer_settings;
CREATE POLICY ps_select ON public.prayer_settings
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS ps_insert ON public.prayer_settings;
CREATE POLICY ps_insert ON public.prayer_settings
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS ps_update ON public.prayer_settings;
CREATE POLICY ps_update ON public.prayer_settings
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS ps_delete ON public.prayer_settings;
CREATE POLICY ps_delete ON public.prayer_settings
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- updated_at trigger
DROP TRIGGER IF EXISTS prayer_settings_updated_at ON public.prayer_settings;
CREATE TRIGGER prayer_settings_updated_at
  BEFORE UPDATE ON public.prayer_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();