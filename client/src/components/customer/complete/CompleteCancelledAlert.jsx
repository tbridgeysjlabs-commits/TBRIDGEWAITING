const MSG = '해당 웨이팅은 취소되었습니다. 다음에 또 방문해 주세요.';

/** 취소 안내 — 닫기/확인 불가, 페이지에 고정 유지 */
export default function CompleteCancelledAlert({ open }) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="cancelled-alert-title"
    >
      <div
        className="relative w-full max-w-[360px] rounded-2xl bg-[var(--cw-panel,#fff)] p-5 shadow-xl sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          id="cancelled-alert-title"
          className="text-[17px] font-extrabold text-[var(--cw-text,#1f1a33)] sm:text-lg"
        >
          안내
        </h2>
        <p className="mt-3 break-keep text-[14px] leading-relaxed text-[var(--cw-text-soft,#4b4560)] sm:text-[15px]">
          {MSG}
        </p>
      </div>
    </div>
  );
}
