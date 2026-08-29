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

  // terms_agreed 백필 (약관 본문은 terms / privacy / marketing 3종으로 분리 유지)
  await addColumn('waitings', 'terms_agreed', 'BOOLEAN NOT NULL DEFAULT FALSE');
  await query(`
    UPDATE waitings
    SET terms_agreed = TRUE
    WHERE terms_agreed = FALSE AND marketing_agreed = TRUE
  `).catch(() => {});

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

  // 약관 동의 항목별 저장
  await addColumn('waitings', 'terms_of_use_agreed', 'BOOLEAN NOT NULL DEFAULT FALSE');
  await addColumn('waitings', 'terms_of_use_agreed_at', 'TIMESTAMPTZ');
  await addColumn('waitings', 'privacy_agreed', 'BOOLEAN NOT NULL DEFAULT FALSE');
  await addColumn('waitings', 'privacy_agreed_at', 'TIMESTAMPTZ');
  await addColumn('waitings', 'marketing_agreed_at', 'TIMESTAMPTZ');
  await query(`
    UPDATE waitings
    SET terms_of_use_agreed = TRUE,
        terms_of_use_agreed_at = COALESCE(terms_of_use_agreed_at, registered_at),
        privacy_agreed = TRUE,
        privacy_agreed_at = COALESCE(privacy_agreed_at, registered_at)
    WHERE terms_agreed = TRUE
      AND (terms_of_use_agreed = FALSE OR privacy_agreed = FALSE)
  `);

  // 매장 안내 / 광고 영역
  await addColumn('facility_settings', 'store_notice', `TEXT NOT NULL DEFAULT ''`);
  await addColumn('facility_settings', 'ad_area_enabled', 'BOOLEAN NOT NULL DEFAULT TRUE');

  // 공지사항
  await query(`
    CREATE TABLE IF NOT EXISTS notices (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      version VARCHAR(40) NOT NULL DEFAULT '',
      title VARCHAR(300) NOT NULL,
      content_html TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await query(
    `CREATE INDEX IF NOT EXISTS idx_notices_created ON notices(created_at DESC)`
  );

  // 시스템 전역 설정
  await query(`
    CREATE TABLE IF NOT EXISTS system_settings (
      key VARCHAR(100) PRIMARY KEY,
      value TEXT NOT NULL DEFAULT '',
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await query(`
    INSERT INTO system_settings (key, value)
    VALUES ('admin_contact', '')
    ON CONFLICT (key) DO NOTHING
  `);

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

  // 로그인 시도 제한
  await addColumn('system_admins', 'failed_login_count', 'INTEGER NOT NULL DEFAULT 0');
  await addColumn('system_admins', 'locked_until', 'TIMESTAMPTZ');
  await addColumn('facilities', 'failed_login_count', 'INTEGER NOT NULL DEFAULT 0');
  await addColumn('facilities', 'locked_until', 'TIMESTAMPTZ');

  // 키오스크: 1팀당 예상 대기(분) + 다국어 공지
  await addColumn(
    'facility_settings',
    'avg_wait_minutes_per_team',
    'INTEGER NOT NULL DEFAULT 5'
  );
  await addColumn('facility_settings', 'kiosk_notice', `TEXT NOT NULL DEFAULT ''`);
  await addColumn('facility_settings', 'kiosk_notice_en', `TEXT NOT NULL DEFAULT ''`);
  await addColumn('facility_settings', 'kiosk_notice_ja', `TEXT NOT NULL DEFAULT ''`);
  await addColumn('facility_settings', 'kiosk_notice_zh', `TEXT NOT NULL DEFAULT ''`);

  // 카카오 알림톡 템플릿 초기화 → 신규 8종
  await query(`DELETE FROM kakao_templates`).catch(() => {});
  const demoFacility = await query(
    `SELECT id FROM facilities WHERE facility_code = 'demo-park' LIMIT 1`
  ).catch(() => ({ rows: [] }));
  if (demoFacility.rows[0]) {
    const fid = demoFacility.rows[0].id;
    const templates = [
      ['ppur_2026081911072324417655171', '웨이팅 등록 완료 안내'],
      ['ppur_2026081911054024417231502', '입장 임박 안내'],
      ['ppur_2026081911043647407558286', '입장 안내'],
      ['ppur_2026081911024547407465933', '미입장 웨이팅 취소 안내'],
      ['ppur_2026081911012247407706584', '웨이팅 순서 변경 완료 안내'],
      ['ppur_2026081910595547407136242', '웨이팅 취소 완료 안내'],
      ['ppur_2026081812234847407727731', '티브리지 웨이팅 환불 안내'],
      ['ppur_2026081812114047407778284', '티브리지 웨이팅 충전 안내'],
    ];
    for (const [code, name] of templates) {
      await query(
        `INSERT INTO kakao_templates (
           facility_id, template_code, template_name, content, sender_key
         ) VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (facility_id, template_code) DO UPDATE
           SET template_name = EXCLUDED.template_name,
               content = EXCLUDED.content`,
        [fid, code, name, name, 'SENDER_DEMO_KEY']
      );
    }
  }

  // 시설사용 / 시스템관리자용 비밀번호 이원화
  await addColumn('facilities', 'facility_password_hash', 'VARCHAR(255)');
  await addColumn('facilities', 'master_password', 'TEXT');

  {
    const bcrypt = (await import('bcryptjs')).default;
    const facilityHash = await bcrypt.hash('admin1234!', 10);
    const masterHash = await bcrypt.hash('tbridge1234!', 10);

    // 시설사용 비밀번호 미설정 행 → 초기값 admin1234!
    await query(
      `UPDATE facilities SET facility_password_hash = $1
       WHERE facility_password_hash IS NULL OR facility_password_hash = ''`,
      [facilityHash]
    );

    // 마스터 비밀번호 미설정 행 → 초기값 tbridge1234!
    await query(
      `UPDATE facilities SET
         master_password = $1,
         master_password_hash = $2
       WHERE master_password IS NULL OR master_password = ''`,
      ['tbridge1234!', masterHash]
    );
  }

  // 마스터계정 ID 미사용 — NOT NULL 해제
  await query(
    `ALTER TABLE facilities ALTER COLUMN master_username DROP NOT NULL`
  ).catch(() => {});
  await query(
    `UPDATE facilities SET master_username = COALESCE(master_username, '')`
  ).catch(() => {});

  console.log('Migration completed.');
  await pool.end();
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
