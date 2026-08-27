/** 호출 후 입장 안내 — deadlineLabel은 서버 call_deadline_at 포맷 문자열 */
export default function CompleteCallNotice({ deadlineLabel }) {
  if (!deadlineLabel) return null;
  return (
    <p className="mb-6 break-keep rounded-2xl bg-[color-mix(in_srgb,var(--cw-accent,#7C3AED)_12%,transparent)] px-3 py-3 text-center text-[14px] font-bold leading-relaxed text-[var(--cw-accent-deep,#7C3AED)] sm:px-4 sm:text-[15px] md:text-base">
      입장해 주세요. {deadlineLabel}까지 입장하지 않을 시 웨이팅이 자동 취소됩니다.
    </p>
  );
}
