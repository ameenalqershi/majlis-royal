import * as Mercy from '../core/mercy.js';
import { request } from '../core/rooms.js';
import test from 'node:test';
import assert from 'node:assert/strict';
const play=(g,i,data={})=>Mercy.act(g,g.turn,{move:'card',card:i,...data});
function table(hands){
  return {...Mercy.start(hands.length),hands,discard:['r3'],color:'r'};
}
test('stack by value across colors; reject lower value without mutation',()=>{
  const g=table([['rd4','b2'],['gd2','wd6','b1'],['y0','y1']]);play(g,0);
  const saved=JSON.stringify(g);assert.throws(()=>play(g,0));assert.equal(JSON.stringify(g),saved);
  play(g,1,{color:'y'});assert.equal(g.debt,10);
  Mercy.act(g,2,{move:'draw'});assert.equal(g.hands[2].length,12);assert.equal(g.turn,0);
});
test('reverse draw four at two seats, skip everyone, reverse and call window',()=>{
  const g=table([['wback4','rall','rreverse','r0'],['b4','b5']]);play(g,0,{color:'r'});
  assert.equal(g.turn,0);Mercy.act(g,0,{move:'draw'});assert.equal(g.hands[0].length,7);
  const h=table([['rall','rreverse','r5'],['b4','g8']]);play(h,0);play(h,0);
  assert.equal(h.turn,0);assert.deepEqual(h.exposed,[0]);Mercy.act(h,1,{move:'catch',target:0});
  assert.equal(h.hands[0].length,3);assert.throws(()=>Mercy.act(h,1,{move:'catch',target:0}));
});
test('pass and swap follow direction and skip eliminated seats',()=>{
  const g=table([['r0','r7'],['b3'],[],['r8','g3']]);g.direction=-1;g.out[2]=true;
  play(g,0);assert.deepEqual(g.hands,[['b3'],['r8','g3'],[],['r7']]);assert.equal(g.turn,3);
  const h=table([['r7','r9'],['b0','g2'],['b1']]);assert.throws(()=>play(h,0,{target:0}));
  play(h,0,{target:1});assert.deepEqual(h.hands[0],['b0','g2']);assert.deepEqual(h.hands[1],['r9']);
});
test('roulette color chosen by victim, wild does not satisfy it',()=>{
  const g=table([['wwheel','b2'],['r9'],['b1']]);g.pile=['g2','wd6','r6'];play(g,0);
  assert.throws(()=>Mercy.act(g,1,{move:'draw'}));Mercy.act(g,1,{move:'draw',color:'g'});
  assert.deepEqual(g.hands[1],['r9','r6','wd6','g2']);assert.equal(g.turn,2);assert.equal(g.color,'g');
});
test('draw until playable; discard all keeps action on top; final card wins',()=>{
  const g=table([['b5','g8'],['g1','b3']]);g.pile=['rdiscard','y6'];Mercy.act(g,0,{move:'draw'});
  assert.deepEqual(Mercy.view(g,0).playable,[3]);play(g,3);assert.equal(g.discard.at(-1),'rdiscard');
  const h=table([['rdiscard','r1','r4'],['g4']]);play(h,0);assert.equal(h.winner,0);assert.equal(h.discard.at(-1),'rdiscard');
});
test('25-card elimination and last survivor',()=>{
  const g=table([['wd10','r1'],Array(24).fill('b5')]);play(g,0,{color:'g'});Mercy.act(g,1,{move:'draw'});
  assert.equal(g.winner,0);assert.equal(g.reserve.length,25);
});
test('private room views and stale turn rejection',()=>{
  const h=request('create',{kind:'mercy',capacity:2,name:'أمل'});
  const u=request('join',{code:h.code,name:'فارس'});const s=request('start',h);
  assert.equal(s.game.hand.length,7);assert.equal(s.game.hands,undefined);assert.equal(s.game.pile,undefined);
  assert.throws(()=>request('play',{...u,rev:s.rev,move:'draw'}));
  assert.throws(()=>request('play',{...h,rev:s.rev-1,move:'draw'}));
});
test('full games at every capacity conserve all 168 cards on every turn',()=>{
  for(let seats=2;seats<=6;seats++)for(let trial=0;trial<8;trial++){
    const g=Mercy.start(seats);let moves=0;
    while(g.winner===null&&moves++<6000){
      const s=g.turn,v=Mercy.view(g,s),target=g.out.findIndex((out,i)=>!out&&i!==s);
      if(v.playable.length)play(g,v.playable[Math.floor(Math.random()*v.playable.length)],{target,color:'b',uno:true});
      else Mercy.act(g,s,{move:'draw',color:'g'});
      assert.equal(g.hands.flat().length+g.discard.length+g.pile.length+g.reserve.length,168);
    }
    assert.notEqual(g.winner,null);
  }
});

