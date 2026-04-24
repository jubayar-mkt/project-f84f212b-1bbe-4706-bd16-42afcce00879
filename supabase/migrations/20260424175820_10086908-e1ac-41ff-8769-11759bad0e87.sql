-- Enum for transaction types
CREATE TYPE public.transaction_type AS ENUM ('income', 'expense');

-- Transactions table
CREATE TABLE public.transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type public.transaction_type NOT NULL,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
  category TEXT NOT NULL,
  note TEXT,
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_transactions_user_date ON public.transactions(user_id, transaction_date DESC);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY t_select ON public.transactions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY t_insert ON public.transactions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY t_update ON public.transactions FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY t_delete ON public.transactions FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER trg_transactions_updated_at
  BEFORE UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Budgets table (per category, per month)
CREATE TABLE public.budgets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  category TEXT NOT NULL,
  monthly_limit NUMERIC(12, 2) NOT NULL CHECK (monthly_limit >= 0),
  month DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, category, month)
);

CREATE INDEX idx_budgets_user_month ON public.budgets(user_id, month DESC);

ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY b_select ON public.budgets FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY b_insert ON public.budgets FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY b_update ON public.budgets FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY b_delete ON public.budgets FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER trg_budgets_updated_at
  BEFORE UPDATE ON public.budgets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();