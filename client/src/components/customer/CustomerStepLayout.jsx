/**
 * 인원선택 / 약관동의 공통 3단 레이아웃
 * 헤더·하단: 스크롤 없음 / 컨텐츠: 필요 시만 세로 스크롤
 * 페이지 전체는 100dvh 안에 고정
 */
export default function CustomerStepLayout({ header, children, footer, className = '' }) {
  return (
    <div
      className={`mx-auto flex h-dvh max-h-dvh w-full max-w-[960px] flex-col overflow-hidden px-[clamp(1.25rem,3vw,3rem)] py-[clamp(0.6rem,1.8vh,1.25rem)] ${className}`}
    >
      <div className="shrink-0 overflow-hidden">{header}</div>
      <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain">
        {children}
      </div>
      {footer ? (
        <div className="shrink-0 overflow-hidden border-t border-[var(--cw-text-muted,#9ca3af)]/15 pt-[clamp(0.5rem,1.4vh,0.9rem)]">
          {footer}
        </div>
      ) : null}
    </div>
  );
}
