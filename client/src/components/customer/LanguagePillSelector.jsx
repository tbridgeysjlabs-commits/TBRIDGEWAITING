const LANGS = [
  { code: 'ko', label: '한국어' },
  { code: 'en', label: 'ENG' },
  { code: 'ja', label: '日本語' },
  { code: 'zh', label: '中文' },
];

export default function LanguagePillSelector({
  lang,
  onChange,
  enabled = ['ko', 'en', 'ja', 'zh'],
  align = 'center',
}) {
  const items = LANGS.filter((l) => enabled.includes(l.code));
  return (
    <div
      className={`flex w-full ${align === 'start' ? 'justify-start' : 'justify-center'}`}
    >
      <div className="inline-flex items-center gap-[clamp(0.25rem,0.6vw,0.5rem)] rounded-full border border-[var(--cw-border,rgba(255,255,255,0.08))] bg-[var(--cw-panel,#1A1A24)] p-[clamp(0.2rem,0.6vh,0.4rem)]">
        {items.map((l) => {
          const active = lang === l.code;
          return (
            <button
              key={l.code}
              type="button"
              onClick={() => onChange(l.code)}
              className={`rounded-full px-[clamp(0.65rem,1.4vw,1.25rem)] py-[clamp(0.3rem,0.9vh,0.55rem)] text-[clamp(0.75rem,1.8vh,1.15rem)] font-semibold transition ${
                active
                  ? 'bg-[var(--cw-accent-deep,#7C3AED)] text-white shadow-sm'
                  : 'bg-transparent text-[var(--cw-text-muted,#9CA3AF)] hover:opacity-80'
              }`}
            >
              {l.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
