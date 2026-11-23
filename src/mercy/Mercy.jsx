import { useState } from 'react';
import { Dialog } from '../Dialog';

function CardFace({ card }) {
  const { ink, mark, label, color, sign } = MercyCards.describe(card);
  return <span className={'face ink-' + ink}><span className="index" dir="ltr">{mark}</span>
    <b className="pip" dir="ltr">{mark}</b><span className="faceName">{label}</span><small>{sign} {color}</small></span>;
}

function ColorPicker() {
  return <fieldset className="palette"><legend>اختر اللون</legend>
    {MercyCards.colors.map(color => <label key={color}><input type="radio" name="color" value={color} required/>
      <span className={'ink-' + color}>{MercyCards.inks[color]}</span></label>)}
  </fieldset>;
}

function CardChoice({ table, index, play, close }) {
  const { game, players, seat } = table;
  const card = game.hand[index];
  const { ink, rank } = MercyCards.describe(card);
  const last = game.hand.length === 1;
  function submit(event) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    close();
    play({ move: 'card', card: index, color: fields.get('color'),
      target: fields.has('target') ? Number(fields.get('target')) : null, uno: fields.has('uno') });
  }
  return <Dialog label="لعب الورقة" onClose={close}><div className="previewCard"><CardFace card={card}/></div>
    <h2>لعب الورقة</h2><form id="mercyChoice" onSubmit={submit}>
      {ink === 'w' && rank !== 'wheel' && !last && <ColorPicker/>}
      {rank === '7' && !last && <label className="field">بدّل يدك مع<select name="target">
        {players.map((name, i) => i !== seat && !game.out[i] && <option key={i} value={i}>{name}</option>)}
      </select></label>}
      {(game.hand.length === 2 || ['0','7','discard'].includes(rank)) &&
        <label className="callCheck"><input name="uno" type="checkbox"/> أعلن أونو إذا بقيت لي ورقة</label>}
      <button className="gold">العب الورقة</button>
    </form></Dialog>;
}

function status(game) {
  if (game.winner !== null) return 'انتهت الجولة';
  if (game.roulette) return 'الروليت · اللاعب التالي يختار اللون';
  if (game.debt) return 'عقوبة متراكمة · اسحب ' + game.debt + ' أو كدّس +' + game.floor + ' فأكثر';
  if (game.forced) return 'العب الورقة التي سحبتها';
  return 'اللون الحالي · ' + MercyCards.inks[game.color];
}

export function Mercy({ table, act, busy }) {
  const { game, players, seat, rev } = table;
  const [choice, setChoice] = useState(null);
  const over = game.winner !== null;
  const play = move => act('play', { ...move, rev });
  const close = () => setChoice(null);
  return <section className="mercyArena">
    <div className="felt">
      <div className="feltTop"><span>مجلس الأوراق</span><span>{game.direction === 1 ? '↻ مع عقارب الساعة' : '↺ عكس عقارب الساعة'}</span></div>
      <ul className="playersRail">{players.map((name, i) => <li key={i} className={game.out[i] ? 'out' : i === game.turn && !over ? 'current' : ''}>
        <span className="avatar">{Array.from(name)[0]}</span><span><strong>{name}{i === seat && ' · أنت'}</strong>
        <small>{game.out[i] ? 'خارج الجولة' : game.counts[i] + ' ورقة'}</small></span></li>)}</ul>
      <div className="piles"><figure><div className="stock"><i>✥</i><small>مَجلس</small></div><figcaption>رزمة السحب</figcaption></figure>
        <figure><CardFace card={game.top}/><figcaption>الورقة العليا</figcaption></figure></div>
      <div className="turnBar" aria-live="polite"><strong>{over ? 'فاز ' + players[game.winner] : game.turn === seat ? 'دورك الآن' : 'دور ' + players[game.turn]}</strong>
        <span>{status(game)}</span></div>
    </div>
    <div className="handPanel"><div className="handTitle"><h2>{game.out[seat] ? 'متابعة الجولة' : 'أوراقك'}</h2><span>{game.counts[seat]} ورقة</span></div>
      <div className="mercyHand">{game.hand.map((card, i) => {
        const d = MercyCards.describe(card);
        return <button key={i} className="handCard" data-mercy-card={i} aria-label={[d.color, d.mark, d.label].join(' ')}
          disabled={busy || !game.playable.includes(i)} onClick={() => setChoice({ rev, index: i })}><CardFace card={card}/></button>;
      })}</div>
      <div className="actions">
        {!over && !game.out[seat] && game.exposed.map(i => i === seat
          ? <button key={i} disabled={busy} className="gold" onClick={() => play({ move: 'call' })}>أونو!</button>
          : <button key={i} disabled={busy} className="light" onClick={() => play({ move: 'catch', target: i })}>تنبيه {players[i]} لنداء أونو</button>)}
        {game.canDraw && <button className="solid" data-mercy-draw="" disabled={busy}
          onClick={() => game.roulette ? setChoice({ rev, roulette: true }) : play({ move: 'draw' })}>
          {game.roulette ? 'اختر لون الروليت' : game.debt ? 'اسحب العقوبة · ' + game.debt : 'اسحب حتى تجد ورقة'}</button>}
        {over && seat === 0 && <button className="solid" id="start" disabled={busy} onClick={() => act('start')}>جولة جديدة</button>}
      </div>
      {!!game.log.length && <details className="history"><summary>سجل الطاولة</summary>
        <ol>{game.log.map((entry, i) => <li key={i}><strong>{players[entry.seat]}</strong> · {entry.message}</li>)}</ol></details>}
    </div>
    {choice?.rev === rev && (choice.roulette ?
      <Dialog label="روليت الألوان" onClose={close}><h2>روليت الألوان</h2><p>تسحب حتى تظهر ورقة اللون الذي تختاره.</p>
        <form id="roulettePick" onSubmit={e => { e.preventDefault(); const color = new FormData(e.currentTarget).get('color'); close(); play({ move: 'draw', color }); }}>
          <ColorPicker/><button className="gold">اسحب الأوراق</button>
        </form></Dialog> : <CardChoice table={table} index={choice.index} play={play} close={close}/>)}
  </section>;
}
