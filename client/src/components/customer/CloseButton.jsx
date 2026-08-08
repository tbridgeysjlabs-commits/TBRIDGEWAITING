/** 닫기 버튼을 cancelBtn.png 이미지로 렌더링 */
export default function CloseButton({ onClick, className = '', imgClassName = 'h-6 w-6' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="close"
      className={`inline-flex items-center justify-center ${className}`}
    >
      <img
        src="/cancelBtn.png"
        alt="닫기"
        className={`object-contain ${imgClassName}`}
      />
    </button>
  );
}
