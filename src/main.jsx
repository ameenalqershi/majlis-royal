import { useCallback, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { useTable, request } from './core/useTable';
import { Lounge } from './Lounge';
import { Lobby } from './Lobby';
import { Entry } from './Entry';
import { Dialog } from './Dialog';
import { Scanner } from './Scanner';
import { JackarooGuide, MercyGuide } from './Guides';
import { Jackaroo } from './jackaroo/Jackaroo';
import { Mercy } from './mercy/Mercy';
import './styles/index.css';

const initialInvite = new URLSearchParams(location.search).get('room')?.toUpperCase();
const hostLocal = ['127.0.0.1', 'localhost'].includes(location.hostname);

function App() {
  const [message, setMessage] = useState('');
  const timer = useRef(null);
  const notify = useCallback(text => {
    setMessage(text);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setMessage(''), 4000);
  }, []);
  const { seat, state, open, setOpen, enter, act, busy } = useTable(initialInvite, notify);
  const [dialog, setDialog] = useState(() => initialInvite && initialInvite !== seat?.code ? { type: 'join' } : null);
  const [addresses, setAddresses] = useState([]);
  const [invite, setInvite] = useState(location.origin);
  useEffect(() => {
    const controller = new AbortController();
    request('network', {}, controller.signal).then(({ urls }) => {
      setAddresses(urls);
      if (hostLocal && urls.length) setInvite(urls[0]);
    }).catch(() => {});
    return () => { controller.abort(); clearTimeout(timer.current); };
  }, []);
  const close = () => setDialog(null);
  const guide = (kind, initial = 0) => setDialog({ type: 'guide', kind, initial });
  function entry(type, kind = 'jackaroo') {
    if (seat && (!location.search || initialInvite === seat.code)) setOpen(true);
    else setDialog({ type, kind });
  }
  const host = state?.seat === 0;
  return <>
    <header><div className="bar">
      <a className="brand" href="/" onClick={e => { e.preventDefault(); setOpen(false); }}><i className="seal">✥</i><span>مَجلس<small>MAJLIS</small></span></a>
      <nav><button id="home" aria-current={open ? undefined : 'page'} onClick={() => setOpen(false)}>صالة الألعاب</button>
        <button id="guideMenu" onClick={() => guide(open && state ? state.kind : null)}>دليل اللعب</button></nav>
      <button className="network" id="network" onClick={() => setDialog({ type: 'network' })}><i/> الشبكة المحلية</button>
    </div></header>
    {!open ? <Lounge resume={!!seat} onEntry={entry} onGuide={guide}/> : !state ?
      <main id="room"><p role="status">جارٍ الاتصال بالطاولة…</p></main> :
      <main id="room" data-revision={state.rev}>
        <div className="roomHead"><h2>{state.kind === 'mercy' ? 'أونو لا ترحم' : 'جاكارو المجلس'}</h2><code className="roomCode">{state.code}</code>
          <button className="light" onClick={() => guide(state.kind, 1)}>دليل الأوراق</button></div>
        {!state.game ? <Lobby table={state} addresses={addresses} invite={invite} setInvite={setInvite} hostLocal={hostLocal} busy={busy} start={() => act('start')} notify={notify}/> :
          state.kind === 'mercy' ? <Mercy table={state} act={act} busy={busy}/> : <Jackaroo key={state.rev} table={state} act={act} busy={busy}/>}
        {(host || !state.game || state.game.winner !== null) && <div className="roomExit"><button id="exitRoom" onClick={() => setDialog({ type: 'exit' })}>{host ? 'إنهاء الطاولة' : 'مغادرة المقعد'}</button></div>}
      </main>}
    <footer><span>✥ &nbsp; مَجلس</span><small>صالة الألعاب المحلية</small></footer>
    {dialog && <Dialog onClose={close} label={dialog.type === 'guide' ? 'دليل اللعب' : 'مجلس'}>
      {['create','join'].includes(dialog.type) && <Entry mode={dialog.type} kind={dialog.kind} code={initialInvite} enter={enter} onClose={close} onScan={() => setDialog({ type: 'scan' })}/>}
      {dialog.type === 'scan' && <Scanner/>}
      {dialog.type === 'guide' && (dialog.kind === 'mercy' ? <MercyGuide/> : dialog.kind === 'jackaroo' ? <JackarooGuide initial={dialog.initial}/> :
        <><h2>دليل اللعب</h2><div className="actions"><button className="gold" onClick={() => guide('mercy')}>أونو لا ترحم</button><button className="light" onClick={() => guide('jackaroo')}>جاكارو</button></div></>)}
      {dialog.type === 'network' && <><h2>الشبكة المحلية</h2><p>فعّل نقطة اتصال الهاتف المضيف أو اتصلوا بشبكة واي فاي واحدة. افتح الطاولة ثم شارك رابط الدعوة مع بقية اللاعبين. أبقِ المضيف مفتوحًا طوال المباراة.</p><p dir="ltr">{invite}</p></>}
      {dialog.type === 'exit' && <><h2>{host ? 'إنهاء الطاولة؟' : 'مغادرة المقعد؟'}</h2>
        <p>{host ? 'سيُغلق رابط الدعوة وتنتهي جلسة جميع اللاعبين.' : 'سيصبح مقعدك متاحًا للاعب آخر.'}</p>
        <button className="danger" id="confirmExit" disabled={busy} onClick={async () => { if (await act('leave')) close(); }}>تأكيد</button></>}
    </Dialog>}
    <div id="toast" role="status">{message}</div>
  </>;
}

createRoot(document.getElementById('root')).render(<App/>);
