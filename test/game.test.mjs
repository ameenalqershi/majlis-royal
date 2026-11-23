import test from 'node:test';
import assert from 'node:assert/strict';
import '../core/game.js';
import '../core/rooms.js';
const empty=()=>Array(16).fill(-1);
const opts=(b,c)=>Jackaroo.options(b,0,c);
test('release and protected base',()=>{
  const b=empty();assert.equal(opts(b,'K♠')[0].board[0],0);
  b[0]=15;b[4]=0;assert.equal(opts(b,'2♠').length,0);
  b[4]=63;b[0]=14;assert.equal(opts(b,'A♥').find(m=>m.board[0]===15).board[4],-1);
});
test('backward shortcut, exact safety and lane blocking',()=>{
  const b=empty();b[0]=0;
  assert.equal(opts(b,'4♥')[0].board[0],60);
  b[0]=63;assert.equal(opts(b,'4♥')[0].board[0],59);
  assert.equal(opts(b,'3♥')[0].board[0],66);
  assert.equal(opts(b,'6♥').length,0);
  b[1]=64;assert.ok(opts(b,'3♥').every(m=>m.board[0]===63));
});
test('split seven, jack swap and foreign five',()=>{
  const b=empty();b[0]=1;b[1]=20;b[4]=7;
  assert.ok(opts(b,'7♠').some(m=>m.board[0]===4&&m.board[1]===24));
  assert.ok(opts(b,'J♠').some(m=>m.board[0]===23&&m.board[4]===49));
  assert.ok(opts(b,'5♦').some(m=>m.board[4]===12));
});
test('partner takeover and victory',()=>{
  const g=Jackaroo.start();g.board.splice(0,4,64,65,66,67);
  g.board.splice(8,4,63,65,66,67);g.hands[0]=['A♠'];g.turn=0;
  Jackaroo.play(g,0,0,0);assert.equal(g.winner,0);
  assert.throws(()=>Jackaroo.play(g,0,0,0));
});
test('rooms, hidden hands, authorization, stale actions and reconnect',()=>{
  const req=Majlis.request;
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
      const g=Jackaroo.start();
      for(let t=0;t<4000&&g.winner===null;t++){
        const actions=Jackaroo.choices(g).flatMap((ms,c)=>ms.map((m,i)=>[c,i,m]));
        const team=g.turn%2;
        function score(b){return b.reduce((s,p,id)=>s+(Math.floor(id/4)%2===team?1:-1)*(p<0?-24:p>=64?130+p:p),0);}
        const ranked=actions.map(([c,i,m])=>({c,i,score:score(m.board)+Math.random()*5})).sort((a,b)=>b.score-a.score);
        Jackaroo.play(g,g.turn,ranked[0].c,ranked[0].i);
        const occupied=g.board.flatMap((p,i)=>p<0?[]:[Jackaroo.tile(i,p)]);
        assert.equal(new Set(occupied).size,occupied.length);
      }
      assert.ok(g.winner!==null);
    }
  }finally{Math.random=orig;}
});
test('leaving a lobby releases a seat, closing a table invalidates the invite',()=>{
  const req=Majlis.request,h=req('create',{name:'ليلى'}),u=req('join',{code:h.code,name:'فارس'});
  req('leave',u);assert.equal(req('state',h).players.length,1);
  req('leave',h);assert.throws(()=>req('state',h));
});
