// Centered loading spinner using the ORMS palette.
export default function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
      <div
        className="spin-slow h-11 w-11 rounded-full"
        style={{ border: '3px solid rgba(134,79,242,0.2)', borderTopColor: 'var(--primary-500)' }}
      />
      {label && <div className="text-sm text-text-400">{label}</div>}
    </div>
  );
}
