import AdminCloseIcon from '../../admin/AdminCloseIcon';

const MSG = '해당 웨이팅은 취소되었습니다. 다음에 또 방문해 주세요.';

export default function CompleteCancelledAlert({ open, onConfirm }) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="cancelled-alert-title"
    >
      <div className="relative w-full max-w-[360px] rounded-2xl bg-[var(--cw-panel,#fff)] p-5 shadow-xl sm:p-6">
        <button
          type="button"
          className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full text-[var(--cw-text-muted,#9ca3af)] hover:bg-black/5"
          aria-label="닫기"
          onClick={onConfirm}
        >
          <AdminCloseIcon />
        </button>
        <h2
          id="cancelled-alert-title"
          className="pr-8 text-[17px] font-extrabold text-[var(--cw-text,#1f1a33)] sm:text-lg"
        >
          안내
        </h2>
        <p className="mt-3 break-keep text-[14px] leading-relaxed text-[var(--cw-text-soft,#4b4560)] sm:text-[15px]">
          {MSG}
        </p>
        <button
          type="button"
          className="mt-5 w-full rounded-xl bg-[var(--cw-button-bg,#7C3AED)] py-3 text-[15px] font-bold text-[var(--cw-button-fg,#fff)]"
          onClick={onConfirm}
        >
          확인
        </button>
      </div>
    </div>
  );
}
