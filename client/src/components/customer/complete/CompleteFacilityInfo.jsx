export default function CompleteFacilityInfo({ name, imageUrl, registeredLabel }) {
  return (
    <section className="mb-8 flex flex-col items-center text-center">
      <div className="mb-4 flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-gray-200 text-sm text-gray-400">
        {imageUrl ? (
          <img src={imageUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          'img'
        )}
      </div>
      <h1 className="text-[28px] font-extrabold text-[#1f1a33] md:text-[32px]">{name}</h1>
      <p className="mt-2 text-[15px] text-gray-400 md:text-base">{registeredLabel}</p>
    </section>
  );
}
