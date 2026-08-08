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
    <section className="rounded-[36px] bg-white px-6 py-7 shadow-[0_24px_60px_rgba(120,100,180,0.12)] md:px-8 md:py-8">
      <div className="mb-6 flex items-center justify-between">
        <span className="text-[15px] font-medium text-gray-400 md:text-base">
          현재 내 순번
        </span>
        <button
          type="button"
          onClick={onRefresh}
          className="inline-flex items-center gap-1.5 rounded-full bg-[#efe8ff] px-3.5 py-1.5 text-sm font-semibold text-[#8b7cf6] transition hover:bg-[#e4d9ff]"
        >
          <span aria-hidden>↻</span>
          새로 고침
        </button>
      </div>

      {isPending ? (
        <>
          <div className="mb-3 flex items-end justify-center gap-1 leading-none">
            <strong className="text-[88px] font-extrabold tracking-tight text-[#1f1a33] md:text-[104px]">
              {order}
            </strong>
            <span className="mb-4 text-[32px] font-extrabold text-[#1f1a33] md:text-[36px]">
              번째
            </span>
          </div>
          <p className="mb-8 text-center text-[15px] text-gray-400 md:text-base">
            대기번호 <strong className="font-bold text-gray-500">{dailySeq}번</strong>
            <span className="mx-2 text-gray-300">|</span>
            인원 <strong className="font-bold text-gray-500">{totalCount}</strong>
          </p>
        </>
      ) : (
        <div className="mb-8 py-8 text-center text-3xl font-extrabold text-[#1f1a33]">
          {statusLabel}
        </div>
      )}

      {children}
    </section>
  );
}
