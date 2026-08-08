export default function CompleteAdArea() {
  return (
    <div
      className="mt-6 flex aspect-[350/320] w-full items-center justify-center rounded-[36px] md:mt-8"
      style={{
        background:
          'repeating-linear-gradient(-45deg, #f3f1f8, #f3f1f8 12px, #ebe7f4 12px, #ebe7f4 24px)',
      }}
    >
      <span className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-gray-500 shadow-sm">
        광고 영역 ・ 350 x 320
      </span>
    </div>
  );
}
