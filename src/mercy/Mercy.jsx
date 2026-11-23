import * as MercyCards from '../../core/mercy-cards.js';
import { useState } from 'react';
import { TableStatus } from '../TableStatus';
import { Dialog } from '../Dialog';

import { CardBack, CardFace } from './CardFace';

function ColorPicker() {
  return <fieldset className="palette"><legend>اختر اللون</legend>
    {MercyCards.colors.map(color => <label key={color}><input type="radio" name="color" value={color} required/>
      <span className={'ink-' + color}>{MercyCards.inks[color]}</span></label>)}
  </fieldset>;
}

function cardHint(rank, count, last) {
  if (last) return 'هذه آخر ورقة في يدك. لعبها يحسم الجولة.';
  if (rank === '7') return 'اختر اللاعب الذي ستبادله يدك.';
  if (rank === '0') return 'تنتقل كل يد إلى المقعد التالي في اتجاه اللعب.';
  if (rank === 'wheel') return 'يختار اللاعب التالي لونًا ويسحب حتى يجده.';
  if (rank === 'back4') return count === 2 ? 'ينعكس الاتجاه وتعود إليك عقوبة سحب أربع أوراق.' : 'ينعكس الاتجاه وتبدأ عقوبة سحب أربع أوراق.';
  if (rank === 'reverse') return count === 2 ? 'في اللعب الثنائي يعود الدور إليك.' : 'ينعكس ترتيب الأدوار.';
  if (rank === 'all') return 'يُتخطّى جميع اللاعبين وتلعب مرة أخرى.';
  if (rank === 'skip') return 'يفقد اللاعب التالي دوره.';
  if (rank === 'discard') return 'تتخلّص أيضًا من كل أوراق هذا اللون في يدك.';
  if (rank.startsWith('d')) return 'تُضاف ' + rank.slice(1) + ' إلى عقوبة السحب.';
  return null;
}

function CardChoice({ table, index, play, close }) {
  const { game, players, seat } = table;
  const card = game.hand[index];
  const { ink, rank, color, label } = MercyCards.describe(card);
  const last = game.hand.length === 1;
  const effect = cardHint(rank, game.out.filter(out => !out).length, last);
  function submit(event) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    close();
    play({ move: 'card', card: index, color: fields.get('color'),
      target: fields.has('target') ? Number(fields.get('target')) : null, uno: fields.has('uno') });
  }
  return <Dialog label="لعب الورقة" onClose={close}><div className="previewCard"><CardFace card={card}/></div>
    <h2>لعب الورقة</h2><p>{color} · {label}</p>{effect && <p>{effect}</p>}<form id="mercyChoice" onSubmit={submit}>
      {ink === 'w' && rank !== 'wheel' && !last && <ColorPicker/>}
      {rank === '7' && !last && <label className="field">بدّل يدك مع<select name="target">
        {players.map((name, i) => i !== seat && !game.out[i] && <option key={i} value={i}>{name}</option>)}
      </select></label>}
      {(game.hand.length === 2 || ['0','7','discard'].includes(rank)) &&
        <label className="callCheck"><input name="uno" type="checkbox"/> أعلن أونو إذا بقيت لي ورقة</label>}
      <button className="gold">العب الورقة</button>
    </form></Dialog>;
}

function turnHint(game, seat) {
  if (game.winner !== null) return 'اكتملت الجولة.';
  if (game.out[seat]) return 'خرجت من هذه الجولة. يمكنك متابعة اللعب.';
  if (game.turn !== seat) return 'تابع الورقة العليا حتى يصلك الدور.';
  if (game.roulette) return 'اختر لون الروليت ثم اسحب حتى يظهر.';
  if (game.debt) return game.playable.length
    ? 'كدّس ورقة +' + game.floor + ' أو أعلى، أو اسحب العقوبة.'
    : 'اسحب العقوبة المتراكمة لإنهاء دورك.';
  if (game.forced) return 'العب الورقة التي سحبتها.';
  return game.playable.length ? 'اختر ورقة مضيئة من يدك ثم أكّد لعبها.' : 'اسحب حتى تجد ورقة صالحة.';
}

