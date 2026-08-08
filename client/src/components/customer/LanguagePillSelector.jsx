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
}) {
  const items = LANGS.filter((l) => enabled.includes(l.code));
  return (
    <div className="flex w-full justify-center">
      <div className="inline-flex items-center gap-1.5 rounded-full bg-white/70 p-1.5 shadow-sm backdrop-blur-sm">
        {items.map((l) => {
          const active = lang === l.code;
          return (
            <button
              key={l.code}
              type="button"
              onClick={() => onChange(l.code)}
              className={`rounded-full px-[21px] py-[9px] text-[21px] font-semibold transition ${
                active
                  ? 'bg-[#1a1a1a] text-white shadow-sm'
                  : 'bg-transparent text-gray-400 hover:text-gray-600'
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
