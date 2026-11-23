export function TableStatus({ title, hint, active, children }) {
  return <section className={'turnBar tableStatus' + (active ? ' myTurn' : '')} aria-label="حالة الدور">
    <div className="turnMessage" aria-live="polite">
      <h2><i aria-hidden="true"/><strong>{title}</strong></h2>
      <p>{hint}</p>
    </div>
    <div className="turnMeta">{children}{active && <a className="handLink" href="#playerHand">انتقل إلى يدك ↓</a>}</div>
  </section>;
}
