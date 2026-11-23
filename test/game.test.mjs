import { TableRules } from '../core/table-rules.js';
import * as Jackaroo from '../core/game.js';
import { request } from '../core/rooms.js';
import test from 'node:test';
import assert from 'node:assert/strict';
const empty=()=>Array(16).fill(-1);
const opts=(b,c)=>Jackaroo.options(b,0,c);
test('release and protected base',()=>{
  const b=empty();assert.equal(opts(b,'K♠')[0].board[0],0);
  b[0]=17;b[4]=0;assert.equal(opts(b,'2♠').length,0);
  b[4]=71;b[0]=16;assert.equal(opts(b,'A♥').find(m=>m.board[0]===17).board[4],-1);
});
test('backward shortcut, exact safety and lane blocking',()=>{
  const b=empty();b[0]=0;
  assert.equal(opts(b,'4♥')[0].board[0],68);
  b[0]=71;assert.equal(opts(b,'4♥')[0].board[0],67);
  assert.equal(opts(b,'3♥')[0].board[0],74);
  assert.equal(opts(b,'6♥').length,0);
  b[1]=72;assert.ok(opts(b,'3♥').every(m=>m.board[0]===71));
});
test('split seven, jack swap and foreign five',()=>{
  const b=empty();b[0]=1;b[1]=20;b[4]=7;
  assert.ok(opts(b,'7♠').some(m=>m.board[0]===4&&m.board[1]===24));
  assert.ok(opts(b,'J♠').some(m=>m.board[0]===25&&m.board[4]===55));
  assert.ok(opts(b,'5♦').some(m=>m.board[4]===12));
});
test('partner takeover and victory',()=>{
  const g=Jackaroo.start();g.board.splice(0,4,72,73,74,75);
  g.board.splice(8,4,71,73,74,75);g.hands[0]=['A♠'];g.turn=0;
  Jackaroo.play(g,0,0,0);assert.equal(g.winner,0);
  assert.throws(()=>Jackaroo.play(g,0,0,0));
});
test('rooms, hidden hands, authorization, stale actions and reconnect',()=>{
  const req=request;
  const host=req('create',{name:'المضيف'}),users=[host];
  assert.throws(()=>req('start',host));
  for(let i=1;i<4;i++)users.push(req('join',{name:'لاعب '+i,code:host.code}));
  assert.throws(()=>req('join',{name:'خامس',code:host.code}));
  assert.throws(()=>req('start',users[2]));
  const s=req('start',host);
  assert.equal(new Set(users.flatMap(u=>req('state',u).game.hand)).size,16);
  assert.equal(s.game.hands,undefined);assert.equal(s.game.deck,undefined);
  assert.throws(()=>req('state',{code:host.code,token:'x'}));
  const move={card:s.game.moves.findIndex(m=>m.length),move:0,rev:s.rev};
  assert.throws(()=>req('play',{...users[1],...move}));
  const next=req('play',{...host,...move});assert.equal(next.rev,s.rev+1);
  assert.throws(()=>req('play',{...host,...move}));
  assert.deepEqual(req('state',host),next);
});
test('complete seeded games without duplicate occupied holes',()=>{
  let seed=742;const orig=Math.random;
  Math.random=()=>((seed=(1664525*seed+1013904223)>>>0)/4294967296);
  try{
    for(let round=0;round<8;round++){
      const seats=round%2?6:4;
      const length=TableRules.trackLength(seats);
      const g=Jackaroo.start(seats);
      for(let t=0;t<4000&&g.winner===null;t++){
        const actions=Jackaroo.choices(g).flatMap((ms,c)=>ms.map((m,i)=>[c,i,m]));
        const team=g.turn%(seats/2);
        function score(b){return b.reduce((s,p,id)=>s+(Math.floor(id/4)%(seats/2)===team?1:-1)*(p<0?-24:p>=length?130+p:p),0);}
        const ranked=actions.map(([c,i,m])=>({c,i,score:score(m.board)+Math.random()*5})).sort((a,b)=>b.score-a.score);
        Jackaroo.play(g,g.turn,ranked[0].c,ranked[0].i);
        const occupied=g.board.flatMap((p,i)=>p<0?[]:[Jackaroo.tile(i,p,length)]);
        assert.equal(new Set(occupied).size,occupied.length);
      }
      assert.ok(g.winner!==null);
    }
  }finally{Math.random=orig;}
});
test('leaving a lobby releases a seat, closing a table invalidates the invite',()=>{
  const req=request,h=req('create',{name:'ليلى'}),u=req('join',{code:h.code,name:'فارس'});
  req('leave',u);assert.equal(req('state',h).players.length,1);
  req('leave',h);assert.throws(()=>req('state',h));
});
test('six players need six seats, opposite partners, equal deals and 108 track holes',()=>{
  const req=request;
  assert.throws(()=>req('create',{name:'أمل',capacity:5}));
  const h=req('create',{name:'هند',capacity:6});
  for(let i=1;i<=5;i++){
    assert.throws(()=>req('start',h));
    req('join',{name:'ضيف '+i,code:h.code});
  }
  const state=req('start',h);
  assert.equal(state.capacity,6);assert.equal(state.game.board.length,24);
  assert.deepEqual(state.game.counts,[4,4,4,4,4,4]);
  assert.throws(()=>req('join',{name:'سابع',code:h.code}));
  const g=Jackaroo.start(6);
  g.board.splice(8,4,108,109,110,111);
  g.board.splice(20,4,107,109,110,111);
  g.hands[2]=['A♦'];g.turn=2;
  Jackaroo.play(g,2,0,0);
  assert.equal(g.board[20],108);assert.equal(g.winner,2);
});

