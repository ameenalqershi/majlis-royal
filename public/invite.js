// Both the encoder and decoder ship with the app and work without Internet.
function inviteImage(link) {
  const qr=qrcode(0,'M');qr.addData(link);qr.make();
  const cells=qr.getModuleCount(),scale=8,margin=4;
  const canvas=document.createElement('canvas');
  canvas.width=canvas.height=(cells+margin*2)*scale;
  const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle='#10291f';
  for(let y=0;y<cells;y++)for(let x=0;x<cells;x++)if(qr.isDark(y,x))ctx.fillRect((x+margin)*scale,(y+margin)*scale,scale,scale);
  return canvas.toDataURL('image/png');
}
function parseInvite(raw) {
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
function openScanner(){
  show('<h2>مسح دعوة الطاولة</h2><p>وجّه الكاميرا إلى الرمز على جهاز المضيف، أو اختر صورة للرمز.</p><video class="scanVideo" hidden muted playsinline></video><div class="scanTools"><button class="solid" id="camera">فتح الكاميرا</button><label class="light">اختيار صورة<input id="qrFile" type="file" accept="image/*" hidden></label></div><p id="scanMsg" role="status"></p>');
  const video=body.querySelector('video'),msg=$('scanMsg'),camera=$('camera');
  let stream,frame,done=false;
  const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d',{willReadFrequently:true});
  function stop(){stream?.getTracks().forEach(t=>t.stop());cancelAnimationFrame(frame);video.srcObject=null;video.hidden=true;}
  const close=()=>{done=true;stop();};modal.addEventListener('close',close,{once:true});
  function decode(src,width,height){
    const scale=Math.min(1,1000/Math.max(width,height));canvas.width=Math.round(width*scale);canvas.height=Math.round(height*scale);
    ctx.drawImage(src,0,0,canvas.width,canvas.height);
    const pixels=ctx.getImageData(0,0,canvas.width,canvas.height);
    const result=jsQR(pixels.data,pixels.width,pixels.height,{inversionAttempts:'dontInvert'});
    const link=result&&parseInvite(result.data);
    if(!link)return false;
    done=true;stop();modal.close();location.assign(link);return true;
  }
  camera.onclick=async()=>{
    if(!navigator.mediaDevices?.getUserMedia){msg.textContent='افتح كاميرا هاتفك مباشرة وامسح الرمز، أو اختر صورته هنا.';return;}
    camera.disabled=true;
    try{
      stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}},audio:false});
      if(done||!video.isConnected){stop();return;}
      video.srcObject=stream;video.hidden=false;await video.play();
      let last=0;
      const read=now=>{
        if(done || !modal.open || !video.isConnected){stop();return;}
        if(video.videoWidth && now-last>160){last=now;if(decode(video,video.videoWidth,video.videoHeight))return;}
        frame=requestAnimationFrame(read);
      };
      frame=requestAnimationFrame(read);
    }catch{stop();camera.disabled=false;msg.textContent='تعذّر فتح الكاميرا. يمكنك اختيار صورة أو استخدام كاميرا الهاتف مباشرة.';}
  };
  $('qrFile').onchange=async e=>{
    const file=e.target.files[0];if(!file)return;
    let bitmap;
    try{bitmap=await createImageBitmap(file);if(!done && !decode(bitmap,bitmap.width,bitmap.height))msg.textContent='لم يظهر رمز دعوة مجلس بوضوح. اختر صورة أقرب للرمز.';}
    catch{msg.textContent='تعذّرت قراءة الصورة.';}finally{bitmap?.close();}
  };
}
