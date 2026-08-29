import bcrypt from 'bcryptjs';
import { pool, query } from './pool.js';

const translations = {
  ko: {
    current_waiting: '현재 대기',
    teams: '팀',
    phone_hint: '실시간 웨이팅 안내를 받을 수 있는 번호를 입력해 주세요',
    start_waiting: '웨이팅 시작',
    party_title: '총 입장 인원을 입력해 주세요',
    previous: '이전',
    confirm: '확인',
    total_party: '총 입장 인원 {n}명',
    agreement_title: '약관 동의',
    terms_required: '이용 약관 동의 (필수)',
    privacy_required: '개인정보 수집 및 이용 동의 (필수)',
    marketing_optional: '마케팅 관련 개인정보 수집 이용 동의 (선택)',
    agree: '동의',
    toast_registered: '웨이팅 등록 완료! 카카오 알림톡을 발송했어요.',
    waiting_mgmt: '대기자 관리',
    waiting_history: '대기자 내역',
    settings: '설정',
    logout: '로그아웃',
    pending: '대기 중',
    completed: '대기 완료',
    cancelled: '대기 취소',
    enter: '입장하기',
    cancel_waiting: '대기 취소',
  },
  en: {
    current_waiting: 'Now Waiting',
    teams: 'teams',
    phone_hint: 'Please enter a phone number to receive real-time waiting updates',
    start_waiting: 'Start Waiting',
    party_title: 'Please enter the total number of guests',
    previous: 'Previous',
    confirm: 'Confirm',
    total_party: 'Total {n} guests',
    agreement_title: 'Agreement',
    terms_required: 'Terms of Use (Required)',
    privacy_required: 'Privacy Policy (Required)',
    marketing_optional: 'Marketing Consent (Optional)',
    agree: 'Agree',
    toast_registered: 'Waiting registered! Kakao notification has been sent.',
    waiting_mgmt: 'Waiting Management',
    waiting_history: 'Waiting History',
    settings: 'Settings',
    logout: 'Logout',
    pending: 'Waiting',
    completed: 'Completed',
    cancelled: 'Cancelled',
    enter: 'Enter',
    cancel_waiting: 'Cancel',
  },
  ja: {
    current_waiting: '現在の待機',
    teams: '組',
    phone_hint: 'リアルタイム待機案内を受け取る番号を入力してください',
    start_waiting: 'ウェイティング開始',
    party_title: '入場人数を入力してください',
    previous: '前へ',
    confirm: '確認',
    total_party: '合計入場人数 {n}名',
    agreement_title: '規約同意',
    terms_required: '利用規約への同意（必須）',
    privacy_required: '個人情報の収集・利用への同意（必須）',
    marketing_optional: 'マーケティング関連の同意（任意）',
    agree: '同意',
    toast_registered: 'ウェイティング登録完了！カカオ通知を送信しました。',
    waiting_mgmt: '待機者管理',
    waiting_history: '待機者履歴',
    settings: '設定',
    logout: 'ログアウト',
    pending: '待機中',
    completed: '待機完了',
    cancelled: '待機取消',
    enter: '入場する',
    cancel_waiting: '待機取消',
  },
  zh: {
    current_waiting: '当前等候',
    teams: '组',
    phone_hint: '请输入可接收实时等候通知的手机号码',
    start_waiting: '开始等候',
    party_title: '请输入入场总人数',
    previous: '上一步',
    confirm: '确认',
    total_party: '入场总人数 {n}人',
    agreement_title: '条款同意',
    terms_required: '同意使用条款（必填）',
    privacy_required: '同意收集及使用个人信息（必填）',
    marketing_optional: '同意营销相关个人信息收集使用（可选）',
    agree: '同意',
    toast_registered: '等候登记完成！已发送Kakao通知。',
    waiting_mgmt: '等候管理',
    waiting_history: '等候记录',
    settings: '设置',
    logout: '退出登录',
    pending: '等候中',
    completed: '等候完成',
    cancelled: '等候取消',
    enter: '入场',
    cancel_waiting: '取消等候',
  },
};

