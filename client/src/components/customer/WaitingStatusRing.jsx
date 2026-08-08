export default function WaitingStatusRing({ label, count, unit }) {
  return (
    <div className="relative mx-auto flex h-[330px] w-[330px] items-center justify-center xl:h-[390px] xl:w-[390px]">
      <div className="absolute inset-0 rounded-full border-[21px] border-[#e8e0ff] xl:border-[27px]" />
      <div className="absolute inset-[21px] rounded-full border border-[#f0ebff] xl:inset-[27px]" />
      <div className="relative z-10 flex flex-col items-center">
        <div className="mb-3 flex items-center gap-2 text-[21px] font-medium text-[#9b87f5]">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#9b87f5]" />
          {label}
        </div>
        <div className="flex items-end gap-2 leading-none">
          <strong className="text-[96px] font-extrabold tracking-tight text-[#2a2150] xl:text-[114px]">
            {count}
          </strong>
          <span className="mb-4 text-[30px] font-bold text-[#2a2150] xl:text-[36px]">
            {unit}
          </span>
        </div>
      </div>
    </div>
  );
}
