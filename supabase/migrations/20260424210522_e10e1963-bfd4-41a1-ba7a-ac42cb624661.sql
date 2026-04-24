-- savings_goals table
CREATE TABLE public.savings_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  target_amount NUMERIC NOT NULL CHECK (target_amount > 0),
  deadline DATE,
  icon TEXT NOT NULL DEFAULT 'piggy-bank',
  color TEXT NOT NULL DEFAULT 'success',
  note TEXT,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.savings_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY sg_select ON public.savings_goals FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY sg_insert ON public.savings_goals FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY sg_update ON public.savings_goals FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY sg_delete ON public.savings_goals FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER trg_savings_goals_updated_at
BEFORE UPDATE ON public.savings_goals
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- savings_deposits table
CREATE TABLE public.savings_deposits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  goal_id UUID NOT NULL REFERENCES public.savings_goals(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  deposit_date DATE NOT NULL DEFAULT CURRENT_DATE,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.savings_deposits ENABLE ROW LEVEL SECURITY;

CREATE POLICY sd_select ON public.savings_deposits FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY sd_insert ON public.savings_deposits FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY sd_update ON public.savings_deposits FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY sd_delete ON public.savings_deposits FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER trg_savings_deposits_updated_at
BEFORE UPDATE ON public.savings_deposits
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE INDEX idx_savings_goals_user ON public.savings_goals(user_id);
CREATE INDEX idx_savings_deposits_goal ON public.savings_deposits(goal_id);
CREATE INDEX idx_savings_deposits_user ON public.savings_deposits(user_id);