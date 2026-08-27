import { PASSWORD_CHECK_ITEMS, validatePassword } from '../utils/passwordPolicy';

export default function PasswordChecklist({ password, username, className = '' }) {
  const { checks } = validatePassword(password || '', { username });
  const varietyCount = [checks.upper, checks.lower, checks.digit, checks.special].filter(
    Boolean
  ).length;

  return (
    <ul
      className={className}
      style={{
        listStyle: 'none',
        margin: '8px 0 0',
        padding: 0,
        fontSize: 13,
        lineHeight: 1.55,
        color: '#666',
      }}
    >
      {PASSWORD_CHECK_ITEMS.map((item) => {
        const ok = !!checks[item.key];
        let label = item.label;
        if (item.key === 'variety') {
          label = `위 종류 중 3가지 이상 조합 (${varietyCount}/4)`;
        }
        return (
          <li
            key={item.key}
            style={{ color: ok ? '#1a7f37' : '#999', display: 'flex', gap: 6 }}
          >
            <span aria-hidden>{ok ? '✓' : '○'}</span>
            <span>{label}</span>
          </li>
        );
      })}
    </ul>
  );
}
