export default function CompleteFacilityInfo({
  name,
  imageUrl,
  registeredLabel,
  brandDisplayMode = 'image_text',
}) {
  const mode = brandDisplayMode === 'image' ? 'image' : 'image_text';

  return (
    <section className="mb-6 flex w-full max-w-full flex-col items-center text-center sm:mb-8">
      {mode === 'image' ? (
        <div className="mb-3 w-full max-w-[min(100%,320px)] overflow-hidden rounded-[4px] bg-[var(--cw-panel-alt,#e5e7eb)] aspect-[2.3/1] sm:mb-4">
          {imageUrl ? (
            <img src={imageUrl} alt={name || ''} className="h-full w-full object-cover" />
          ) : (
            <div className="grid h-full w-full place-items-center text-sm text-[var(--cw-text-muted,#9ca3af)]">
              img
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="mb-3 flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-[var(--cw-panel-alt,#e5e7eb)] text-sm text-[var(--cw-text-muted,#9ca3af)] sm:mb-4 sm:h-20 sm:w-20">
            {imageUrl ? (
              <img src={imageUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              'img'
            )}
          </div>
          <h1 className="max-w-full break-keep px-1 text-[22px] font-extrabold text-[var(--cw-text,#1f1a33)] sm:text-[28px] md:text-[32px]">
            {name}
          </h1>
        </>
      )}
      <p className="mt-2 max-w-full break-keep text-[13px] text-[var(--cw-text-muted,#9ca3af)] sm:text-[15px] md:text-base">
        {registeredLabel}
      </p>
    </section>
  );
}
