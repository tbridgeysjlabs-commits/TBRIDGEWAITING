export default function StepPageHeader({ title, onBack }) {
  return (
    <header className="relative mb-12 flex items-center justify-center">
      <button
        type="button"
        onClick={onBack}
        aria-label="back"
        className="absolute left-0 flex h-28 w-28 items-center justify-center text-[72px] leading-none text-[#222]"
      >
        ←
      </button>
      <h1 className="text-center text-[30px] font-extrabold text-[#1f1a33] xl:text-[36px]">
        {title}
      </h1>
    </header>
  );
}
