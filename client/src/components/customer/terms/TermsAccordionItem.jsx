import AgreementCheckbox from '../AgreementCheckbox';

/**
 * Single-open accordion item for terms.
 * Checkbox click toggles agreement only; header click toggles open.
 */
export default function TermsAccordionItem({
  id,
  title,
  required,
  requiredLabel,
  optionalLabel,
  body,
  checked,
  open,
  onToggleCheck,
  onToggleOpen,
}) {
  const tag = required ? requiredLabel : optionalLabel;

  return (
    <div
      className={`overflow-hidden rounded-[24px] bg-[var(--cw-card,#fff)] shadow-[0_8px_30px_rgba(120,100,180,0.08)] ${
        open ? 'ring-1 ring-[var(--cw-accent,#A78BFA)]/35' : ''
      }`}
    >
      <div className="flex min-h-14 items-stretch">
        <div
          className="flex min-h-14 w-14 shrink-0 items-center justify-center pl-2"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
          role="presentation"
        >
          <AgreementCheckbox
            checked={checked}
            onChange={onToggleCheck}
            ariaLabel={title}
          />
        </div>

        <button
          type="button"
          className="flex min-h-14 flex-1 items-center gap-3 py-3 pr-4 text-left"
          onClick={() => onToggleOpen(id)}
          aria-expanded={open}
        >
          <span className="min-w-0 flex-1 text-[17px] font-semibold leading-snug text-[var(--cw-text,#1f1a33)] xl:text-[18px]">
            <span
              className={`mr-1.5 font-bold ${
                required
                  ? 'text-[var(--cw-accent,#8b7cf6)]'
                  : 'text-[var(--cw-text-muted,#9ca3af)]'
              }`}
            >
              {tag}
            </span>
            {title}
          </span>
          <span
            className={`inline-flex shrink-0 text-[var(--cw-text-muted,#9ca3af)] transition-transform duration-200 ${
              open ? 'rotate-180' : ''
            }`}
            aria-hidden
          >
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </span>
        </button>
      </div>

      <div
        className={`grid transition-[grid-template-rows] duration-[220ms] ease-out ${
          open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        }`}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="terms-content mx-4 mb-4 max-h-[min(220px,28vh)] overflow-y-auto rounded-2xl bg-[var(--cw-terms-body-bg,#f7f7fb)] px-4 py-3 text-[clamp(0.85rem,1.8vh,1rem)] leading-relaxed text-[var(--cw-terms-body-fg,#6b7280)]">
            {(body || '').split('\n').map((line, i) => (
              <p key={i} className={line ? 'mb-1.5' : 'mb-2'}>
                {line || '\u00A0'}
              </p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