for (const seats of [4, 6]) {
  test('Jackaroo movement, protection, burn and deal rotation at ' + seats + ' seats', () => {
    const g = Jackaroo.start(seats);
    const length = TableRules.trackLength(seats);
    const board = g.board.slice();
    board[0] = 12;
    for (const [rank, steps] of Object.entries({
      A:[1,11], 2:[2], 3:[3], 4:[-4], 5:[5], 6:[6], 7:[7], 8:[8], 9:[9], 10:[10], Q:[12], K:[13],
    })) {
      const destinations = opts(board, rank+'♣').filter(m => m.pieces[0] === 0).map(m => m.board[0]);
      assert.deepEqual(destinations, steps.map(n => 12+n), rank);
    }
    board[4] = 0;
    assert.deepEqual(opts(board,'J♠'), []);
    board[4] = length;
    assert.deepEqual(opts(board,'J♠'), []);
    board[4] = length - 1;
    assert.ok(opts(board,'5♠').some(m => m.board[4] === 4));
    board[4] = length - TableRules.sector;
    for (const rank of ['A','K']) {
      const launch = opts(board,rank+'♠').find(m => m.board[1] === 0);
      assert.equal(launch.board[4], -1);
    }
    g.hands[0] = ['2♠','3♥'];
    assert.ok(Jackaroo.choices(g).every(moves => moves.length === 1 && moves[0].pieces.length === 0));
    g.hands[0].push('K♠');
    assert.deepEqual(Jackaroo.choices(g).map(moves => moves.length), [0,0,1]);
    const rounds = Jackaroo.start(seats);
    const sizes = seats === 4 ? [4,4,5,4] : [4,4,4,5,4];
    for (const [round, size] of sizes.entries()) {
      assert.equal(rounds.turn, round % seats);
      assert.deepEqual(rounds.hands.map(h => h.length), Array(seats).fill(size));
      rounds.hands = rounds.hands.map(hand => hand.map(() => '2♠'));
      for (let i = 0; i < size * seats; i++) Jackaroo.play(rounds, rounds.turn, 0, 0);
      assert.deepEqual(rounds.board, Array(seats * 4).fill(-1));
    }
  });
}

for (const seats of [4, 6]) {
  test('all Jackaroo seats play, win, restart and close through the room API: ' + seats, () => {
    const host = request('create', {name:'مضيف', kind:'jackaroo', capacity:seats});
    const players = [host];
    try {
      while (players.length < seats) {
        assert.throws(() => request('start', host));
        players.push(request('join', {code:host.code, name:'لاعب '+players.length}));
      }
      assert.throws(() => request('start', players[1]));
      let state = request('start', host);
      let turnCount = 0;
      const length = TableRules.trackLength(seats);
      while (state.game.winner === null && turnCount++ < 6000) {
        const turn = state.game.turn;
        const player = players[turn];
        const {game, rev} = request('state', player);
        const score = board => board.reduce((sum, pos, id) => {
          const allied = Math.floor(id / 4) % (seats / 2) === turn % (seats / 2);
          return sum + (allied ? 1 : -1) * (pos < 0 ? -24 : pos >= length ? 130 + pos : pos);
        }, 0);
        const choices = game.hand.flatMap((value, card) =>
          Jackaroo.options(game.board, turn, value).map((candidate, move) =>
            ({card, move, score:score(candidate.board)})));
        const best = choices.sort((a,b) => b.score-a.score)[0] || {card:0, move:0};
        state = request('play', {...player, card:best.card, move:best.move, rev});
        assert.equal(state.rev, rev + 1);
      }
      assert.notEqual(state.game.winner, null);
      for (const player of players)
        assert.equal(request('state', player).game.winner, state.game.winner);
      const next = request('start', host);
      assert.equal(next.game.winner, null);
      assert.equal(next.game.round, 1);
      assert.deepEqual(next.game.board, Array(seats*4).fill(-1));
    } finally {
      request('leave', host);
    }
    for (const player of players) assert.throws(() => request('state', player));
  });
}
