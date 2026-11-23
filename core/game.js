// House rules. Positions are relative to the marble's base, then its four safe holes.
globalThis.Jackaroo = (() => {
  const base = id => Math.floor(id / 4) * 16;
  const tile = (id, pos) => pos < 0 ? -1 : pos >= 64 ? 64 + base(id) + pos - 64 : (base(id) + pos) % 64;
  const owner = id => Math.floor(id / 4);
  const teamDone = (b, seat) => b.slice(seat * 4, seat * 4 + 4).every(p => p >= 64);
  const ids = seat => Array.from({length:4}, (_,i) => seat * 4 + i);
  function step(board, id, count, foreign = false) {
    if (board[id] < 0 || (count < 0 && board[id] >= 64)) return;
    let p = board[id];
    const next = board.slice();
    for (let i = 1; i <= Math.abs(count); i++) {
      p += Math.sign(count);
      if (p < 0) p += 64;
      if (foreign && p === 64) p = 0;
      if (p > 67) return;
      const other = next.findIndex((v,j) => j !== id && tile(j,v) === tile(id,p));
      if (other < 0) continue;
      if (next[other] === 0 || owner(other) === owner(id) || p >= 64) return;
      if (i === Math.abs(count)) next[other] = -1;
    }
    next[id] = p;
    return next;
  }
  function options(board, seat, card) {
    const own = teamDone(board,seat) ? (seat+2)%4 : seat;
    const mine = ids(own);
    const rank = card.slice(0,-1);
    const result = [];
    function add(label, next, pieces) {
      if (next) result.push({label, board:next, pieces});
    }
    const name = id => ['زمرد','ياقوت','فيروز','عنبر'][owner(id)] + ' ' + (id % 4 + 1);
    if (rank === 'A' || rank === 'K') {
      const id = mine.find(i => board[i] < 0);
      const occupied = board.findIndex((v,j) => tile(j,v) === base(own*4));
      if (id !== undefined && (occupied < 0 || owner(occupied) !== own)) {
        const next = board.slice();
        if (occupied >= 0) next[occupied] = -1;
        next[id] = 0;
        add('إنزال ' + name(id),next,[id]);
      }
    }
    for (const id of mine) {
      if (board[id] < 0) continue;
      if (rank === 'J') {
        if (board[id] === 0 || board[id] >= 64) continue;
        board.forEach((v,j) => {
          if (owner(j) === own || v <= 0 || v >= 64) return;
          const next = board.slice();
          next[id] = (tile(j,v)-base(id)+64)%64;
          next[j] = (tile(id,board[id])-base(j)+64)%64;
          add('مبادلة ' + name(id) + ' مع ' + name(j),next,[id,j]);
        });
        continue;
      }
      const counts = rank === 'A' ? [1,11] : [({K:13,Q:12,'4':-4})[rank] ?? Number(rank)];
      for (const n of counts) add(name(id)+' · '+n,step(board,id,n),[id]);
      if (rank === '7') {
        for (let n=1;n<7;n++) {
          const mid = step(board,id,n);
          if (!mid) continue;
          for (const j of mine) if (j !== id)
            add(name(id)+' +'+n+'، '+name(j)+' +'+(7-n),step(mid,j,7-n),[id,j]);
        }
      }
    }
    if (rank === '5') board.forEach((v,id) => {
      if (owner(id) !== own && v > 0 && v < 64)
        add(name(id)+' · 5',step(board,id,5,true),[id]);
    });
    return result;
  }
  function deck() {
    const cards = ['♠','♥','♣','♦'].flatMap(s => 'A 2 3 4 5 6 7 8 9 10 J Q K'.split(' ').map(r => r+s));
    for(let i=cards.length-1;i>0;i--) {
      const j=Math.floor(Math.random()*(i+1));
      [cards[i],cards[j]]=[cards[j],cards[i]];
    }
    return cards;
  }
  function deal(g) {
    if (!g.deck.length) g.deck = deck();
    const count = g.deck.length === 20 ? 5 : 4;
    g.hands = Array.from({length:4},() => g.deck.splice(0,count));
    g.turn = g.round++ % 4;
  }
  function start() {
    const g = {board:Array(16).fill(-1),deck:[],round:0,winner:null,turn:0,last:null};
    deal(g);
    return g;
  }
  function choices(g) {
    const moves = g.hands[g.turn].map(c => options(g.board,g.turn,c));
    return moves.some(m => m.length) ? moves : moves.map(() => [{label:'حرق الورقة',board:g.board,pieces:[]}]);
  }
  function play(g,seat,card,move) {
    if(g.winner !== null || seat !== g.turn) throw Error('انتظر دورك');
    const chosen = choices(g)[card]?.[move];
    if(!chosen || !Number.isInteger(card) || !Number.isInteger(move)) throw Error('حركة غير متاحة');
    g.board = chosen.board;
    g.last = {seat,card:g.hands[seat].splice(card,1)[0],label:chosen.label};
    if (teamDone(g.board,seat) && teamDone(g.board,(seat+2)%4)) g.winner=seat%2;
    else if(g.hands.every(h=>!h.length)) deal(g);
    else g.turn=(seat+1)%4;
  }
  return {start,choices,play,tile,options};
})();
