import { useEffect, useState } from 'react';
import { WEEK_LABELS } from '../../hooks/useI18n';

function parts(now = new Date(), lang = 'ko') {
  const week = WEEK_LABELS[lang] || WEEK_LABELS.ko;
  const yy = String(now.getFullYear()).slice(2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const mi = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  return {
    dateLabel: `${yy}.${mm}.${dd} (${week[now.getDay()]})`,
    hh,
    mi,
    ss,
  };
}

export default function TimeInfoCard({ label = '지금 시간', lang = 'ko' }) {
  const [clock, setClock] = useState(() => parts(new Date(), lang));

  useEffect(() => {
    setClock(parts(new Date(), lang));
    const id = setInterval(() => setClock(parts(new Date(), lang)), 1000);
    return () => clearInterval(id);
  }, [lang]);

  return (
    <div className="flex w-full items-center justify-center gap-[clamp(0.75rem,2vw,1.5rem)] rounded-[clamp(0.75rem,1.5vh,1.5rem)] bg-[var(--cw-panel,#ffffff)] px-[clamp(0.75rem,2vw,1.5rem)] py-[clamp(0.5rem,1.4vh,1rem)] shadow-[0_8px_30px_rgba(120,100,180,0.08)]">
      <div className="shrink-0 whitespace-nowrap text-[clamp(0.7rem,1.5vh,0.95rem)] text-[var(--cw-text-muted,#9ca3af)]">
        {label}{' '}
        <span className="font-semibold text-[var(--cw-text,#374151)]">{clock.dateLabel}</span>
      </div>
      <div className="flex items-end gap-1 whitespace-nowrap">
        <span className="text-[clamp(1.35rem,3.5vh,2.5rem)] font-extrabold tracking-tight text-[var(--cw-accent,#8b7cf6)]">
          {clock.hh}:{clock.mi}
        </span>
        <span className="mb-0.5 text-[clamp(0.85rem,2vh,1.25rem)] font-bold text-[var(--cw-accent,#8b7cf6)]">
          {clock.ss}
        </span>
      </div>
    </div>
  );
}