export function Mercy({ table, act, busy }) {
  const { game, players, seat, rev } = table;
  const [choice, setChoice] = useState(null);
  const over = game.winner !== null;
  const play = move => act('play', { ...move, rev });
  const close = () => setChoice(null);
  return <section className="mercyArena">
    <TableStatus active={!over && game.turn === seat}
      title={over ? 'فاز ' + players[game.winner] : game.turn === seat ? 'دورك الآن' : 'دور ' + players[game.turn]}
      hint={turnHint(game, seat)}>
      <span><i className={'currentInk ink-' + game.color}/>اللون · {MercyCards.inks[game.color]}</span>
      {game.debt > 0 && <span>عقوبة السحب · {game.debt}</span>}
    </TableStatus>
    <div className="felt">
      <div className="feltTop"><span>لاعبو الطاولة</span><span>{game.direction === 1 ? '↻ مع عقارب الساعة' : '↺ عكس عقارب الساعة'}</span></div>
      <ul className="playersRail">{players.map((name, i) => <li key={i} className={game.out[i] ? 'out' : i === game.turn && !over ? 'current' : ''}>
        <span className="avatar">{Array.from(name)[0]}</span><span><strong>{name}{i === seat && ' · أنت'}</strong>
        <small>{game.out[i] ? 'خارج الجولة' : game.counts[i] + ' ورقة'}</small></span></li>)}</ul>
      <div className="piles"><figure><CardBack/><figcaption>رزمة السحب</figcaption></figure>
        <figure><CardFace card={game.top}/><figcaption>الورقة العليا</figcaption></figure></div>
      {game.log[0] && <p className="lastEvent">آخر حركة · {players[game.log[0].seat]} · {game.log[0].message}</p>}
    </div>
    <div id="playerHand" tabIndex={-1} className="handPanel gameDock"><div className="handTitle"><h3>{game.out[seat] ? 'متابعة الجولة' : 'أوراقك'}</h3><span>{game.counts[seat]} في اليد</span></div>
      <div className="actions">
        {!over && !game.out[seat] && game.exposed.map(i => i === seat
          ? <button key={i} disabled={busy} className="gold" onClick={() => play({ move: 'call' })}>أونو!</button>
          : <button key={i} disabled={busy} className="light" onClick={() => play({ move: 'catch', target: i })}>تنبيه {players[i]} لنداء أونو</button>)}
        {game.canDraw && <button className="solid" data-mercy-draw="" disabled={busy}
          onClick={() => game.roulette ? setChoice({ rev, roulette: true }) : play({ move: 'draw' })}>
          {game.roulette ? 'اختر لون الروليت' : game.debt ? 'اسحب العقوبة · ' + game.debt : 'اسحب حتى تجد ورقة'}</button>}
        {over && seat === 0 && <button className="solid" id="start" disabled={busy} onClick={() => act('start')}>جولة جديدة</button>}
      </div>
      <div className="mercyHand">{game.hand.map((card, i) => {
        const d = MercyCards.describe(card);
        return <button key={i} className="handCard" data-mercy-card={i} aria-label={[d.color, d.mark, d.label].join(' ')}
          disabled={busy || !game.playable.includes(i)} onClick={() => setChoice({ rev, index: i })}><CardFace card={card}/></button>;
      })}</div>
      {!!game.log.length && <details className="history tableDetails"><summary>سجل الطاولة</summary>
        <ol>{game.log.map((entry, i) => <li key={i}><strong>{players[entry.seat]}</strong> · {entry.message}</li>)}</ol></details>}
    </div>
    {choice?.rev === rev && (choice.roulette ?
      <Dialog label="روليت الألوان" onClose={close}><h2>روليت الألوان</h2><p>تسحب حتى تظهر ورقة اللون الذي تختاره.</p>
        <form id="roulettePick" onSubmit={e => { e.preventDefault(); const color = new FormData(e.currentTarget).get('color'); close(); play({ move: 'draw', color }); }}>
          <ColorPicker/><button className="gold">اسحب الأوراق</button>
        </form></Dialog> : <CardChoice table={table} index={choice.index} play={play} close={close}/>)}
  </section>;
}
