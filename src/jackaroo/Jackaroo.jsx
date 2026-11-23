import { useEffect, useRef, useState } from 'react';
import { Seats } from '../Lobby';
import { drawBoard } from './board';

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
  return <div className="arena">
    <canvas ref={canvas} className="board" id="board" aria-label="لوحة جاكارو" onClick={selectMarble}/>
    <section className="panel">
      <div className="eyebrow dark">توزيعة {game.round} · {colors[seat]}</div><h2>{title}</h2><h3>أوراقك</h3>
      <div className="hand">{game.hand.map((value, i) => <button key={i} data-card={i}
        className={['card', /[♦♥]/.test(value) && 'red', i === card && 'chosen'].filter(Boolean).join(' ')}
        aria-pressed={i === card} disabled={busy || !game.moves[i]?.length}
        onClick={() => { setCard(i); setChoice(0); }}>{value.slice(0,-1)}<span>{value.slice(-1)}</span></button>)}</div>
      {move && <div id="moves"><label className="field">الحركة<select id="choice" value={choice} onChange={e => setChoice(Number(e.target.value))}>
        {moves.map((m, i) => <option value={i} key={i}>{m.label}</option>)}
      </select></label><button id="play" className="solid" disabled={busy} onClick={() => act('play', { card, move: choice, rev })}>تأكيد الحركة</button></div>}
      {game.winner !== null && seat === 0 && <button id="start" className="solid" disabled={busy} onClick={() => act('start')}>مباراة جديدة</button>}
      <hr/><Seats table={table}/>
      {game.last && <p className="hint">آخر حركة · {players[game.last.seat]} · {game.last.card} · {game.last.label}</p>}
    </section>
  </div>;
}
