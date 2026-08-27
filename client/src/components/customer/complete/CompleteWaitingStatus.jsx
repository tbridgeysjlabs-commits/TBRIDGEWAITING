export default function CompleteWaitingStatus({
  order,
  dailySeq,
  totalCount,
  statusLabel,
  isPending,
  onRefresh,
  children,
}) {
  return (
    <section className="w-full max-w-full overflow-hidden rounded-[28px] bg-[var(--cw-panel,#fff)] px-4 py-6 shadow-[0_24px_60px_rgba(120,100,180,0.12)] sm:rounded-[36px] sm:px-6 sm:py-7 md:px-8 md:py-8">
      <div className="mb-6 flex items-center justify-between gap-2">
        <span className="text-[15px] font-medium text-[var(--cw-text-muted,#9ca3af)] md:text-base">
          현재 내 순번
        </span>
        <button
          type="button"
          onClick={onRefresh}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#efe8ff] px-3 py-1.5 text-sm font-semibold text-[#8b7cf6] transition hover:bg-[#e4d9ff]"
        >
          <span aria-hidden>↻</span>
          새로 고침
        </button>
      </div>

      {isPending ? (
        <>
          <div className="mb-3 flex items-end justify-center gap-1 leading-none">
            <strong className="text-[clamp(3.5rem,18vw,6.5rem)] font-extrabold tracking-tight text-[var(--cw-text,#1f1a33)]">
              {order}
            </strong>
            <span className="mb-[0.6rem] text-[clamp(1.25rem,6vw,2.25rem)] font-extrabold text-[var(--cw-text,#1f1a33)]">
              번째
            </span>
          </div>
          <p className="mb-4 break-keep text-center text-[14px] text-[var(--cw-text-muted,#9ca3af)] sm:mb-5 sm:text-[15px] md:text-base">
            대기번호 <strong className="font-bold text-[var(--cw-text-soft,#6b7280)]">{dailySeq}번</strong>
            <span className="mx-2 text-gray-300">|</span>
            인원 <strong className="font-bold text-[var(--cw-text-soft,#6b7280)]">{totalCount}</strong>
          </p>
        </>
      ) : (
        <div className="mb-8 py-8 text-center text-2xl font-extrabold text-[var(--cw-text,#1f1a33)] sm:text-3xl">
          {statusLabel}
        </div>
      )}

      {children}
    </section>
  );
}
