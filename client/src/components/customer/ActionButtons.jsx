export function PrimaryButton({ children, className = '', disabled, ...props }) {
  return (
    <button
      type="button"
      disabled={disabled}
      className={`rounded-2xl bg-gradient-to-r from-[#b19fff] to-[#c8baff] px-6 py-4 text-base font-bold text-white shadow-[0_10px_24px_rgba(177,159,255,0.45)] transition enabled:hover:brightness-105 enabled:active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-45 ${className}`}
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
      className={`rounded-2xl border border-gray-200 bg-white px-6 py-4 text-base font-bold text-[#222] shadow-sm transition hover:bg-gray-50 active:scale-[0.99] ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
