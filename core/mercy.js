import { colors, describe } from './mercy-cards.js';

const values = { d2: 2, d4: 4, back4: 4, d6: 6, d10: 10 };
function shuffle(cards) {
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards;
}
function deck() {
  const cards = [];
  for (const color of colors) {
    for (let n = 0; n < 10; n++) cards.push(color + n, color + n);
    for (const [rank, count] of Object.entries({
      skip: 3,
      reverse: 3,
      d2: 3,
      discard: 3,
      all: 2,
      d4: 2,
    }))
      cards.push(...Array(count).fill(color + rank));
  }
  for (const [rank, count] of Object.entries({ back4: 8, wheel: 8, d6: 4, d10: 4 }))
    cards.push(...Array(count).fill('w' + rank));
  return shuffle(cards);
}
export function start(seats) {
  const pile = deck(),
    hands = Array.from({ length: seats }, () => pile.splice(-7)),
    discard = [];
  do {
    discard.push(pile.pop());
  } while (!/^.[0-9]$/.test(discard.at(-1)));
  return {
    pile,
    hands,
    discard,
    reserve: [],
    out: Array(seats).fill(false),
    turn: 0,
    direction: 1,
    color: discard.at(-1)[0],
    debt: 0,
    floor: 0,
    roulette: false,
    forced: null,
    exposed: [],
    winner: null,
    log: [],
  };
}
function advance(g, from) {
  let seat = from;
  do {
    seat = (seat + g.direction + g.hands.length) % g.hands.length;
  } while (g.out[seat]);
  return seat;
}
function event(g, seat, message) {
  g.log.unshift({ seat, message });
  g.log.length = Math.min(6, g.log.length);
}
function legal(g, seat, i) {
  const card = g.hands[seat][i];
  if (!card || g.turn !== seat || g.out[seat] || g.winner !== null || g.roulette) return false;
  if (g.forced !== null && i !== g.forced) return false;
  if (g.debt) return (values[card.slice(1)] || 0) >= g.floor;
  return card[0] === 'w' || card[0] === g.color || card.slice(1) === g.discard.at(-1).slice(1);
}
function drawOne(g, seat) {
  if (!g.pile.length) {
    const top = g.discard.pop();
    g.pile = shuffle(g.discard.concat(g.reserve));
    g.reserve = [];
    g.discard = [top];
  }
  const card = g.pile.pop();
  if (!card) throw Error('نفدت رزمة السحب');
  g.hands[seat].push(card);
  if (g.hands[seat].length >= 25) {
    g.reserve.push(...g.hands[seat]);
    g.hands[seat] = [];
    g.out[seat] = true;
    const active = g.out.flatMap((out, i) => (out ? [] : [i]));
    if (active.length === 1) g.winner = active[0];
    event(g, seat, 'خرج عند بلوغ ٢٥ ورقة');
  }
  return card;
}
export function act(g, seat, input) {
  if (g.winner !== null || g.out[seat]) throw Error('انتهى اللعب لهذا المقعد');
  const move = input.move;
  if (move === 'call' || move === 'catch') {
    const target = move === 'call' ? seat : input.target;
    if (!g.exposed.includes(target) || (move === 'catch' && target === seat))
      throw Error('انتهت فرصة النداء');
    g.exposed = g.exposed.filter((i) => i !== target);
    if (move === 'call') event(g, seat, 'نادى أونو');
    else {
      drawOne(g, target);
      drawOne(g, target);
      event(g, target, 'سحب ورقتين لفوات نداء أونو');
    }
    return;
  }
  if (seat !== g.turn) throw Error('انتظر دورك');
  const hand = g.hands[seat];
  if (move === 'draw') {
    if (g.roulette && !colors.includes(input.color)) throw Error('اختر لون الروليت');
    if (!g.debt && !g.roulette && hand.some((_, i) => legal(g, seat, i)))
      throw Error('لديك ورقة صالحة');
    g.exposed = [];
    if (g.roulette || g.debt) {
      let count = 0;
      if (g.roulette) {
        g.color = input.color;
        do {
          count++;
          if (drawOne(g, seat)[0] === g.color) break;
        } while (!g.out[seat]);
      } else {
        while (count < g.debt && !g.out[seat]) {
          drawOne(g, seat);
          count++;
        }
      }
      event(g, seat, 'سحب ' + count + ' ورقة');
      g.debt = 0;
      g.floor = 0;
      g.roulette = false;
      g.turn = advance(g, seat);
    } else {
      let count = 0;
      do {
        drawOne(g, seat);
        count++;
      } while (!g.out[seat] && !legal(g, seat, hand.length - 1));
      if (g.out[seat]) g.turn = advance(g, seat);
      else g.forced = hand.length - 1;
      event(g, seat, 'سحب ' + count + ' ورقة');
    }
    return;
  }
  if (move !== 'card' || !Number.isInteger(input.card) || !legal(g, seat, input.card))
    throw Error('ورقة غير متاحة');
  const card = hand[input.card],
    { ink, rank, label, mark, color } = describe(card);
  const last = hand.length === 1;
  if (!last && ink === 'w' && rank !== 'wheel' && !colors.includes(input.color))
    throw Error('اختر اللون التالي');
  if (
    !last &&
    rank === '7' &&
    (!Number.isInteger(input.target) ||
      !g.hands[input.target] ||
      input.target === seat ||
      g.out[input.target])
  )
    throw Error('اختر لاعبًا للمبادلة');
  const before = g.hands.map((h) => h.length);
  g.forced = null;
  g.exposed = [];
  hand.splice(input.card, 1);
  if (rank === 'discard') {
    g.discard.push(...hand.filter((c) => c[0] === ink));
    g.hands[seat] = hand.filter((c) => c[0] !== ink);
  }
  g.discard.push(card);
  g.color = ink === 'w' ? (colors.includes(input.color) ? input.color : g.color) : ink;
  event(g, seat, (rank.length === 1 ? mark : label) + ' · ' + color);
  if (!g.hands[seat].length) {
    g.winner = seat;
    return;
  }
  if (rank === 'reverse' || rank === 'back4') g.direction *= -1;
  const next = advance(g, seat);
  let turn = next;
  if (rank === 'skip') turn = advance(g, next);
  if (rank === 'all' || ((rank === 'reverse' || rank === 'back4') && advance(g, next) === seat))
    turn = seat;
  if (values[rank]) {
    g.floor = values[rank];
    g.debt += g.floor;
  }
  if (rank === 'wheel') g.roulette = true;
  if (rank === '7') [g.hands[seat], g.hands[input.target]] = [g.hands[input.target], g.hands[seat]];
  if (rank === '0') {
    const previous = g.hands.slice();
    previous.forEach((h, i) => {
      if (!g.out[i]) g.hands[advance(g, i)] = h;
    });
  }
  g.exposed = g.hands.flatMap((h, i) =>
    h.length === 1 && (before[i] !== 1 || i === seat) ? [i] : [],
  );
  if (input.uno === true && g.exposed.includes(seat)) {
    g.exposed = g.exposed.filter((i) => i !== seat);
    event(g, seat, 'نادى أونو');
  }
  g.turn = turn;
}
export function view(g, seat) {
  const playable = g.hands[seat].flatMap((_, i) => (legal(g, seat, i) ? [i] : []));
  return {
    turn: g.turn,
    winner: g.winner,
    top: g.discard.at(-1),
    color: g.color,
    direction: g.direction,
    debt: g.debt,
    floor: g.floor,
    roulette: g.roulette,
    hand: g.hands[seat],
    counts: g.hands.map((h) => h.length),
    out: g.out,
    exposed: g.exposed,
    log: g.log,
    playable,
    forced: g.forced !== null && seat === g.turn,
    canDraw: g.turn === seat && g.winner === null && (!playable.length || g.debt > 0),
  };
}
