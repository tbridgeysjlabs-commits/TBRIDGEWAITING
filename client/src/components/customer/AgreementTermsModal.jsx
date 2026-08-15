/** 약관 상세 보기 모달 — [닫기] / [동의하기] */
export default function AgreementTermsModal({ title, body, onClose, onAgree }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-6"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="flex max-h-[min(80dvh,720px)] w-full max-w-[640px] flex-col overflow-hidden rounded-[28px] bg-[var(--cw-ghost-bg,#fff)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <header className="flex items-center justify-between border-b border-black/5 px-7 py-5">
          <h2 className="text-[22px] font-extrabold text-[var(--cw-text,#1f1a33)]">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-12 w-12 items-center justify-center rounded-full text-[28px] text-[var(--cw-text-muted,#9ca3af)] transition hover:bg-black/5"
            aria-label="닫기"
          >
            ×
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto bg-[var(--cw-terms-body-bg,#f7f7fb)] px-7 py-6 text-[17px] leading-relaxed text-[var(--cw-terms-body-fg,#6b7280)]">
          {(body || '').split('\n').map((line, i) => (
            <p key={i} className={line ? 'mb-2' : 'mb-3'}>
              {line || '\u00A0'}
            </p>
          ))}
        </div>
        <footer className="flex gap-3 border-t border-black/5 p-5">
          <button
            type="button"
            onClick={onClose}
            className="flex h-14 flex-1 items-center justify-center rounded-2xl border border-gray-200 bg-[var(--cw-ghost-bg,#fff)] text-[18px] font-bold text-[var(--cw-ghost-fg,#222)] transition hover:brightness-95"
          >
            닫기
          </button>
          <button
            type="button"
            onClick={onAgree}
            className="flex h-14 flex-1 items-center justify-center rounded-2xl bg-[var(--cw-button-bg,#5B21B6)] text-[18px] font-bold text-[var(--cw-button-fg,#fff)] transition hover:brightness-105"
          >
            동의하기
          </button>
        </footer>
      </div>
    </div>
  );
}
