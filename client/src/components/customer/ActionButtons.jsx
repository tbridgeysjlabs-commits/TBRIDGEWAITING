export function PrimaryButton({ children, className = '', disabled, ...props }) {
  return (
    <button
      type="button"
      disabled={disabled}
      className={`rounded-2xl px-6 py-4 text-base font-bold transition enabled:active:scale-[0.99] disabled:cursor-not-allowed disabled:shadow-none ${
        disabled
          ? 'bg-[var(--cw-disabled-bg,#2A2A36)] text-[var(--cw-disabled-fg,#6B7280)] shadow-none'
          : 'bg-gradient-to-r from-[var(--cw-button-from,#A78BFA)] to-[var(--cw-button-to,#7C3AED)] text-[var(--cw-button-fg,#fff)] shadow-[0_10px_28px_rgba(124,58,237,0.35)] enabled:hover:brightness-110'
      } ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function GhostButton({ children, className = '', ...props }) {
  return (
    <button
      type="button"
      className={`rounded-2xl border border-[var(--cw-border,rgba(255,255,255,0.12))] bg-[var(--cw-ghost-bg,#1A1A24)] px-6 py-4 text-base font-bold text-[var(--cw-ghost-fg,#fff)] transition hover:brightness-110 active:scale-[0.99] ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
