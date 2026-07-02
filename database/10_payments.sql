-- Payments domain: payment methods, payments and refunds

CREATE TABLE IF NOT EXISTS payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL UNIQUE,
  provider text,
  method_type text NOT NULL DEFAULT 'offline',
  is_active boolean NOT NULL DEFAULT true,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  deleted_at timestamptz,
  CONSTRAINT payment_methods_method_type_check CHECK (method_type IN ('offline', 'card', 'bank_transfer', 'wallet', 'cash', 'cod', 'other'))
);

COMMENT ON TABLE payment_methods IS 'Supported payment methods and provider configuration.';

CREATE TRIGGER payment_methods_set_updated_at
BEFORE UPDATE ON payment_methods
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  payment_method_id uuid NOT NULL,
  payment_reference text,
  provider_transaction_id text,
  status payment_status NOT NULL DEFAULT 'pending',
  amount numeric(18,2) NOT NULL,
  currency_code char(3) NOT NULL,
  authorized_at timestamptz,
  captured_at timestamptz,
  failed_at timestamptz,
  refunded_at timestamptz,
  failure_reason text,
  raw_response jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  deleted_at timestamptz,
  CONSTRAINT payments_order_fk FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE RESTRICT,
  CONSTRAINT payments_method_fk FOREIGN KEY (payment_method_id) REFERENCES payment_methods(id) ON DELETE RESTRICT,
  CONSTRAINT payments_amount_nonnegative CHECK (amount >= 0),
  CONSTRAINT payments_currency_check CHECK (currency_code ~ '^[A-Z]{3}$'),
  CONSTRAINT payments_provider_tx_unique UNIQUE (provider_transaction_id)
);

COMMENT ON TABLE payments IS 'Payment attempts and capture records associated with customer orders.';

CREATE TRIGGER payments_set_updated_at
BEFORE UPDATE ON payments
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_method_id ON payments(payment_method_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS refunds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id uuid NOT NULL,
  order_id uuid NOT NULL,
  refund_reference text NOT NULL UNIQUE,
  provider_refund_id text UNIQUE,
  status text NOT NULL DEFAULT 'pending',
  amount numeric(18,2) NOT NULL,
  reason text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  deleted_at timestamptz,
  CONSTRAINT refunds_payment_fk FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE RESTRICT,
  CONSTRAINT refunds_order_fk FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE RESTRICT,
  CONSTRAINT refunds_status_check CHECK (status IN ('pending', 'succeeded', 'failed', 'cancelled')),
  CONSTRAINT refunds_amount_nonnegative CHECK (amount >= 0)
);

COMMENT ON TABLE refunds IS 'Refund ledger for captured payments.';

CREATE TRIGGER refunds_set_updated_at
BEFORE UPDATE ON refunds
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_refunds_payment_id ON refunds(payment_id);
CREATE INDEX IF NOT EXISTS idx_refunds_order_id ON refunds(order_id);
CREATE INDEX IF NOT EXISTS idx_refunds_status ON refunds(status) WHERE deleted_at IS NULL;
