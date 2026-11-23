import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {networkInterfaces} from 'node:os';
import {webcrypto} from 'node:crypto';
import './public/table-rules.js';
import './core/game.js';
import './core/rooms.js';
if(!globalThis.crypto) globalThis.crypto=webcrypto;
const port=Number(process.env.PORT || 8787);
const urls=()=>Object.values(networkInterfaces()).flat().filter(a=>a.family==='IPv4'&&!a.internal).map(a=>'http://'+a.address+':'+port);
const types={html:'text/html; charset=utf-8',js:'text/javascript; charset=utf-8',css:'text/css',png:'image/png',webp:'image/webp',ttf:'font/ttf',svg:'image/svg+xml'};
const server=http.createServer(async(req,res)=>{
  res.setHeader('Cache-Control','no-store');
  try {
    const path=new URL(req.url,'http://localhost').pathname;
    if(path.startsWith('/api/')) {
      if(req.method!=='POST' || req.headers['content-type']!=='application/json') throw Error('طلب غير صالح');
      const chunks=[];
      let bytes=0;
      for await(const chunk of req){
        bytes+=chunk.length;
        if(bytes>4096)throw Error('طلب طويل');
        chunks.push(chunk);
      }
      const body=Buffer.concat(chunks).toString('utf8');
      const action=path.slice(5);
      const value=action==='network'?{urls:urls()}:Majlis.request(action,JSON.parse(body));
      res.setHeader('Content-Type','application/json');
      return res.end(JSON.stringify(value));
    }
    const file=path==='/'?'index.html':path.slice(1);
    if(!/^[\w.-]+$/.test(file) || !types[file.split('.').pop()]) throw Error('ملف غير متاح');
    const data=await readFile(new URL('./public/'+file,import.meta.url));
    res.setHeader('Content-Type',types[file.split('.').pop()]);
    res.end(data);
  } catch(e) {res.writeHead(400,{'Content-Type':'application/json'});res.end(JSON.stringify({error:e.message}));}
});
server.listen(port,process.env.BIND_ADDRESS || '0.0.0.0',()=>console.log(['http://localhost:'+port,...urls()].join('\n')));
