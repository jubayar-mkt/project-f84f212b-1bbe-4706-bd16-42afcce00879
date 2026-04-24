-- Add end_time so routines become time-block based
ALTER TABLE public.routines
  ADD COLUMN IF NOT EXISTS end_time time without time zone;

-- Helpful index for daily timeline queries (per user, per day, sorted by start time)
CREATE INDEX IF NOT EXISTS idx_routines_user_date_time
  ON public.routines (user_id, scheduled_date, scheduled_time);