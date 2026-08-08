-- T-Bridge Waiting Management System schema (multi-tenant)

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS system_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS facilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(200) NOT NULL,
  master_username VARCHAR(100) NOT NULL,
  master_password_hash VARCHAR(255) NOT NULL,
  kakao_sender_key VARCHAR(200),
  kakao_balance NUMERIC(12,2) NOT NULL DEFAULT 10000,
  kakao_unit_cost NUMERIC(12,2) NOT NULL DEFAULT 20,
  kakao_warning_threshold NUMERIC(12,2) NOT NULL DEFAULT 1000,
  status VARCHAR(20) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'inactive', 'withdraw')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS facility_settings (
  facility_id UUID PRIMARY KEY REFERENCES facilities(id) ON DELETE CASCADE,
  profile_image_url TEXT,
  terms_of_use TEXT NOT NULL DEFAULT '',
  privacy_policy TEXT NOT NULL DEFAULT '',
  marketing_policy TEXT NOT NULL DEFAULT '',
  terms_of_use_en TEXT NOT NULL DEFAULT '',
  terms_of_use_ja TEXT NOT NULL DEFAULT '',
  terms_of_use_zh TEXT NOT NULL DEFAULT '',
  privacy_policy_en TEXT NOT NULL DEFAULT '',
  privacy_policy_ja TEXT NOT NULL DEFAULT '',
  privacy_policy_zh TEXT NOT NULL DEFAULT '',
  marketing_policy_en TEXT NOT NULL DEFAULT '',
  marketing_policy_ja TEXT NOT NULL DEFAULT '',
  marketing_policy_zh TEXT NOT NULL DEFAULT '',
  enabled_languages TEXT[] NOT NULL DEFAULT ARRAY['ko', 'en', 'ja', 'zh'],
  signage_template_key VARCHAR(50) NOT NULL DEFAULT 'basic',
  postpone_policy VARCHAR(30) NOT NULL DEFAULT 'none',
  postpone_limit INT NOT NULL DEFAULT 3,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS waiting_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  name_en VARCHAR(100) NOT NULL DEFAULT '',
  name_ja VARCHAR(100) NOT NULL DEFAULT '',
  name_zh VARCHAR(100) NOT NULL DEFAULT '',
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_waiting_types_facility
  ON waiting_types(facility_id, display_order);

CREATE TABLE IF NOT EXISTS waitings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  daily_seq INT NOT NULL,
  phone VARCHAR(20) NOT NULL,
  party_counts JSONB NOT NULL DEFAULT '{}'::jsonb,
  total_count INT NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'completed', 'cancelled', 'no_show', 'admin_cancelled')),
  marketing_agreed BOOLEAN NOT NULL DEFAULT FALSE,
  registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancel_reason VARCHAR(50),
  cancelled_by VARCHAR(20),
  complete_page_link TEXT,
  postpone_count INT NOT NULL DEFAULT 0,
  queue_order INT,
  kakao_sent_at TIMESTAMPTZ,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_waitings_facility_status
  ON waitings(facility_id, status, registered_at DESC);

CREATE INDEX IF NOT EXISTS idx_waitings_facility_date
  ON waitings(facility_id, entry_date, daily_seq);

CREATE INDEX IF NOT EXISTS idx_waitings_phone
  ON waitings(facility_id, phone);

CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  phone_number VARCHAR(20) NOT NULL,
  marketing_agreed BOOLEAN NOT NULL DEFAULT FALSE,
  marketing_agreed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (facility_id, phone_number)
);

CREATE TABLE IF NOT EXISTS usage_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  waiting_id UUID REFERENCES waitings(id) ON DELETE SET NULL,
  type VARCHAR(30) NOT NULL CHECK (type IN ('charge', 'send')),
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  unit_cost NUMERIC(12,2),
  balance_after NUMERIC(12,2),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_usage_history_facility_date
  ON usage_history(facility_id, created_at DESC);

CREATE TABLE IF NOT EXISTS kakao_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  template_code VARCHAR(100) NOT NULL,
  template_name VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  sender_key VARCHAR(200),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (facility_id, template_code)
);

CREATE TABLE IF NOT EXISTS signage_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS facility_signages (
  facility_id UUID PRIMARY KEY REFERENCES facilities(id) ON DELETE CASCADE,
  template_key VARCHAR(50) NOT NULL DEFAULT 'basic'
    REFERENCES signage_templates(template_key),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS languages (
  code VARCHAR(10) PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  native_name VARCHAR(50) NOT NULL
);

CREATE TABLE IF NOT EXISTS translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lang_code VARCHAR(10) NOT NULL REFERENCES languages(code),
  resource_key VARCHAR(200) NOT NULL,
  resource_value TEXT NOT NULL,
  UNIQUE (lang_code, resource_key)
);

CREATE TABLE IF NOT EXISTS api_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  api_key VARCHAR(100) NOT NULL UNIQUE,
  webhook_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  waiting_id UUID REFERENCES waitings(id) ON DELETE SET NULL,
  channel VARCHAR(50) NOT NULL DEFAULT 'kakao',
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status VARCHAR(20) NOT NULL DEFAULT 'sent',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
