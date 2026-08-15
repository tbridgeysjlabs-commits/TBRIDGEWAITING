/**
 * 하단 T BRIDGE 로고.
 * enableFullscreenTap 시 더블탭으로 전체화면 토글(부모에서 핸들러 전달).
 */
export default function TBridgeLogo({
  className = '',
  alt = 'T BRIDGE',
  onPointerUp,
  onClick,
  enableFullscreenTap = false,
}) {
  return (
    <img
      src="/tbridge_logo.png"
      alt={alt}
      draggable={false}
      className={`select-none object-contain ${enableFullscreenTap ? 'cursor-pointer touch-manipulation' : ''} ${className}`}
      onPointerUp={onPointerUp}
      onClick={onClick}
    />
  );
}
