export default function AgreementCard({ title, required, checked, onChange, body }) {
  return (
    <section className="rounded-[36px] bg-[var(--cw-ghost-bg,#ffffff)] p-[30px] shadow-[0_8px_30px_rgba(120,100,180,0.08)] xl:p-[36px]">
      <div className="mb-[18px] flex items-center justify-between gap-4">
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <h2 className="text-[24px] font-extrabold text-[var(--cw-text,#1f1a33)] xl:text-[27px]">
            {title}
          </h2>
          <span
            className={`rounded-full px-3.5 py-1 text-[15px] font-bold ${
              required
                ? 'bg-[#efe8ff] text-[#8b7cf6]'
                : 'bg-gray-100 text-gray-500'
            }`}
          >
            {required ? '필수' : '선택'}
          </span>
        </div>
        <label className="flex shrink-0 cursor-pointer items-center gap-3">
          <span className="text-[18px] font-semibold text-[var(--cw-text-soft,#6b7280)]">
            동의
          </span>
          <span
            className={`relative flex h-9 w-9 items-center justify-center rounded-lg border-2 transition ${
              checked
                ? 'border-[#8b7cf6] bg-[#8b7cf6]'
                : 'border-gray-300 bg-white'
            }`}
          >
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => onChange(e.target.checked)}
              className="absolute inset-0 cursor-pointer opacity-0"
            />
            {checked && (
              <svg
                viewBox="0 0 16 16"
                className="h-5 w-5 text-white"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M3 8.2 6.2 11.4 13 4.2" />
              </svg>
            )}
          </span>
        </label>
      </div>
      <div className="max-h-[168px] overflow-y-auto rounded-3xl bg-[#f7f7fb] px-6 py-[18px] text-[18px] leading-relaxed text-gray-500">
        {(body || '').split('\n').map((line, i) => (
          <p key={i} className="m-0">
            {line}
          </p>
        ))}
      </div>
    </section>
  );
}
