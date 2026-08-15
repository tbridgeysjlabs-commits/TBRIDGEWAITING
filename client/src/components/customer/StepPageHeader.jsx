/** 공통 뒤로가기 — 심플한 화살표, 터치 영역 48px+ */
export default function StepPageHeader({ title, onBack }) {
  return (
    <header className="relative mb-[clamp(0.35rem,1vh,0.75rem)] flex h-[clamp(3rem,7vh,4rem)] shrink-0 items-center justify-center overflow-hidden">
      <button
        type="button"
        onClick={onBack}
        aria-label="back"
        className="absolute left-0 flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--cw-panel-alt,#f7f5ff)] text-[var(--cw-text,#1f1a33)] transition active:scale-95"
      >
        <svg
          viewBox="0 0 24 24"
          className="h-7 w-7"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M15 18 9 12l6-6" />
        </svg>
      </button>
      <h1 className="px-14 text-center text-[clamp(1.15rem,2.8vh,1.75rem)] font-extrabold text-[var(--cw-text,#1f1a33)]">
        {title}
      </h1>
    </header>
  );
}
