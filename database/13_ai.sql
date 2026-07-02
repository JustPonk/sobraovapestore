-- AI domain: chatbot conversations, messages and product recommendations

CREATE TABLE IF NOT EXISTS chatbot_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid,
  profile_id uuid,
  conversation_key text NOT NULL UNIQUE,
  conversation_type text NOT NULL DEFAULT 'support',
  channel text NOT NULL DEFAULT 'web',
  subject text,
  status text NOT NULL DEFAULT 'open',
  context jsonb NOT NULL DEFAULT '{}'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  started_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  deleted_at timestamptz,
  CONSTRAINT chatbot_conversations_customer_fk FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
  CONSTRAINT chatbot_conversations_profile_fk FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE SET NULL,
  CONSTRAINT chatbot_conversations_owner_check CHECK ((customer_id IS NOT NULL)::int + (profile_id IS NOT NULL)::int = 1),
  CONSTRAINT chatbot_conversations_type_check CHECK (conversation_type IN ('support', 'sales', 'post_purchase', 'catalog', 'other')),
  CONSTRAINT chatbot_conversations_channel_check CHECK (channel IN ('web', 'whatsapp', 'messenger', 'app', 'api')),
  CONSTRAINT chatbot_conversations_status_check CHECK (status IN ('open', 'closed', 'archived')),
  CONSTRAINT chatbot_conversations_time_check CHECK (ended_at IS NULL OR ended_at >= started_at)
);

COMMENT ON TABLE chatbot_conversations IS 'Conversation header with context for AI-assisted customer interactions.';

CREATE TRIGGER chatbot_conversations_set_updated_at
BEFORE UPDATE ON chatbot_conversations
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS chatbot_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL,
  sender_role text NOT NULL,
  message_text text NOT NULL,
  model_name text,
  tool_name text,
  token_count integer,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT chatbot_messages_conversation_fk FOREIGN KEY (conversation_id) REFERENCES chatbot_conversations(id) ON DELETE CASCADE,
  CONSTRAINT chatbot_messages_sender_role_check CHECK (sender_role IN ('user', 'assistant', 'system', 'tool')),
  CONSTRAINT chatbot_messages_token_count_check CHECK (token_count IS NULL OR token_count >= 0)
);

COMMENT ON TABLE chatbot_messages IS 'Immutable message log for chat-based AI and support conversations.';

CREATE INDEX IF NOT EXISTS idx_chatbot_messages_conversation_id ON chatbot_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chatbot_messages_created_at ON chatbot_messages(created_at DESC);

CREATE TABLE IF NOT EXISTS ai_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid,
  profile_id uuid,
  product_id uuid NOT NULL,
  product_variant_id uuid,
  recommendation_type text NOT NULL DEFAULT 'product',
  score numeric(10,6) NOT NULL DEFAULT 0,
  explanation text,
  context jsonb NOT NULL DEFAULT '{}'::jsonb,
  generated_by text,
  generated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  expires_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  deleted_at timestamptz,
  CONSTRAINT ai_recommendations_customer_fk FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
  CONSTRAINT ai_recommendations_profile_fk FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE SET NULL,
  CONSTRAINT ai_recommendations_product_fk FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  CONSTRAINT ai_recommendations_variant_fk FOREIGN KEY (product_variant_id, product_id) REFERENCES product_variants(id, product_id) ON DELETE CASCADE,
  CONSTRAINT ai_recommendations_owner_check CHECK ((customer_id IS NOT NULL)::int + (profile_id IS NOT NULL)::int = 1),
  CONSTRAINT ai_recommendations_score_check CHECK (score >= 0),
  CONSTRAINT ai_recommendations_time_check CHECK (expires_at IS NULL OR expires_at > generated_at)
);

COMMENT ON TABLE ai_recommendations IS 'Recommendation output rows produced by ranking or personalization engines.';

CREATE TRIGGER ai_recommendations_set_updated_at
BEFORE UPDATE ON ai_recommendations
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_ai_recommendations_customer_id ON ai_recommendations(customer_id);
CREATE INDEX IF NOT EXISTS idx_ai_recommendations_profile_id ON ai_recommendations(profile_id);
CREATE INDEX IF NOT EXISTS idx_ai_recommendations_product_id ON ai_recommendations(product_id);
CREATE INDEX IF NOT EXISTS idx_ai_recommendations_generated_at ON ai_recommendations(generated_at DESC);
