import { useEffect, useRef, useState } from 'react';
import { parseInvite } from './core/invite';

export function Scanner() {
  const video = useRef(null);
  const stream = useRef(null);
  const frame = useRef(0);
  const [active, setActive] = useState(false);
  const [message, setMessage] = useState('');

  function stop() {
    stream.current?.getTracks().forEach(track => track.stop());
    cancelAnimationFrame(frame.current);
    if (video.current) video.current.srcObject = null;
  }
  useEffect(() => stop, []);

  function decode(source, width, height) {
    const canvas = document.createElement('canvas');
    const scale = Math.min(1, 1000 / Math.max(width, height));
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const qr = window.jsQR(pixels.data, pixels.width, pixels.height, { inversionAttempts: 'dontInvert' });
    const link = qr && parseInvite(qr.data);
    if (!link) return false;
    stop();
    location.assign(link);
    return true;
  }

  async function camera() {
    if (!navigator.mediaDevices?.getUserMedia) {
      setMessage('افتح كاميرا هاتفك مباشرة وامسح الرمز، أو اختر صورته هنا.');
      return;
    }
    setActive(true);
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
      if (!video.current) return stop();
      video.current.srcObject = stream.current;
      await video.current.play();
      let last = 0;
      function scan(now) {
        const el = video.current;
        if (!el) return;
        if (el.videoWidth && now - last > 160) {
          last = now;
          if (decode(el, el.videoWidth, el.videoHeight)) return;
        }
        frame.current = requestAnimationFrame(scan);
      }
      frame.current = requestAnimationFrame(scan);
    } catch {
      stop();
      setActive(false);
      setMessage('تعذّر فتح الكاميرا. يمكنك اختيار صورة أو استخدام كاميرا الهاتف مباشرة.');
    }
  }

  async function scanFile(event) {
    const file = event.target.files[0];
    if (!file) return;
    let bitmap;
    try {
      bitmap = await createImageBitmap(file);
      if (video.current && !decode(bitmap, bitmap.width, bitmap.height)) setMessage('لم يظهر رمز دعوة مجلس بوضوح. اختر صورة أقرب للرمز.');
    } catch {
      setMessage('تعذّرت قراءة الصورة.');
    } finally {
      bitmap?.close();
    }
  }

  return <><h2>مسح دعوة الطاولة</h2><p>وجّه الكاميرا إلى الرمز على جهاز المضيف، أو اختر صورة للرمز.</p>
    <video className="scanVideo" ref={video} hidden={!active} muted playsInline/>
    <div className="scanTools"><button className="solid" disabled={active} onClick={camera}>فتح الكاميرا</button>
      <label className="light">اختيار صورة<input id="qrFile" type="file" accept="image/*" hidden onChange={scanFile}/></label>
    </div><p role="status">{message}</p></>;
}