for (const seats of [2, 3, 4, 5, 6]) {
  test('No Mercy opening deck and turn effects at ' + seats + ' seats', () => {
    const g = Mercy.start(seats);
    assert.deepEqual(g.hands.map(hand => hand.length), Array(seats).fill(7));
    assert.match(g.discard.at(-1), /^[rbgy][0-9]$/);
    const inventory = {};
    for (const card of [...g.hands.flat(), ...g.discard, ...g.pile])
      inventory[card] = (inventory[card] || 0) + 1;
    const expected = { wback4: 8, wwheel: 8, wd6: 4, wd10: 4 };
    for (const ink of 'rbgy') {
      for (let n = 0; n <= 9; n++) expected[ink + n] = 2;
      for (const rank of ['skip', 'reverse', 'd2', 'discard']) expected[ink + rank] = 3;
      for (const rank of ['all', 'd4']) expected[ink + rank] = 2;
    }
    assert.deepEqual(inventory, expected);
    for (const [card, turn, direction] of [
      ['r2', 1, 1], ['rskip', 2 % seats, 1], ['rall', 0, 1],
      ['rreverse', seats === 2 ? 0 : seats - 1, -1],
      ['wback4', seats === 2 ? 0 : seats - 1, -1],
    ]) {
      const round = table(Array.from({length: seats}, () => [card, 'b1']));
      play(round, 0, {color: 'b'});
      assert.equal(round.turn, turn, card);
      assert.equal(round.direction, direction, card);
    }
  });
}

test('each draw card accepts equal or higher stacks and permits taking the debt', () => {
  const cards = ['rd2', 'rd4', 'wback4', 'wd6', 'wd10'];
  const values = [2, 4, 4, 6, 10];
  for (let i = 0; i < cards.length; i++) {
    const opponents = ['gd2', 'gd4', 'wback4', 'wd6', 'wd10'];
    const g = table([[cards[i], 'r8'], [...opponents], [...opponents]]);
    play(g, 0, {color:'g'});
    assert.equal(g.floor, values[i]);
    assert.equal(g.debt, values[i]);
    const victim = g.turn;
    assert.deepEqual(Mercy.view(g, victim).playable, values.flatMap((v, index) => v >= values[i] ? [index] : []));
    Mercy.act(g, victim, {move: 'draw'});
    assert.equal(g.hands[victim].length, 5 + values[i]);
    assert.equal(g.debt, 0);
    assert.equal(g.floor, 0);
    assert.notEqual(g.turn, victim);
  }
});

test('matching, invalid choices, recycling and forced play preserve the table', () => {
  const g = table([['g3', 'r8', 'b1', 'wd6', 'r7'], ['b2'], []]);
  g.out[2] = true;
  assert.deepEqual(Mercy.view(g, 0).playable, [0, 1, 3, 4]);
  for (const invalid of [{move:'draw'}, {move:'card',card:2}, {move:'card',card:3,color:'x'},
    {move:'card',card:4,target:0}, {move:'card',card:4,target:2}]) {
    const before = structuredClone(g);
    assert.throws(() => Mercy.act(g, 0, invalid));
    assert.deepEqual(g, before);
  }
  const h = table([['g9'], ['y8']]);
  h.pile = []; h.reserve = ['r2']; h.discard = ['r1', 'r3'];
  Mercy.act(h, 0, {move:'draw'});
  assert.deepEqual(h.discard, ['r3']);
  assert.deepEqual(h.reserve, []);
  assert.deepEqual(Mercy.view(h, 0).playable, [1]);
  assert.equal(h.pile.length, 1);
  assert.throws(() => Mercy.act(h, 0, {move:'draw'}));
  play(h, 1);
  assert.equal(h.forced, null);
  const action = table([['gskip','g3'], ['r3']]);
  action.discard = ['rskip'];
  assert.deepEqual(Mercy.view(action,0).playable,[0]);
});

test('UNO declaration, missed window and victory take effect at the right move', () => {
  const g = table([['r1','b2'], ['r2','b3'], ['g4','g3']]);
  play(g, 0);
  assert.throws(() => Mercy.act(g, 0, {move:'catch',target:0}));
  Mercy.act(g, 0, {move:'call'});
  assert.deepEqual(g.exposed, []);
  const h = table([['r1','b2'], ['r2','b3'], ['g4','g3']]);
  play(h, 0);
  play(h, 0, {uno:true});
  assert.throws(() => Mercy.act(h, 2, {move:'catch',target:0}));
  for (const finalCard of ['r7','r0','wd10','wwheel']) {
    const last = table([[finalCard], ['r8','g1']]);
    play(last, 0);
    assert.equal(last.winner, 0);
    assert.throws(() => Mercy.act(last, 1, {move:'draw'}));
  }
});

test('ordinary draws and roulette stop at the 25th card and skip the eliminated seat', () => {
  for (const roulette of [false, true]) {
    const g = table([Array(24).fill('b1'), ['r4'], ['g7']]);
    g.pile = ['b9', 'y4']; g.roulette = roulette;
    Mercy.act(g, 0, {move:'draw', color:'g'});
    assert.deepEqual(g.out, [true,false,false]);
    assert.equal(g.reserve.length, 25);
    assert.equal(g.turn, 1);
    assert.equal(g.pile.length, 1);
    assert.throws(() => Mercy.act(g, 0, {move:'draw'}));
  }
});
