export function WorkspaceSuspendedScreen() {
  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--main-bg)',
        padding: '2rem',
        textAlign: 'center',
      }}
    >
      {/* Icon */}
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: '50%',
          backgroundColor: 'var(--foreground, #64748b)1a',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '1.5rem',
          fontSize: '2rem',
        }}
      >
        ⏸
      </div>

      <h1
        style={{
          fontSize: '1.375rem',
          fontWeight: 700,
          color: 'var(--text-strong)',
          marginBottom: '0.75rem',
          letterSpacing: '-0.02em',
        }}
      >
        Workspace paused
      </h1>

      <p
        style={{
          fontSize: '0.9375rem',
          color: 'var(--muted-text)',
          maxWidth: 380,
          lineHeight: 1.6,
          marginBottom: '2rem',
        }}
      >
        This workspace has been paused. Talk to your Admin to continue.
      </p>

      <a
        href="/"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          height: '2.25rem',
          padding: '0 1.25rem',
          borderRadius: 8,
          border: '0.5px solid var(--card-border-color)',
          backgroundColor: 'var(--card-bg)',
          color: 'var(--text-strong)',
          fontSize: '0.8125rem',
          fontWeight: 600,
          textDecoration: 'none',
          transition: 'background 0.15s',
        }}
      >
        ← Back to home
      </a>
    </div>
  )
}
