/** 약관 체크박스 — 기존 34px 대비 약 30% 축소 */
export default function AgreementCheckbox({ checked, onChange, ariaLabel }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={() => onChange(!checked)}
      className={`relative flex h-6 w-6 shrink-0 items-center justify-center rounded-[7px] border-2 transition ${
        checked
          ? 'border-[var(--cw-accent,#8b7cf6)] bg-[var(--cw-accent,#8b7cf6)]'
          : 'border-gray-300 bg-[var(--cw-check-bg,transparent)]'
      }`}
    >
      {checked && (
        <svg
          viewBox="0 0 16 16"
          className="h-3 w-3 text-white"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M3 8.2 6.2 11.4 13 4.2" />
        </svg>
      )}
    </button>
  );
}
