import test from 'node:test';
import assert from 'node:assert/strict';
import '../core/mercy-cards.js';
import '../core/mercy.js';
import '../core/rooms.js';
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
  const h=Majlis.request('create',{kind:'mercy',capacity:2,name:'أمل'});
  const u=Majlis.request('join',{code:h.code,name:'فارس'});const s=Majlis.request('start',h);
  assert.equal(s.game.hand.length,7);assert.equal(s.game.hands,undefined);assert.equal(s.game.pile,undefined);
  assert.throws(()=>Majlis.request('play',{...u,rev:s.rev,move:'draw'}));
  assert.throws(()=>Majlis.request('play',{...h,rev:s.rev-1,move:'draw'}));
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