async function seed() {
  const adminHash = await bcrypt.hash('admin1234', 10);
  const facilityLoginHash = await bcrypt.hash('admin1234!', 10);
  const masterHash = await bcrypt.hash('tbridge1234!', 10);

  await query(
    `INSERT INTO system_admins (username, password_hash)
     VALUES ($1, $2)
     ON CONFLICT (username) DO NOTHING`,
    ['sysadmin', adminHash]
  );

  await query(
    `INSERT INTO languages (code, name, native_name) VALUES
      ('ko', 'Korean', '한국어'),
      ('en', 'English', 'ENG'),
      ('ja', 'Japanese', '日本'),
      ('zh', 'Chinese Simplified', '中文(简体)')
     ON CONFLICT (code) DO NOTHING`
  );

  for (const [lang, map] of Object.entries(translations)) {
    for (const [key, value] of Object.entries(map)) {
      await query(
        `INSERT INTO translations (lang_code, resource_key, resource_value)
         VALUES ($1, $2, $3)
         ON CONFLICT (lang_code, resource_key)
         DO UPDATE SET resource_value = EXCLUDED.resource_value`,
        [lang, key, value]
      );
    }
  }

  await query(
    `INSERT INTO signage_templates (template_key, name, description)
     VALUES ('basic', '기본 템플릿', '1차 기본 사이니지 템플릿')
     ON CONFLICT (template_key) DO NOTHING`
  );

  const facilityResult = await query(
    `INSERT INTO facilities (
       facility_code, name, master_username,
       facility_password_hash, master_password_hash, master_password,
       kakao_sender_key
     ) VALUES ($1, $2, '', $3, $4, $5, $6)
     ON CONFLICT (facility_code) DO UPDATE
       SET name = EXCLUDED.name,
           facility_password_hash = EXCLUDED.facility_password_hash,
           master_password_hash = EXCLUDED.master_password_hash,
           master_password = EXCLUDED.master_password
     RETURNING id`,
    [
      'demo-park',
      '데모 테마파크',
      facilityLoginHash,
      masterHash,
      'tbridge1234!',
      'SENDER_DEMO_KEY',
    ]
  );

  const facilityId = facilityResult.rows[0].id;

  await query(
    `INSERT INTO facility_settings (facility_id, terms_of_use)
     VALUES ($1, $2)
     ON CONFLICT (facility_id) DO UPDATE SET
       terms_of_use = EXCLUDED.terms_of_use`,
    [
      facilityId,
      '티브리지 웨이팅 서비스 약관\n\n1. 웨이팅 등록 시 부여된 순번에 따라 입장 안내가 진행됩니다.\n2. 호출 이후 미입장 시 매장 정책에 따라 순번이 조정될 수 있습니다.\n3. 개인정보는 웨이팅 안내 목적으로만 이용되며, 목적 달성 후 파기됩니다.',
    ]
  );

  await query(
    `INSERT INTO facility_signages (facility_id, template_key)
     VALUES ($1, 'basic')
     ON CONFLICT (facility_id) DO NOTHING`,
    [facilityId]
  );

  await query(`DELETE FROM waiting_types WHERE facility_id = $1`, [facilityId]);
  const types = ['대인', '소인', '유아'];
  for (let i = 0; i < types.length; i += 1) {
    await query(
      `INSERT INTO waiting_types (facility_id, name, display_order)
       VALUES ($1, $2, $3)`,
      [facilityId, types[i], i]
    );
  }

  await query(`DELETE FROM kakao_templates WHERE facility_id = $1`, [facilityId]);
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
             content = EXCLUDED.content,
             sender_key = EXCLUDED.sender_key`,
      [facilityId, code, name, name, 'SENDER_DEMO_KEY']
    );
  }

  await query(
    `INSERT INTO api_credentials (facility_id, api_key, is_active)
     VALUES ($1, $2, FALSE)
     ON CONFLICT DO NOTHING`,
    [facilityId, `tb_demo_${facilityId.slice(0, 8)}`]
  );

  // sample waitings for today
  const existing = await query(
    `SELECT COUNT(*)::int AS cnt FROM waitings WHERE facility_id = $1 AND entry_date = CURRENT_DATE`,
    [facilityId]
  );

  if (existing.rows[0].cnt === 0) {
    const now = new Date();
    const samples = [
      { seq: 117, phone: '01012341234', status: 'completed', minsAgo: 40, waitMins: 29 },
      { seq: 118, phone: '01023452345', status: 'pending', minsAgo: 27, waitMins: 27 },
      { seq: 119, phone: '01034563456', status: 'pending', minsAgo: 20, waitMins: 20 },
      { seq: 120, phone: '01045674567', status: 'pending', minsAgo: 15, waitMins: 15 },
      { seq: 116, phone: '01056785678', status: 'admin_cancelled', minsAgo: 50, waitMins: 25 },
      { seq: 115, phone: '01067896789', status: 'cancelled', minsAgo: 55, waitMins: 20 },
      { seq: 114, phone: '01078907890', status: 'no_show', minsAgo: 60, waitMins: 30 },
    ];

    for (const s of samples) {
      const registered = new Date(now.getTime() - s.minsAgo * 60000);
      const ended = new Date(registered.getTime() + s.waitMins * 60000);
      const isDone = s.status !== 'pending';
      await query(
        `INSERT INTO waitings (
           facility_id, daily_seq, phone, party_counts, total_count, status,
           marketing_agreed, registered_at, completed_at, cancelled_at, cancel_reason, entry_date
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,CURRENT_DATE)`,
        [
          facilityId,
          s.seq,
          s.phone,
          JSON.stringify({ 대인: 2, 소인: 1, 유아: 0 }),
          3,
          s.status,
          false,
          registered.toISOString(),
          s.status === 'completed' ? ended.toISOString() : null,
          ['cancelled', 'admin_cancelled', 'no_show'].includes(s.status)
            ? ended.toISOString()
            : null,
          s.status === 'pending' ? null : s.status,
        ]
      );
    }
  }

  console.log('Seed completed.');
  console.log('System admin: sysadmin / admin1234');
  console.log('Facility demo: /w/demo-park , login password: admin1234!');
  console.log('Facility master password (system admin): tbridge1234!');
  await pool.end();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
