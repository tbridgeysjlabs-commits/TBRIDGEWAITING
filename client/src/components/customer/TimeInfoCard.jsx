import { useEffect, useState } from 'react';

const WEEK = ['일', '월', '화', '수', '목', '금', '토'];

function parts(now = new Date()) {
  const yy = String(now.getFullYear()).slice(2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const mi = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  return {
    dateLabel: `${yy}.${mm}.${dd} (${WEEK[now.getDay()]})`,
    hh,
    mi,
    ss,
  };
}

export default function TimeInfoCard({ label = '지금 시간' }) {
  const [clock, setClock] = useState(() => parts());

  useEffect(() => {
    const id = setInterval(() => setClock(parts()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex w-full items-center justify-between gap-4 rounded-3xl bg-white px-8 py-6 shadow-[0_8px_30px_rgba(120,100,180,0.08)]">
      <div className="shrink-0 whitespace-nowrap text-base text-gray-400">
        {label} <span className="font-semibold text-gray-700">{clock.dateLabel}</span>
      </div>
      <div className="flex items-end gap-1.5 whitespace-nowrap">
        <span className="text-5xl font-extrabold tracking-tight text-[#8b7cf6]">
          {clock.hh}:{clock.mi}
        </span>
        <span className="mb-1 text-2xl font-bold text-[#8b7cf6]">{clock.ss}</span>
      </div>
    </div>
  );
}
