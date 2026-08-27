export default function CompleteStoreNotice({ text }) {
  const body = String(text || '').trim();
  if (!body) return null;
  return (
    <div className="mt-5 w-full rounded-2xl bg-[#eceaf3] px-5 py-4 text-[clamp(0.9rem,1.9vh,1.05rem)] leading-relaxed text-[#4b4560] whitespace-pre-wrap">
      {body}
    </div>
  );
}
