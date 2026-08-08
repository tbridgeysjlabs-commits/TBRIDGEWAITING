export default function TBridgeLogo({ className = '', alt = 'T BRIDGE' }) {
  return (
    <img
      src="/tbridge_logo.png"
      alt={alt}
      className={`select-none object-contain ${className}`}
    />
  );
}
