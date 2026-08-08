const LANGS = [
  { code: 'ko', label: '한국어' },
  { code: 'en', label: 'ENG' },
  { code: 'ja', label: '日本' },
  { code: 'zh', label: '中文(简体)' },
];

export default function LanguageSelector({ lang, onChange, enabled = ['ko', 'en', 'ja', 'zh'] }) {
  return (
    <div className="lang-selector">
      {LANGS.filter((l) => enabled.includes(l.code)).map((l) => (
        <button
          key={l.code}
          type="button"
          className={`lang-btn ${lang === l.code ? 'active' : ''}`}
          onClick={() => onChange(l.code)}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}
