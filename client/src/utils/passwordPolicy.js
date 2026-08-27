/**
 * 관리자 비밀번호 생성 규칙 (서버 passwordPolicy.js 와 동일)
 */

const SPECIAL_RE = /[!@#$%^&*()_\-+=\[\]{};':"\\|,.<>\/?`~]/;
const WEAK_PASSWORDS = new Set(
  [
    '123456',
    '1234567',
    '12345678',
    '123456789',
    '1234567890',
    'password',
    'password1',
    'password12',
    'password123',
    'qwerty',
    'qwerty123',
    'admin',
    'admin123',
    'admin1234',
    '11111111',
    '00000000',
    'abcdefg',
    'abc123456',
    'iloveyou',
    'welcome',
    'welcome1',
    'letmein',
    'monkey',
    'dragon',
    'master',
    'login',
    'passw0rd',
    'demo1234',
    'sysadmin',
  ].map((s) => s.toLowerCase())
);

/**
 * @param {string} password
 * @param {{ username?: string }} [options]
 * @returns {{ valid: boolean, reasons: string[], checks: Record<string, boolean> }}
 */
export function validatePassword(password, options = {}) {
  const pwd = String(password ?? '');
  const username = String(options.username ?? '').trim();
  const reasons = [];
  const checks = {
    minLength: pwd.length >= 10,
    upper: /[A-Z]/.test(pwd),
    lower: /[a-z]/.test(pwd),
    digit: /[0-9]/.test(pwd),
    special: SPECIAL_RE.test(pwd),
    notUsername: true,
    notWeak: !WEAK_PASSWORDS.has(pwd.toLowerCase()),
  };

  const varietyCount = [checks.upper, checks.lower, checks.digit, checks.special].filter(
    Boolean
  ).length;
  checks.variety = varietyCount >= 3;

  if (username) {
    const uname = username.toLowerCase();
    const lowerPwd = pwd.toLowerCase();
    checks.notUsername = lowerPwd !== uname && !lowerPwd.includes(uname);
  }

  if (!checks.minLength) reasons.push('비밀번호는 10자 이상이어야 합니다.');
  if (!checks.variety) {
    reasons.push('영문 대문자, 소문자, 숫자, 특수문자 중 3종류 이상을 포함해야 합니다.');
  }
  if (!checks.notUsername) {
    reasons.push('비밀번호에 아이디를 포함하거나 아이디와 동일하게 설정할 수 없습니다.');
  }
  if (!checks.notWeak) reasons.push('너무 쉬운 비밀번호는 사용할 수 없습니다.');

  return {
    valid: reasons.length === 0,
    reasons,
    checks,
  };
}

/** 실시간 체크리스트용 항목 */
export const PASSWORD_CHECK_ITEMS = [
  { key: 'minLength', label: '10자 이상' },
  { key: 'upper', label: '영문 대문자 포함' },
  { key: 'lower', label: '영문 소문자 포함' },
  { key: 'digit', label: '숫자 포함' },
  { key: 'special', label: '특수문자 포함' },
  { key: 'variety', label: '위 종류 중 3가지 이상 조합' },
  { key: 'notUsername', label: '아이디와 다르고 아이디 미포함' },
  { key: 'notWeak', label: '흔한 취약 비밀번호 아님' },
];
