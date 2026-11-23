// House rules. Positions are relative to the marble's base, then its four safe holes.
globalThis.Jackaroo = (() => {
  const base = id => Math.floor(id / 4) * TableRules.sector;
  const owner = id => Math.floor(id / 4);
  const trackSize = board => TableRules.trackLength(board.length / 4);
  function tile(id,pos,length=TableRules.trackLength(4)){
    if(pos<0)return -1;
    return pos>=length ? pos+4*owner(id) : (base(id)+pos)%length;
  }
  const teamDone = (b,seat) => b.slice(seat*4,seat*4+4).every(p=>p>=trackSize(b));
  const ids = seat => Array.from({length:4}, (_,i) => seat * 4 + i);
  function step(board, id, count, foreign = false) {
    const length=trackSize(board);
    if (board[id] < 0 || (count < 0 && board[id] >= length)) return;
    let p = board[id];
    const next = board.slice();
    for (let i = 1; i <= Math.abs(count); i++) {
      p += Math.sign(count);
      if (p < 0) p += length;
      if (foreign && p === length) p = 0;
      if (p > length+3) return;
      const other = next.findIndex((v,j) => j !== id && tile(j,v,length) === tile(id,p,length));
      if (other < 0) continue;
      if (next[other] === 0 || owner(other) === owner(id) || p >= length) return;
      if (i === Math.abs(count)) next[other] = -1;
    }
    next[id] = p;
    return next;
  }
  function options(board, seat, card) {
    const length=trackSize(board);
    const own = teamDone(board,seat) ? TableRules.partner(seat,board.length/4) : seat;
    const mine = ids(own);
    const rank = card.slice(0,-1);
    const result = [];
    function add(label, next, pieces) {
      if (next) result.push({label, board:next, pieces});
    }
    const name = id => TableRules.colors[owner(id)] + ' ' + (id % 4 + 1);
    if (rank === 'A' || rank === 'K') {
      const id = mine.find(i => board[i] < 0);
      const occupied = board.findIndex((v,j) => tile(j,v,length) === base(own*4));
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
        if (board[id] === 0 || board[id] >= length) continue;
        board.forEach((v,j) => {
          if (owner(j) === own || v <= 0 || v >= length) return;
          const next = board.slice();
          next[id] = (tile(j,v,length)-base(id)+length)%length;
          next[j] = (tile(id,board[id],length)-base(j)+length)%length;
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
      if (owner(id) !== own && v > 0 && v < length)
        add(name(id)+' · 5',step(board,id,5,true),[id]);
    });
    return result;
  }
  function deck(seats) {
    const cards = ['♠','♥','♣','♦'].flatMap(s => 'A 2 3 4 5 6 7 8 9 10 J Q K'.split(' ').map(r => r+s));
    if(seats===6)cards.push(...cards);
    for(let i=cards.length-1;i>0;i--) {
      const j=Math.floor(Math.random()*(i+1));
      [cards[i],cards[j]]=[cards[j],cards[i]];
    }
    return cards;
  }
  function deal(g) {
    const seats=g.board.length/4;
    if (g.deck.length<seats*4) g.deck = deck(seats);
    const count = Math.floor(g.deck.length/seats) === 5 ? 5 : 4;
    g.hands = Array.from({length:seats},() => g.deck.splice(0,count));
    g.turn = g.round++ % seats;
  }
  function start(seats=4) {
    if(![4,6].includes(seats))throw Error('عدد المقاعد غير متاح');
    const g = {board:Array(seats*4).fill(-1),deck:[],round:0,winner:null,turn:0,last:null};
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
    const seats=g.board.length/4;
    if (teamDone(g.board,seat) && teamDone(g.board,TableRules.partner(seat,seats))) g.winner=seat%(seats/2);
    else if(g.hands.every(h=>!h.length)) deal(g);
    else g.turn=(seat+1)%seats;
  }
  return {start,choices,play,tile,options};
})();
