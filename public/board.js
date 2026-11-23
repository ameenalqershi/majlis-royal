const marbleSurface=new Image();
marbleSurface.src='/marble.png';
function drawBoard(canvas, positions, selected=[], targets=[]) {
  const c=canvas.getContext('2d'), size=800, mid=size/2;
  canvas.width=canvas.height=size;
  const metals=['#438b66','#ac4c58','#528da6','#c89c4d'];
  const pale=['#b4f2cb','#ffc4bc','#afe1ec','#ffdf9e'];
  const tau=Math.PI*2;
  function at(a,r){return [mid+Math.cos(a)*r,mid+Math.sin(a)*r];}
  function circle(x,y,r,fill,stroke) {
    c.beginPath();c.arc(x,y,r,0,tau);
    if(fill){c.fillStyle=fill;c.fill();}
    if(stroke){c.strokeStyle=stroke;c.stroke();}
  }
  function track(i) {
    const a=i*tau/64-Math.PI/2;
    return at(a,291+22*Math.cos(a*4));
  }
  function safe(s,i){return at((s*16+63)*tau/64-Math.PI/2,264-i*32);}
  function home(s,i){
    const a=(s+0.5)*Math.PI/2-Math.PI/2;
    const [x,y]=at(a,421);
    return [x+(i%2-.5)*34,y+(Math.floor(i/2)-.5)*34];
  }
  const bg=c.createLinearGradient(0,0,800,700);
  bg.addColorStop(0,'#344c40');bg.addColorStop(.35,'#172e27');bg.addColorStop(.7,'#283a32');bg.addColorStop(1,'#10231f');
  c.fillStyle=bg;c.fillRect(0,0,size,size);
  if(marbleSurface.complete && marbleSurface.naturalWidth){
    c.drawImage(marbleSurface,0,0,size,size);
    c.fillStyle='rgba(9,27,23,.24)';c.fillRect(0,0,size,size);
  }else if(!marbleSurface.complete){
    marbleSurface.onload=()=>{if(canvas.isConnected)drawBoard(canvas,positions,selected,targets);};
  }
  c.lineWidth=1;c.strokeStyle='#b29d71';c.strokeRect(12,12,776,776);c.strokeRect(17,17,766,766);
  c.beginPath();for(let i=0;i<=64;i++){const [x,y]=track(i%64);if(i)c.lineTo(x,y);else c.moveTo(x,y);}
  c.strokeStyle='#c6ae6155';c.lineWidth=3;c.stroke();
  function hole([x,y],accent='#9e9270') {
    const g=c.createLinearGradient(x,y-12,x,y+12);
    g.addColorStop(0,'#071711');g.addColorStop(.8,'#2a3c31');g.addColorStop(1,'#64735f');
    c.lineWidth=1.7;circle(x,y,11,g,accent);
  }
  for(let i=0;i<64;i++)hole(track(i),i%16===0?metals[i/16]:'#9b927366');
  for(let s=0;s<4;s++)for(let i=0;i<4;i++){hole(home(s,i),metals[s]);hole(safe(s,i),metals[s]);}
  [109,101,94].forEach((r,i)=>{c.lineWidth=i===1?2:1;circle(mid,mid,r,i===0?'#182e26':null,'#b59d6e');});
  c.textAlign='center';c.fillStyle='#ccad73';c.font='30px Georgia';c.fillText('✥',mid,mid-29);
  c.font='bold 45px Georgia';c.fillStyle='#efe3c5';c.fillText('مَجلس',mid,mid+20);
  c.font='13px Georgia';c.fillStyle='#d2bb8e';c.fillText('J A C K A R O O',mid,mid+47);
  function locate(id,p){
    const s=Math.floor(id/4);
    return p<0?home(s,id%4):p>=64?safe(s,p-64):track((p+s*16)%64);
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
    c.shadowColor='#070d09';c.shadowBlur=5;c.shadowOffsetY=3;circle(x,y,13,g);c.shadowBlur=0;c.shadowOffsetY=0;
    c.font='bold 13px Arial';c.fillStyle='#fff';c.fillText(String(id%4+1),x,y+5);
  });
}
