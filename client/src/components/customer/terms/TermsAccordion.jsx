import AgreementCheckbox from '../AgreementCheckbox';
import TermsAccordionItem from './TermsAccordionItem';

export default function TermsAccordion({
  items,
  agreements,
  openTermId,
  onToggleCheck,
  onToggleOpen,
  allAgreed,
  onToggleAll,
  agreeAllLabel,
  requiredTag,
  optionalTag,
}) {
  return (
    <div className="mt-[clamp(0.35rem,1.2vh,0.75rem)] flex flex-col gap-[clamp(0.5rem,1.4vh,0.85rem)] pb-[clamp(0.35rem,1.2vh,0.75rem)]">
      <div className="flex min-h-12 items-center gap-3 px-1 py-1">
        <AgreementCheckbox
          checked={allAgreed}
          onChange={onToggleAll}
          ariaLabel={agreeAllLabel}
        />
        <button
          type="button"
          className="min-h-11 flex-1 text-left text-[clamp(1rem,2.2vh,1.25rem)] font-extrabold text-[var(--cw-text,#1f1a33)]"
          onClick={() => onToggleAll(!allAgreed)}
        >
          {agreeAllLabel}
        </button>
      </div>

      <div className="h-px w-full shrink-0 bg-[var(--cw-text-muted,#9ca3af)]/25" />

      <div className="flex flex-col gap-[clamp(0.5rem,1.4vh,0.85rem)]">
        {items.map((item) => (
          <TermsAccordionItem
            key={item.id}
            id={item.id}
            title={item.title}
            required={item.required}
            requiredLabel={requiredTag}
            optionalLabel={optionalTag}
            body={item.body}
            checked={!!agreements[item.id]}
            open={openTermId === item.id}
            onToggleCheck={(v) => onToggleCheck(item.id, v)}
            onToggleOpen={onToggleOpen}
          />
        ))}
      </div>
    </div>
  );
}
