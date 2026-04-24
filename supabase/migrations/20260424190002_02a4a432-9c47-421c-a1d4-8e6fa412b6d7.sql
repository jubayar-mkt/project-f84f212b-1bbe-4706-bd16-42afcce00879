-- Templates: fixed daily routine items (no date — repeats every day)
CREATE TABLE public.routine_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  start_time time without time zone,
  end_time time without time zone,
  category text,
  priority routine_priority NOT NULL DEFAULT 'medium',
  active boolean NOT NULL DEFAULT true,
  archived_at timestamp with time zone,
  effective_from date NOT NULL DEFAULT CURRENT_DATE,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.routine_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY rt_select ON public.routine_templates FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY rt_insert ON public.routine_templates FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY rt_update ON public.routine_templates FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY rt_delete ON public.routine_templates FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX idx_rt_user_active ON public.routine_templates(user_id, active) WHERE archived_at IS NULL;

CREATE TRIGGER rt_updated_at
BEFORE UPDATE ON public.routine_templates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Per-day completion status
CREATE TABLE public.routine_completions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  template_id uuid NOT NULL REFERENCES public.routine_templates(id) ON DELETE CASCADE,
  completion_date date NOT NULL,
  completed boolean NOT NULL DEFAULT false,
  skipped boolean NOT NULL DEFAULT false,
  completed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(template_id, completion_date)
);

ALTER TABLE public.routine_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY rc_select ON public.routine_completions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY rc_insert ON public.routine_completions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY rc_update ON public.routine_completions FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY rc_delete ON public.routine_completions FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX idx_rc_user_date ON public.routine_completions(user_id, completion_date);
CREATE INDEX idx_rc_template_date ON public.routine_completions(template_id, completion_date);

CREATE TRIGGER rc_updated_at
BEFORE UPDATE ON public.routine_completions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();