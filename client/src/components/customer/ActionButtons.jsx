export function PrimaryButton({ children, className = '', disabled, ...props }) {
  return (
    <button
      type="button"
      disabled={disabled}
      className={`rounded-2xl bg-gradient-to-r from-[#b19fff] to-[#c8baff] px-6 py-4 text-base font-bold text-white shadow-[0_10px_24px_rgba(177,159,255,0.45)] transition enabled:hover:brightness-105 enabled:active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-none disabled:from-gray-300 disabled:to-gray-300 disabled:bg-gray-300 disabled:text-gray-500 disabled:opacity-100 disabled:shadow-none ${className}`}
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
      className={`rounded-2xl border border-gray-200 bg-[var(--cw-ghost-bg,#ffffff)] px-6 py-4 text-base font-bold text-[var(--cw-ghost-fg,#222)] shadow-sm transition hover:brightness-95 active:scale-[0.99] ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
