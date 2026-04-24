CREATE TYPE public.routine_priority AS ENUM ('low', 'medium', 'high');

CREATE TABLE public.routines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  scheduled_time TIME,
  priority routine_priority NOT NULL DEFAULT 'medium',
  category TEXT,
  scheduled_date DATE NOT NULL DEFAULT CURRENT_DATE,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.routines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "r_select" ON public.routines FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "r_insert" ON public.routines FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "r_update" ON public.routines FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "r_delete" ON public.routines FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER routines_updated_at BEFORE UPDATE ON public.routines FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE INDEX idx_routines_user_date ON public.routines(user_id, scheduled_date);

CREATE TABLE public.habits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  color TEXT NOT NULL DEFAULT 'accent',
  icon TEXT NOT NULL DEFAULT 'sparkles',
  target_per_day INT NOT NULL DEFAULT 1,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.habits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "h_select" ON public.habits FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "h_insert" ON public.habits FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "h_update" ON public.habits FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "h_delete" ON public.habits FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER habits_updated_at BEFORE UPDATE ON public.habits FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE INDEX idx_habits_user ON public.habits(user_id);

CREATE TABLE public.habit_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  habit_id UUID NOT NULL REFERENCES public.habits(id) ON DELETE CASCADE,
  checkin_date DATE NOT NULL DEFAULT CURRENT_DATE,
  count INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (habit_id, checkin_date)
);
ALTER TABLE public.habit_checkins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "c_select" ON public.habit_checkins FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "c_insert" ON public.habit_checkins FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "c_update" ON public.habit_checkins FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "c_delete" ON public.habit_checkins FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX idx_habit_checkins_habit_date ON public.habit_checkins(habit_id, checkin_date DESC);
CREATE INDEX idx_habit_checkins_user_date ON public.habit_checkins(user_id, checkin_date DESC);