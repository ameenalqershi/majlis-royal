// Run against an already-running local Majlis server with a Chromium executable.
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {mkdtemp,writeFile,rm,mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import assert from 'node:assert/strict';
const url=process.env.MAJLIS_URL || 'http://127.0.0.1:8787';
const capacity = Number(process.env.MERCY_SEATS || 2);
assert.ok([2, 3, 4, 5, 6].includes(capacity), 'supported No Mercy capacity');
const output=process.env.PREVIEW_DIR || 'build/previews';
await mkdir(output,{recursive:true});
const profile=await mkdtemp(join(tmpdir(),'majlis-browser-'));
const proc=spawn(process.env.CHROME || 'chromium',['--headless','--disable-gpu','--disable-background-timer-throttling','--disable-renderer-backgrounding','--no-sandbox','--disable-dev-shm-usage','--remote-debugging-pipe','--user-data-dir='+profile],{stdio:['ignore','ignore','inherit','pipe','pipe']});
const pending=new Map();let seq=0,incoming='';
proc.stdio[4].on('data',buf=>{
  incoming+=buf.toString();let end;
  while((end=incoming.indexOf('\0'))!==-1){
    const msg=JSON.parse(incoming.slice(0,end));incoming=incoming.slice(end+1);
    if(!msg.id)continue;const [ok,fail]=pending.get(msg.id);pending.delete(msg.id);
    if(msg.error)fail(Error(msg.error.message));else ok(msg.result);
  }
});
function rpc(method,params={},sessionId){
  return new Promise((ok,fail)=>{pending.set(++seq,[ok,fail]);proc.stdio[3].write(JSON.stringify({id:seq,method,params,sessionId})+'\0');});
}
async function page(width){
  const {browserContextId}=await rpc('Target.createBrowserContext');
  const {targetId}=await rpc('Target.createTarget',{url:'about:blank',browserContextId});
  const {sessionId:s}=await rpc('Target.attachToTarget',{targetId,flatten:true});
  await rpc('Emulation.setDeviceMetricsOverride',{width,height:width<500?844:900,deviceScaleFactor:1,mobile:width<500},s);
  const evaluate=async expression=>{
    const r=await rpc('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true},s);
    if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description || 'JavaScript failure');return r.result.value;
  };
  async function wait(expression){
    for(let i=0;i<100;i++){if(await evaluate(expression))return;await new Promise(r=>setTimeout(r,100));}throw Error('Timeout '+expression+' at '+await evaluate('location.href')+' · '+await evaluate('document.body.innerText.slice(-300)'));
  }
  async function visit(address){await rpc('Page.navigate',{url:address},s);await wait('!!document.querySelector("#home")');}
  async function capture(file){await evaluate('Promise.allSettled(document.getAnimations().filter(a => a.effect.getTiming().iterations !== Infinity).map(a => a.finished)).then(() => true)');await writeFile(join(output,file),(await rpc('Page.captureScreenshot',{format:'png'},s)).data,'base64');}
  async function checkTypeface(selector,family){
    await evaluate('document.fonts.ready.then(()=>true)');
    await rpc('DOM.enable',{},s);await rpc('CSS.enable',{},s);
    const {root}=await rpc('DOM.getDocument',{},s);
    const {nodeId}=await rpc('DOM.querySelector',{nodeId:root.nodeId,selector},s);
    const {fonts}=await rpc('CSS.getPlatformFontsForNode',{nodeId},s);
    assert.ok(fonts.some(f=>f.isCustomFont && f.familyName.includes(family) && f.glyphCount>0),
      selector+' should render '+family+'; got '+JSON.stringify(fonts));
  }
  const close = () => rpc('Target.disposeBrowserContext', { browserContextId });
  return {evaluate,wait,visit,capture,checkTypeface,close};
}
const timer=setTimeout(()=>{proc.kill();process.exit(1);},900000);
try{
  const mobile=await page(390);await mobile.visit(url);await mobile.capture('mobile-lounge.png');
  assert.ok(await mobile.evaluate("document.querySelector('header nav').getBoundingClientRect().bottom <= document.querySelector('#landing .libraryHead').getBoundingClientRect().top"), 'mobile navigation should clear the lounge heading');
  assert.equal(await mobile.evaluate('document.documentElement.scrollWidth<=innerWidth'),true);
  await mobile.evaluate("document.querySelector('#guideMenu').click()");
  await mobile.wait("!!document.querySelector('#modal[open]')");
  assert.equal(await mobile.evaluate("getComputedStyle(document.querySelector('#modal .close')).position"), 'absolute');
  await mobile.evaluate("document.querySelector('#modal .close').click()");
  await mobile.wait("!document.querySelector('#modal')");
  await mobile.close();
  const jackarooSizes = capacity === 2 ? [4, 6] : [];
  for(const capacity of jackarooSizes){
  const host=await page(1365);await host.visit(url);await host.evaluate('document.fonts.ready.then(()=>true)');
  await host.checkTypeface('.collection h2','Alexandria');
  await host.checkTypeface('.heroCopy p','Tajawal');
  await host.checkTypeface('#create','Tajawal');
  await host.capture('lounge.png');
  await host.evaluate("document.querySelector('#create').click()");
  await host.wait("!!document.querySelector('#entry')");
  await host.evaluate("document.querySelector('[name=capacity]').value='"+capacity+"';document.querySelector('[name=name]').value='ليلى';document.querySelector('#entry').requestSubmit()");
  await host.wait('!!document.querySelector("#inviteLink")');
  await host.wait('document.querySelector("#inviteQR")?.naturalWidth>0');
  const decoded=await host.evaluate(`(()=>{
    const img=document.querySelector('#inviteQR'),canvas=document.createElement('canvas');
    canvas.width=canvas.height=img.naturalWidth;const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0);
    const pixels=ctx.getImageData(0,0,canvas.width,canvas.height);
    return jsQR(pixels.data,pixels.width,pixels.height).data;})()`);
  assert.equal(decoded,await host.evaluate("document.querySelector('#inviteLink').value"));
  if(capacity===6)await host.capture('invite.png');
  const guests=[];
  for(const name of ['فارس','نور','سلمى','سامي','ريم'].slice(0,capacity-1)){
    const guest=await page(390);guests.push(guest);
    if(guests.length===1){
      await guest.visit(url);
      const png=await host.evaluate("document.querySelector('#inviteQR').src");
      await guest.evaluate("document.querySelector('#join').click()");
      await guest.wait("!!document.querySelector('#scanInvite')");
      await guest.evaluate("document.querySelector('#scanInvite').click()");
      await guest.wait("!!document.querySelector('#qrFile')");
      await guest.evaluate(`(async()=>{
        const blob=await (await fetch(${JSON.stringify(png)})).blob(),dt=new DataTransfer();
        dt.items.add(new File([blob],'invitation.png',{type:'image/png'}));
        const file=document.querySelector('#qrFile');file.files=dt.files;file.dispatchEvent(new Event('change', { bubbles: true }));
      })()`);
      await guest.wait("location.search.includes('room=') && !!document.querySelector('[name=code]')");
    }else await guest.visit(decoded);
    await guest.evaluate("document.querySelector('[name=name]').value="+JSON.stringify(name)+";document.querySelector('#entry').requestSubmit()");
    await guest.wait('!!document.querySelector("#inviteLink")');
  }
  await host.wait('!document.querySelector("#start").disabled');await host.evaluate('document.querySelector("#start").click()');
  await host.wait('!!document.querySelector("#play")');await host.capture(capacity===4?'table.png':'table-six.png');
  await host.evaluate('document.querySelector("#play").click()');
  await guests[0].wait('!!document.querySelector("#play")');
  await guests[0].checkTypeface('.turnMessage strong','Alexandria');
  await guests[0].checkTypeface('.panel h3','Tajawal');
  await guests[0].capture(capacity===4?'mobile-game.png':'mobile-six.png');
  assert.equal(await guests[0].evaluate('document.documentElement.scrollWidth<=innerWidth'),true);
  await guests[0].visit(await guests[0].evaluate('location.origin'));await guests[0].wait('!!document.querySelector("#play")');
  await Promise.all([host,...guests].map(p => p.close()));
  }
  const dealer = await page(1365);
  const rivals = [dealer];
  await dealer.visit(url);
  await dealer.evaluate("document.querySelector('#mercyCreate').click()");
  await dealer.wait("!!document.querySelector('#entry')");
  await dealer.evaluate(`document.querySelector('[name=name]').value='ليلى';document.querySelector('[name=capacity]').value='${capacity}';document.querySelector('#entry').requestSubmit()`);
  await dealer.wait("!!document.querySelector('#inviteLink')");
  const link = await dealer.evaluate("document.querySelector('#inviteLink').value");
  for (const name of ['فارس','نور','سلمى','سامي','ريم'].slice(0, capacity - 1)) {
    await dealer.wait("document.querySelector('#start').disabled");
    const player = await page(390);
    rivals.push(player);
    await player.visit(link);
    await player.evaluate(`document.querySelector('[name=name]').value=${JSON.stringify(name)};document.querySelector('#entry').requestSubmit()`);
    await player.wait("!!document.querySelector('#inviteLink')");
  }
  const guest = rivals[1];
  await dealer.wait("!document.querySelector('#start').disabled");await dealer.evaluate("document.querySelector('#start').click()");
  for(const player of rivals)await player.wait("!!document.querySelector('.mercyArena')");
  await dealer.capture('mercy-table.png');await guest.capture('mercy-mobile.png');
  await guest.evaluate("document.querySelector('#guideMenu').click()");
  await guest.wait("!!document.querySelector('#modal .rules')");
  await guest.evaluate("document.querySelector('#modal .close').click()");
  assert.equal(await guest.evaluate("document.querySelectorAll('.playersRail li').length"), capacity);
  assert.equal(await guest.evaluate("document.querySelector('.tableStatus').getBoundingClientRect().bottom <= document.querySelector('.felt').getBoundingClientRect().top"), true);
  let rev=await dealer.evaluate("Number(document.querySelector('#room').dataset.revision)");
  let ended=false;
  for(let turn=0;turn<1500;turn++){
    await Promise.all(rivals.map(p => p.wait("Number(document.querySelector('#room').dataset.revision)>="+rev)));
    ended=await dealer.evaluate("!!document.querySelector('#start')");
    if(ended)break;
    const current = await dealer.evaluate("Array.from(document.querySelectorAll('.playersRail li')).findIndex(el => el.classList.contains('current'))");
    assert.ok(current >= 0 && current < capacity);
    const player = rivals[current];
    assert.equal(await player.evaluate("document.querySelector('.turnBar strong').textContent"), 'دورك الآن');
    const card=await player.evaluate("!!document.querySelector('.handCard:not(:disabled)')");
    if(card){
      await player.evaluate("document.querySelector('.handCard:not(:disabled)').click()");
      await player.wait("!!document.querySelector('#mercyChoice')");
      await player.evaluate(`(()=>{
        const form=document.querySelector('#mercyChoice');
        const color=form.querySelector('[name=color]');if(color)color.checked=true;
        const uno=form.querySelector('[name=uno]');if(uno)uno.checked=true;
        form.requestSubmit();
      })()`);
    }else{
      await player.evaluate("document.querySelector('[data-mercy-draw]').click()");
      await player.evaluate(`(()=>{
        const form=document.querySelector('#roulettePick');
        if(form){form.querySelector('input').checked=true;form.requestSubmit();}
      })()`);
    }
    rev++;
  }
  assert.ok(ended, 'round should have a winner');
  await dealer.evaluate("document.querySelector('#start').click()");
  await dealer.wait("!document.querySelector('#start') && document.querySelectorAll('.handCard').length===7");
  await guest.visit(await guest.evaluate('location.origin'));await guest.wait("!!document.querySelector('.handCard')");
  assert.equal(await guest.evaluate('document.documentElement.scrollWidth<=innerWidth'),true);
  await dealer.evaluate("document.querySelector('#exitRoom').click()");
  await dealer.wait("!!document.querySelector('#confirmExit')");
  await dealer.evaluate("document.querySelector('#confirmExit').click()");
  await Promise.all(rivals.map(p => p.wait("!!document.querySelector('#landing')")));
  console.log('Verified No Mercy:', capacity, 'independent players, complete game, rematch, reconnect and table closure.');
  await Promise.all(rivals.map(p => p.close()));
} finally {
  clearTimeout(timer);
  if (proc.exitCode === null && proc.signalCode === null) {
    const exited = once(proc, 'exit');
    const forceStop = setTimeout(() => proc.kill('SIGKILL'), 5000);
    try {
      await Promise.race([rpc('Browser.close'), exited]);
      await exited;
    } finally {
      clearTimeout(forceStop);
    }
  }
  // Chromium's child processes can finish writing the profile just after exit.
  await rm(profile, { recursive: true, force: true, maxRetries: 8, retryDelay: 150 });
}
