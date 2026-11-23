// Both the encoder and decoder ship with the app and work without Internet.
export function inviteImage(link) {
  const qr=qrcode(0,'M');qr.addData(link);qr.make();
  const cells=qr.getModuleCount(),scale=8,margin=4;
  const canvas=document.createElement('canvas');
  canvas.width=canvas.height=(cells+margin*2)*scale;
  const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle='#10291f';
  for(let y=0;y<cells;y++)for(let x=0;x<cells;x++)if(qr.isDark(y,x))ctx.fillRect((x+margin)*scale,(y+margin)*scale,scale,scale);
  return canvas.toDataURL('image/png');
}
export function parseInvite(raw) {
  try{
    const u=new URL(raw);
    const ipv4=/^(?:\d{1,3}\.){3}\d{1,3}$/.test(u.hostname);
    const local=(ipv4 && /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(u.hostname))||u.hostname.endsWith('.local');
    if(!['http:','https:'].includes(u.protocol)||u.username||u.password||u.pathname!=='/'||(!local&&u.origin!==location.origin))return;
    const code=u.searchParams.get('room');
    if(!/^[A-F\d]{6}$/i.test(code||''))return;
    return u.origin+'/?room='+code.toUpperCase();
  }catch{return;}
}
