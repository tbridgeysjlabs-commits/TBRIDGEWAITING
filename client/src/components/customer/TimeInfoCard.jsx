import { useEffect, useState } from 'react';
import { WEEK_LABELS } from '../../hooks/useI18n';
import { toKstClockParts } from '../../utils/datetime.js';

function parts(now = new Date(), lang = 'ko') {
  const week = WEEK_LABELS[lang] || WEEK_LABELS.ko;
  const p = toKstClockParts(now);
  if (!p) {
    return { dateLabel: '--.--.-- (-)', hh: '--', mi: '--', ss: '--' };
  }
  return {
    dateLabel: `${p.yy}.${p.mm}.${p.dd} (${week[p.weekday]})`,
    hh: p.hh,
    mi: p.mi,
    ss: p.ss,
  };
}

export default function TimeInfoCard({ label = '지금 시간', lang = 'ko', compact = false }) {
  const [clock, setClock] = useState(() => parts(new Date(), lang));

  useEffect(() => {
    setClock(parts(new Date(), lang));
    const id = setInterval(() => setClock(parts(new Date(), lang)), 1000);
    return () => clearInterval(id);
  }, [lang]);

  if (compact) {
    return (
      <div className="text-[clamp(0.75rem,1.55vh,0.95rem)] font-semibold text-[var(--cw-accent,#7C3AED)]">
        {label} {clock.dateLabel} {clock.hh}:{clock.mi}
      </div>
    );
  }

  return (
    <div className="flex w-full items-center justify-center gap-[clamp(0.75rem,2vw,1.5rem)] rounded-[clamp(0.75rem,1.5vh,1.5rem)] border border-[var(--cw-border,rgba(255,255,255,0.08))] bg-[var(--cw-panel,#1A1A24)] px-[clamp(0.75rem,2vw,1.5rem)] py-[clamp(0.5rem,1.4vh,1rem)]">
      <div className="shrink-0 whitespace-nowrap text-[clamp(0.7rem,1.5vh,0.95rem)] text-[var(--cw-text-muted,#9CA3AF)]">
        {label}{' '}
        <span className="font-semibold text-[var(--cw-text,#fff)]">{clock.dateLabel}</span>
      </div>
      <div className="flex items-end gap-1 whitespace-nowrap">
        <span className="text-[clamp(1.35rem,3.5vh,2.5rem)] font-extrabold tracking-tight text-[var(--cw-accent,#A78BFA)]">
          {clock.hh}:{clock.mi}
        </span>
        <span className="mb-0.5 text-[clamp(0.85rem,2vh,1.25rem)] font-bold text-[var(--cw-accent,#A78BFA)]">
          {clock.ss}
        </span>
      </div>
    </div>
  );
}
