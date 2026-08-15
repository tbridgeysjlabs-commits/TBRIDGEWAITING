export default function CompleteActionButtons({
  showPostpone,
  loading,
  canPostpone,
  onCancel,
  onPostpone,
}) {
  return (
    <div className={`mt-2 grid w-full max-w-full gap-3 ${showPostpone ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}>
      <button
        type="button"
        disabled={loading}
        onClick={onCancel}
        className="rounded-2xl border border-gray-200 bg-[var(--cw-panel,#fff)] px-3 py-3.5 text-[14px] font-bold text-[var(--cw-text,#222)] shadow-sm transition hover:brightness-95 disabled:opacity-50 sm:px-4 sm:py-4 sm:text-[15px] md:text-base"
      >
        대기 등록 취소
      </button>
      {showPostpone && (
        <button
          type="button"
          disabled={loading || !canPostpone}
          onClick={onPostpone}
          className="rounded-2xl bg-[var(--cw-button-bg,#8b7cf6)] px-3 py-3.5 text-[14px] font-bold text-[var(--cw-button-fg,#fff)] shadow-[0_10px_24px_rgba(139,124,246,0.45)] transition enabled:hover:brightness-105 disabled:opacity-45 sm:px-4 sm:py-4 sm:text-[15px] md:text-base"
        >
          미루기
        </button>
      )}
    </div>
  );
}
