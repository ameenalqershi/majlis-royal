import { TableRules } from '../../core/table-rules.js';
import { makeBoardGeometry } from './geometry.js';
const marbleSurface=new Image();
marbleSurface.src='/marble.png';
export function drawBoard(canvas, positions, selected=[], targets=[], last=null) {
  const lettering='700 43px Alexandria';
  if(!document.fonts.check(lettering,'مجلس')){
    document.fonts.load(lettering,'مجلس').then(()=>{
      if(canvas.isConnected)drawBoard(canvas,positions,selected,targets,last);
    }).catch(()=>{});
  }
  const c=canvas.getContext('2d'), size=800, mid=size/2;
  canvas.width=canvas.height=size;
  const seats=positions.length/4;
  const {length,track,home,safe,rotate}=makeBoardGeometry(seats);
  const radius=seats===6?8:11;
  const metals=['#438b66','#ac4c58','#528da6','#c89c4d','#a675bd','#dc825c'];
  const pale=['#b4f2cb','#ffc4bc','#afe1ec','#ffdf9e','#ead5ff','#ffdfbb'];
  const tau=Math.PI*2;

  function circle(x,y,r,fill,stroke) {
    c.beginPath();c.arc(x,y,r,0,tau);
    if(fill){c.fillStyle=fill;c.fill();}
    if(stroke){c.strokeStyle=stroke;c.stroke();}
  }
  const bg=c.createLinearGradient(0,0,800,700);
  bg.addColorStop(0,'#344c40');bg.addColorStop(.35,'#172e27');bg.addColorStop(.7,'#283a32');bg.addColorStop(1,'#10231f');
  c.fillStyle=bg;c.fillRect(0,0,size,size);
  if(marbleSurface.complete && marbleSurface.naturalWidth){
    c.drawImage(marbleSurface,0,0,size,size);
    c.fillStyle='rgba(9,27,23,.24)';c.fillRect(0,0,size,size);
  }else if(!marbleSurface.complete){
    marbleSurface.onload=()=>{if(canvas.isConnected)drawBoard(canvas,positions,selected,targets,last);};
  }
  c.lineWidth=1;c.strokeStyle='#b29d71';c.strokeRect(12,12,776,776);c.strokeRect(17,17,766,766);
  function path(points,width,color,close=false){
    c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));
    if(close)c.closePath();c.lineJoin='round';c.lineCap='round';c.lineWidth=width;c.strokeStyle=color;c.stroke();
  }
  const route=Array.from({length},(_,i)=>track(i));
  // A stepped brass setting surrounds the entire raceway and each safe lane.
  path(route,radius*2+17,'#604e32',true);
  path(route,radius*2+13,'#d1b881',true);
  path(route,radius*2+10,'#293a32',true);
  for(let s=0;s<seats;s++){
    const gate=track((s*TableRules.sector+length-1)%length);
    const lane=[gate,...Array.from({length:4},(_,i)=>safe(s,i))];
    path(lane,radius*2+7,metals[s]);path(lane,radius*2+3,'#25342e');
    const center=rotate(s,seats===4?[120,-334]:[62,-252]);
    const tray=seats===4?40:33;
    c.save();c.translate(...center);c.rotate(s*tau/seats+(seats===4?-Math.PI/4:0));
    c.fillStyle='#19261f';c.strokeStyle=metals[s];c.lineWidth=2;
    c.fillRect(-tray,-tray,2*tray,2*tray);c.strokeRect(-tray,-tray,2*tray,2*tray);c.restore();
  }
  function hole([x,y],accent='#9e9270') {
    const g=c.createLinearGradient(x,y-12,x,y+12);
    g.addColorStop(0,'#071711');g.addColorStop(.8,'#2a3c31');g.addColorStop(1,'#64735f');
    c.lineWidth=1.7;circle(x,y,radius,g,accent);
  }
  for(let i=0;i<length;i++)hole(track(i),i%TableRules.sector===0?metals[i/TableRules.sector]:'#9b927366');
  for(let s=0;s<seats;s++)for(let i=0;i<4;i++){hole(home(s,i),metals[s]);hole(safe(s,i),metals[s]);}
  [109,101,94].forEach((r,i)=>{c.lineWidth=i===1?2:1;circle(mid,mid,r,i===0?'#182e26':null,'#b59d6e');});
  c.textAlign='center';
  if(!last){
  c.fillStyle='#ccad73';c.font='30px Georgia';c.fillText('✥',mid,mid-29);
  c.font='700 43px Alexandria,sans-serif';c.fillStyle='#efe3c5';c.fillText('مَجلس',mid,mid+20);
  c.font='13px Georgia';c.fillStyle='#d2bb8e';c.fillText('J A C K A R O O',mid,mid+47);
  }else{
    c.save();c.translate(mid,mid);c.rotate(-.09);
    c.fillStyle='#ede3ca';c.fillRect(-31,-44,62,88);c.strokeStyle='#a88a53';c.strokeRect(-27,-40,54,80);
    c.fillStyle=/[♥♦]/.test(last.card)?'#942f43':'#163b32';c.font='bold 29px Georgia';
    c.fillText(last.card.slice(0,-1),0,-4);c.fillText(last.card.slice(-1),0,28);c.restore();
    c.font='650 22px Alexandria,sans-serif';c.fillStyle='#dec99e';c.fillText('آخر ورقة',mid,mid+76);
  }
  function locate(id,p){
    const s=Math.floor(id/4);
    return p<0?home(s,id%4):p>=length?safe(s,p-length):track((p+s*TableRules.sector)%length);
  }
  targets.forEach((p,i)=>{
    const [x,y]=locate(selected[i],p);c.lineWidth=3;c.setLineDash([3,3]);
    circle(x,y,15,'#e3c6764d','#fbe2a0');c.setLineDash([]);
  });
  canvas.marbleCenters=positions.map((p,id)=>locate(id,p));
  positions.forEach((p,id)=>{
    const s=Math.floor(id/4);
    const [x,y]=canvas.marbleCenters[id];
    if(selected.includes(id)){c.lineWidth=3;circle(x,y,18,null,'#fff3bc');}
    const g=c.createRadialGradient(x-5,y-6,1,x,y,15);
    g.addColorStop(0,'#fff8d9');g.addColorStop(.14,pale[s]);g.addColorStop(.48,metals[s]);g.addColorStop(1,'#10211d');
    c.shadowColor='#070d09';c.shadowBlur=5;c.shadowOffsetY=3;circle(x,y,radius+2,g);c.shadowBlur=0;c.shadowOffsetY=0;
    c.font='bold '+(seats===6?11:13)+'px Arial';c.fillStyle='#fff';c.fillText(String(id%4+1),x,y+5);
  });
}
