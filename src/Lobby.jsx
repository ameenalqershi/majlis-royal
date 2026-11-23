import { useMemo, useRef } from 'react';
import { inviteImage } from './core/invite';

export function Seats({ table }) {
  const { kind, capacity, players, seat, game } = table;
  return <ul className="seats">{Array.from({ length: capacity }, (_, i) =>
    <li key={i} className={i === seat ? 'taken you' : players[i] ? 'taken' : 'empty'}>
      {kind === 'mercy' ? <span className="seatNo">{i + 1}</span> : <b className={'dot s' + i}/>}
      <strong>{players[i] || 'مقعد شاغر'}{i === seat && ' · أنت'}</strong>
      {kind !== 'mercy' && <small>{TableRules.colors[i]} · فريق {1 + i % (capacity / 2)}</small>}
      {game?.turn === i && game.winner === null && <small>عليه الدور</small>}
    </li>)}</ul>;
}

export function Lobby({ table, addresses, invite, setInvite, hostLocal, start, busy, notify }) {
  const input = useRef(null);
  const link = invite + '/?room=' + table.code;
  const image = useMemo(() => ['127.0.0.1', 'localhost'].includes(new URL(link).hostname) ? null : inviteImage(link), [link]);
  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      notify('نُسخ الرابط');
    } catch {
      input.current.select();
      notify(document.execCommand('copy') ? 'نُسخ الرابط' : 'حدّد الرابط وانسخه');
    }
  }
  return <section className="lobby">
    <div><h2>مقاعد الطاولة</h2><p>{table.players.length} من {table.capacity} لاعبين · {table.kind === 'mercy' ? 'لعب فردي' : 'يجلس الشريكان متقابلين'}</p></div>
    <Seats table={table}/>
    <div className="inviteBox" id="inviteBox">
      <h3>دعوة اللاعبين</h3>
      {image && <img id="inviteQR" src={image} alt="رمز الانضمام إلى الطاولة"/>}
      <code>{table.code}</code>
      <p>{image ? 'امسح الرمز من جهاز متصل بشبكة المضيف.' : 'اتصل بشبكة محلية لمشاركة الطاولة.'}</p>
      {hostLocal && addresses.length > 1 && <label className="field">عنوان شبكة الدعوة
        <select dir="ltr" value={invite} onChange={e => setInvite(e.target.value)}>{addresses.map(url => <option key={url}>{url}</option>)}</select>
      </label>}
      <label className="field">رابط الدعوة<input dir="ltr" ref={input} id="inviteLink" readOnly value={link}/></label>
      <button className="light" id="copy" onClick={copy}>نسخ الرابط</button>
    </div>
    {table.seat === 0 && <button className="gold" id="start" disabled={busy || table.players.length !== table.capacity} onClick={start}>بدء المباراة</button>}
  </section>;
}
