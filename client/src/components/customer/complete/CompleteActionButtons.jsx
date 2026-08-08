export default function CompleteActionButtons({
  showPostpone,
  loading,
  canPostpone,
  onCancel,
  onPostpone,
}) {
  return (
    <div className={`mt-2 grid gap-3 ${showPostpone ? 'grid-cols-2' : 'grid-cols-1'}`}>
      <button
        type="button"
        disabled={loading}
        onClick={onCancel}
        className="rounded-2xl border border-gray-200 bg-white px-4 py-4 text-[15px] font-bold text-[#222] shadow-sm transition hover:bg-gray-50 disabled:opacity-50 md:text-base"
      >
        대기 등록 취소
      </button>
      {showPostpone && (
        <button
          type="button"
          disabled={loading || !canPostpone}
          onClick={onPostpone}
          className="rounded-2xl bg-gradient-to-r from-[#8b7cf6] to-[#a78bfa] px-4 py-4 text-[15px] font-bold text-white shadow-[0_10px_24px_rgba(139,124,246,0.45)] transition enabled:hover:brightness-105 disabled:opacity-45 md:text-base"
        >
          미루기
        </button>
      )}
    </div>
  );
}
