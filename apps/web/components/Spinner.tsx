// Ported from frontend/src/components/Spinner.jsx.
export default function Spinner({ label }: { label?: string }) {
  return (
    <div style={{ display: 'flex', minHeight: '60vh', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '0.7rem' }}>
      <div className="spin-slow" style={{ width: 42, height: 42, borderRadius: '50%', border: '3px solid rgba(124,58,237,0.2)', borderTopColor: 'var(--accent)' }} />
      {label && <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{label}</div>}
    </div>
  );
}
