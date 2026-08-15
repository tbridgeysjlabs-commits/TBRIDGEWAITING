import { pool, query } from './pool.js';

async function columnExists(table, column) {
  const { rows } = await query(
    `SELECT 1 FROM information_schema.columns
     WHERE table_name = $1 AND column_name = $2`,
    [table, column]
  );
  return rows.length > 0;
}

async function addColumn(table, column, definition) {
  if (!(await columnExists(table, column))) {
    await query(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    console.log(`+ ${table}.${column}`);
  }
}

async function migrate() {
  // facilities billing
  await addColumn('facilities', 'kakao_balance', 'NUMERIC(12,2) NOT NULL DEFAULT 10000');
  await addColumn('facilities', 'kakao_unit_cost', 'NUMERIC(12,2) NOT NULL DEFAULT 20');
  await addColumn('facilities', 'kakao_warning_threshold', 'NUMERIC(12,2) NOT NULL DEFAULT 1000');
  await addColumn('facilities', 'admin_contact', `VARCHAR(50) NOT NULL DEFAULT ''`);

  // status: allow withdraw
  await query(`
    DO $$ BEGIN
      ALTER TABLE facilities DROP CONSTRAINT IF EXISTS facilities_status_check;
    EXCEPTION WHEN undefined_object THEN NULL;
    END $$;
  `);
  await query(`
    ALTER TABLE facilities
    ADD CONSTRAINT facilities_status_check
    CHECK (status IN ('active', 'inactive', 'withdraw'))
  `).catch(() => {});

  // facility_settings postpone + multilingual terms
  await addColumn('facility_settings', 'postpone_policy', `VARCHAR(30) NOT NULL DEFAULT 'none'`);
  await addColumn('facility_settings', 'postpone_limit', 'INT NOT NULL DEFAULT 3');
  await addColumn('facility_settings', 'terms_of_use_en', `TEXT NOT NULL DEFAULT ''`);
  await addColumn('facility_settings', 'terms_of_use_ja', `TEXT NOT NULL DEFAULT ''`);
  await addColumn('facility_settings', 'terms_of_use_zh', `TEXT NOT NULL DEFAULT ''`);
  await addColumn('facility_settings', 'privacy_policy_en', `TEXT NOT NULL DEFAULT ''`);
  await addColumn('facility_settings', 'privacy_policy_ja', `TEXT NOT NULL DEFAULT ''`);
  await addColumn('facility_settings', 'privacy_policy_zh', `TEXT NOT NULL DEFAULT ''`);
  await addColumn('facility_settings', 'marketing_policy_en', `TEXT NOT NULL DEFAULT ''`);
  await addColumn('facility_settings', 'marketing_policy_ja', `TEXT NOT NULL DEFAULT ''`);
  await addColumn('facility_settings', 'marketing_policy_zh', `TEXT NOT NULL DEFAULT ''`);

  // waiting_types multilingual
  await addColumn('waiting_types', 'name_en', `VARCHAR(100) NOT NULL DEFAULT ''`);
  await addColumn('waiting_types', 'name_ja', `VARCHAR(100) NOT NULL DEFAULT ''`);
  await addColumn('waiting_types', 'name_zh', `VARCHAR(100) NOT NULL DEFAULT ''`);

  // waitings extensions
  await addColumn('waitings', 'complete_page_link', 'TEXT');
  await addColumn('waitings', 'cancelled_by', 'VARCHAR(20)');
  await addColumn('waitings', 'postpone_count', 'INT NOT NULL DEFAULT 0');
  await addColumn('waitings', 'queue_order', 'INT');
  await addColumn('waitings', 'kakao_sent_at', 'TIMESTAMPTZ');

  await query(`UPDATE waitings SET queue_order = daily_seq WHERE queue_order IS NULL`);
  await query(
    `UPDATE waitings
     SET complete_page_link = '/w/' || f.facility_code || '/complete/' || waitings.id::text
     FROM facilities f
     WHERE waitings.facility_id = f.id AND waitings.complete_page_link IS NULL`
  );

  // customers
  await query(`
    CREATE TABLE IF NOT EXISTS customers (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
      phone_number VARCHAR(20) NOT NULL,
      marketing_agreed BOOLEAN NOT NULL DEFAULT FALSE,
      marketing_agreed_at TIMESTAMPTZ,
      first_registered_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (facility_id, phone_number)
    )
  `);
  await addColumn('customers', 'first_registered_at', 'TIMESTAMPTZ');

  // usage / charge history
  await query(`
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
    )
  `);
  await addColumn('usage_history', 'template_name', `VARCHAR(200)`);
  await addColumn('usage_history', 'recipient_phone', `VARCHAR(30)`);
  await addColumn('usage_history', 'send_status', `VARCHAR(20)`);
  await addColumn('usage_history', 'payment_method', `VARCHAR(100)`);
  await addColumn('usage_history', 'receipt_url', `TEXT`);
  await addColumn('usage_history', 'cancelled_at', 'TIMESTAMPTZ');
  await addColumn('usage_history', 'cancelled_amount', 'NUMERIC(12,2)');

  await addColumn(
    'facility_settings',
    'brand_display_mode',
    `VARCHAR(30) NOT NULL DEFAULT 'image_text'`
  );
  await addColumn(
    'facility_settings',
    'theme',
    `VARCHAR(20) NOT NULL DEFAULT 'light'`
  );
  await addColumn(
    'facility_settings',
    'entry_wait_minutes',
    'INT NOT NULL DEFAULT 5'
  );
  await addColumn(
    'facility_settings',
    'waiting_notification_order',
    'INT'
  );

  // waiting call / entry countdown
  await addColumn('waitings', 'called_at', 'TIMESTAMPTZ');
  await addColumn('waitings', 'call_deadline_at', 'TIMESTAMPTZ');
  await addColumn(
    'waitings',
    'notified_imminent_entry',
    'BOOLEAN NOT NULL DEFAULT FALSE'
  );

  // 약관 3종 → 단일 terms_of_use 통합 (기존 privacy/marketing 본문을 합친 뒤 비움)
  await addColumn('waitings', 'terms_agreed', 'BOOLEAN NOT NULL DEFAULT FALSE');
  await query(`
    UPDATE waitings
    SET terms_agreed = TRUE
    WHERE terms_agreed = FALSE AND marketing_agreed = TRUE
  `).catch(() => {});

  const mergePair = async (target, privacyCol, marketingCol) => {
    await query(`
      UPDATE facility_settings SET
        ${target} = TRIM(BOTH E'\\n' FROM CONCAT_WS(E'\\n\\n',
          NULLIF(TRIM(${target}), ''),
          NULLIF(TRIM(${privacyCol}), ''),
          NULLIF(TRIM(${marketingCol}), '')
        )),
        ${privacyCol} = '',
        ${marketingCol} = ''
      WHERE TRIM(COALESCE(${privacyCol}, '')) <> ''
         OR TRIM(COALESCE(${marketingCol}, '')) <> ''
    `);
  };
  await mergePair('terms_of_use', 'privacy_policy', 'marketing_policy');
  await mergePair('terms_of_use_en', 'privacy_policy_en', 'marketing_policy_en');
  await mergePair('terms_of_use_ja', 'privacy_policy_ja', 'marketing_policy_ja');
  await mergePair('terms_of_use_zh', 'privacy_policy_zh', 'marketing_policy_zh');
  console.log('~ facility_settings terms merged into terms_of_use*');

  // NicePay charge tracking
  await addColumn('usage_history', 'pg_tid', 'VARCHAR(40)');
  await addColumn('usage_history', 'pg_moid', 'VARCHAR(64)');
  await query(`
    CREATE TABLE IF NOT EXISTS payment_orders (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
      moid VARCHAR(64) NOT NULL UNIQUE,
      amount NUMERIC(12,2) NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'paid', 'failed', 'cancelled')),
      tid VARCHAR(40),
      pay_method VARCHAR(30),
      auth_code VARCHAR(40),
      raw_response JSONB,
      usage_history_id UUID REFERENCES usage_history(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await query(
    `CREATE INDEX IF NOT EXISTS idx_payment_orders_facility
     ON payment_orders(facility_id, created_at DESC)`
  );

  await query(
    `CREATE INDEX IF NOT EXISTS idx_usage_history_facility_date
     ON usage_history(facility_id, created_at DESC)`
  );

  await query(`
    INSERT INTO customers (facility_id, phone_number, marketing_agreed, marketing_agreed_at, first_registered_at)
    SELECT DISTINCT ON (facility_id, phone)
      facility_id, phone, marketing_agreed,
      CASE WHEN marketing_agreed THEN registered_at ELSE NULL END,
      registered_at
    FROM waitings
    ORDER BY facility_id, phone, registered_at ASC
    ON CONFLICT (facility_id, phone_number) DO UPDATE SET
      first_registered_at = COALESCE(customers.first_registered_at, EXCLUDED.first_registered_at)
  `);

  console.log('Migration completed.');
  await pool.end();
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
