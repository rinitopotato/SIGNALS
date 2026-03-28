export default function LoadingSpinner({ message = 'Loading…' }) {
  return (
    <div className="spinner-wrap">
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
        <div className="spinner" />
        <span style={{ color: 'var(--fg2)', fontSize: 12 }}>{message}</span>
      </div>
    </div>
  )
}
