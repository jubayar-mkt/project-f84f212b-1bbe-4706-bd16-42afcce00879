-- Shop credit purchases (items bought on credit)
CREATE TABLE public.shop_credits (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  shop_name text NOT NULL,
  purchase_date date NOT NULL DEFAULT CURRENT_DATE,
  item_name text NOT NULL,
  quantity numeric NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  total_amount numeric NOT NULL,
  note text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.shop_credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY sc_select ON public.shop_credits FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY sc_insert ON public.shop_credits FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY sc_update ON public.shop_credits FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY sc_delete ON public.shop_credits FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX idx_shop_credits_user_date ON public.shop_credits(user_id, purchase_date DESC);
CREATE INDEX idx_shop_credits_user_shop ON public.shop_credits(user_id, shop_name);

CREATE TRIGGER shop_credits_updated_at
BEFORE UPDATE ON public.shop_credits
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Shop payments (money paid back to shops)
CREATE TABLE public.shop_payments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  shop_name text NOT NULL,
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  paid_amount numeric NOT NULL,
  payment_method text,
  note text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.shop_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY sp_select ON public.shop_payments FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY sp_insert ON public.shop_payments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY sp_update ON public.shop_payments FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY sp_delete ON public.shop_payments FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX idx_shop_payments_user_date ON public.shop_payments(user_id, payment_date DESC);
CREATE INDEX idx_shop_payments_user_shop ON public.shop_payments(user_id, shop_name);

CREATE TRIGGER shop_payments_updated_at
BEFORE UPDATE ON public.shop_payments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();