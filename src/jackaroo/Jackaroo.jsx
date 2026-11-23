import { TableRules } from '../../core/table-rules.js';
import { useEffect, useRef, useState } from 'react';
import { TableStatus } from '../TableStatus';
import { Seats } from '../Lobby';
import { drawBoard } from './board';

const cardEffects = {
  A: 'الآس ينزّل حجرًا أو يحرّكه خطوة أو ١١ خطوة.',
  K: 'الملك ينزّل حجرًا أو يحرّكه ١٣ خطوة.',
  Q: 'الملكة تحرّك الحجر ١٢ خطوة.',
  J: 'الشاب يبادل حجرين من لونين مختلفين على المسار.',
  4: 'الأربعة تعيد الحجر أربع خطوات إلى الخلف.',
  5: 'يمكنك تحريك حجر من لون آخر خمس خطوات.',
  7: 'حرّك حجرًا سبع خطوات، أو قسّمها بين حجرين.',
};

export function Jackaroo({ table, act, busy }) {
  const { game, capacity, seat, players, rev } = table;
  const [card, setCard] = useState(() => game.moves.findIndex(m => m.length));
  const [choice, setChoice] = useState(0);
  const canvas = useRef(null);
  const moves = game.moves[card] || [];
  const move = moves[choice];
  useEffect(() => {
    drawBoard(canvas.current, game.board, move?.pieces, move?.targets, game.last);
  }, [game, move]);

  function selectMarble(event) {
    const el = canvas.current;
    const rect = el.getBoundingClientRect();
    const x = (event.clientX - rect.left) * 800 / rect.width;
    const y = (event.clientY - rect.top) * 800 / rect.height;
    const id = el.marbleCenters.findIndex(([cx, cy]) => Math.hypot(cx - x, cy - y) < 19);
    const index = moves.findIndex(m => m.pieces[0] === id);
    if (index >= 0) setChoice(index);
  }

  const colors = TableRules.colors;
  const title = game.winner !== null ? 'فوز ' + colors[game.winner] + ' و' + colors[TableRules.partner(game.winner, capacity)]
    : game.turn === seat ? 'حان دورك' : 'دور ' + players[game.turn];
  const mine = game.turn === seat && game.winner === null;
  const burn = mine && move?.pieces.length === 0;
  const partner = players[TableRules.partner(seat, capacity)];
  const hint = game.winner !== null ? 'اكتملت أحجار الفريق في الأمان.' : !mine ? 'تابع حركة الأحجار حتى يصلك الدور.'
    : burn ? 'تعذّرت حركات يدك. اختر الورقة التي تريد حرقها ثم أكّد.'
    : 'اختر ورقة وراجع وجهة الحجر على اللوح قبل التأكيد.';
  return <div className="arena">
    <TableStatus title={title} hint={hint} active={mine}>
      <span><i className={'dot s' + seat}/>{colors[seat]}</span><span>شريكك · {partner}</span>
    </TableStatus>
    <figure className="boardFrame">
      <figcaption><strong>لوحة اللعب</strong><span>التوزيعة {game.round}</span></figcaption>
      <canvas ref={canvas} className="board" id="board" aria-label="لوحة جاكارو" onClick={selectMarble}/>
      <div className="boardLegend"><span><i/>الحجر المحدّد</span><span><i/>الوجهة</span></div>
    </figure>
    <section id="playerHand" tabIndex={-1} className="panel gameDock">
      <div className="handTitle"><h3>أوراقك</h3><span>{game.hand.length} في اليد</span></div>
      <div className="hand">{game.hand.map((value, i) => <button key={i} data-card={i}
        className={['card', /[♦♥]/.test(value) && 'red', i === card && 'chosen'].filter(Boolean).join(' ')}
        aria-pressed={i === card} disabled={busy || !game.moves[i]?.length}
        onClick={() => { setCard(i); setChoice(0); }}>{value.slice(0,-1)}<span>{value.slice(-1)}</span></button>)}</div>
      {move && !burn && cardEffects[game.hand[card].slice(0, -1)] && <p className="moveHint">{cardEffects[game.hand[card].slice(0, -1)]}</p>}
      {move && <div id="moves"><label className="field">الحركة المختارة<select id="choice" value={choice} onChange={e => setChoice(Number(e.target.value))}>
        {moves.map((m, i) => <option value={i} key={i}>{m.label}</option>)}
      </select></label><button id="play" className="solid" disabled={busy} onClick={() => act('play', { card, move: choice, rev })}>{burn ? 'تأكيد حرق الورقة' : 'تأكيد الحركة'}</button></div>}
      {game.winner !== null && seat === 0 && <button id="start" className="solid" disabled={busy} onClick={() => act('start')}>مباراة جديدة</button>}
      <details className="tableDetails"><summary>اللاعبون والفرق <span>{capacity}</span></summary><Seats table={table}/></details>
      {game.last && <p className="hint">آخر حركة · {players[game.last.seat]} · {game.last.card} · {game.last.label}</p>}
    </section>
  </div>;
}
