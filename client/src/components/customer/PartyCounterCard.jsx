export default function PartyCounterCard({ name, value, onChange }) {
  return (
    <div className="flex items-center justify-between rounded-[36px] bg-white px-9 py-[30px] shadow-[0_8px_30px_rgba(120,100,180,0.08)]">
      <span className="text-[27px] font-extrabold text-[#1f1a33]">{name}</span>
      <div className="flex items-center gap-6">
        <button
          type="button"
          onClick={() => onChange(-1)}
          disabled={value <= 0}
          className="flex h-[66px] w-[66px] items-center justify-center rounded-full bg-[#efeafc] text-[30px] font-bold text-[#5a4b8a] transition enabled:hover:bg-[#e4dcf8] disabled:opacity-40"
        >
          −
        </button>
        <span className="min-w-12 text-center text-[36px] font-extrabold text-[#1f1a33]">
          {value}
        </span>
        <button
          type="button"
          onClick={() => onChange(1)}
          className="flex h-[66px] w-[66px] items-center justify-center rounded-full bg-[#efeafc] text-[30px] font-bold text-[#5a4b8a] transition hover:bg-[#e4dcf8]"
        >
          +
        </button>
      </div>
    </div>
  );
}
