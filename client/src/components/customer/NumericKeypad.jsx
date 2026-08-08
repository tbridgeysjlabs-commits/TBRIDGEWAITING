const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'reset', '0', 'back'];

export default function NumericKeypad({ onKey }) {
  return (
    <div className="grid grid-cols-3 gap-[27px]">
      {KEYS.map((key) => (
        <button
          key={key}
          type="button"
          onClick={() => onKey(key)}
          className="flex h-[144px] items-center justify-center rounded-[36px] bg-[#f4f5f9] text-[63px] font-bold text-[#2d2d2d] transition hover:bg-[#eceef5] active:scale-[0.98] xl:h-[162px]"
        >
          {key === 'reset' ? (
            <span className="text-[54px] text-gray-500" aria-label="reset">
              ⟳
            </span>
          ) : key === 'back' ? (
            <span className="text-[45px] text-gray-500" aria-label="backspace">
              ⌫
            </span>
          ) : (
            key
          )}
        </button>
      ))}
    </div>
  );
}
