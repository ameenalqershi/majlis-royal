// Run against an already-running local Majlis server with a Chromium executable.
import {spawn} from 'node:child_process';
import {mkdtemp,writeFile,rm,mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import assert from 'node:assert/strict';
const url=process.env.MAJLIS_URL || 'http://127.0.0.1:8787';
const output=process.env.PREVIEW_DIR || 'build/previews';
await mkdir(output,{recursive:true});
const profile=await mkdtemp(join(tmpdir(),'majlis-browser-'));
const proc=spawn(process.env.CHROME || 'chromium',['--headless','--disable-gpu','--no-sandbox','--disable-dev-shm-usage','--remote-debugging-pipe','--user-data-dir='+profile],{stdio:['ignore','ignore','inherit','pipe','pipe']});
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
    for(let i=0;i<100;i++){if(await evaluate(expression))return;await new Promise(r=>setTimeout(r,100));}throw Error('Timeout '+expression);
  }
  async function visit(address){await rpc('Page.navigate',{url:address},s);await wait('typeof form==="function" && !!invite');}
  async function capture(file){await writeFile(join(output,file),(await rpc('Page.captureScreenshot',{format:'png'},s)).data,'base64');}
  return {evaluate,wait,visit,capture};
}
const timer=setTimeout(()=>{proc.kill();process.exit(1);},60000);
try{
  const host=await page(1365);await host.visit(url);await host.capture('lounge.png');
  await host.evaluate("document.querySelector('#create').click();document.querySelector('[name=name]').value='ليلى';document.querySelector('#entry').requestSubmit()");
  await host.wait('!!document.querySelector("#inviteLink")');
  const code=await host.evaluate('session.code');
  const guests=[];
  for(const name of ['فارس','نور','سلمى']){
    const guest=await page(390);guests.push(guest);
    await guest.visit(url+'/?room='+code);
    await guest.evaluate("document.querySelector('[name=name]').value="+JSON.stringify(name)+";document.querySelector('#entry').requestSubmit()");
    await guest.wait('!!document.querySelector("#inviteLink")');
  }
  await host.wait('!document.querySelector("#start").disabled');await host.evaluate('document.querySelector("#start").click()');
  await host.wait('!!document.querySelector("#play")');await host.capture('table.png');
  await host.evaluate('document.querySelector("#play").click()');
  await guests[0].wait('!!document.querySelector("#play")');
  await guests[0].capture('mobile-game.png');
  assert.equal(await guests[0].evaluate('document.documentElement.scrollWidth<=innerWidth'),true);
  await guests[0].visit(url);await guests[0].wait('!!document.querySelector("#play")');
  const mobile=await page(390);await mobile.visit(url);await mobile.capture('mobile-lounge.png');
  assert.equal(await mobile.evaluate('document.documentElement.scrollWidth<=innerWidth'),true);
  console.log('Verified four browser seats, move synchronization, reconnect, mobile layout and four screenshots.');
}finally{clearTimeout(timer);proc.kill();await new Promise(r=>proc.once('exit',r));await rm(profile,{recursive:true,force:true});}
