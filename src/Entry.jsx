import { useState } from 'react';

export function Entry({ mode, kind, code, enter, onClose, onScan }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const join = mode === 'join';
  const mercy = kind === 'mercy';
  async function submit(event) {
    event.preventDefault();
    if (saving) return;
    const fields = new FormData(event.currentTarget);
    const data = { name: fields.get('name') };
    if (join) data.code = fields.get('code').trim().toUpperCase();
    else Object.assign(data, { kind, capacity: Number(fields.get('capacity')) });
    setSaving(true);
    setError('');
    try {
      await enter(mode, data);
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }
  return <><h2>{join ? 'انضم إلى طاولة' : mercy ? 'طاولة أونو لا ترحم' : 'طاولة جاكارو'}</h2>
    <form id="entry" onSubmit={submit}>
      <label className="field">اسم اللاعب<input name="name" required maxLength={24} autoComplete="nickname"/></label>
      {join ? <>
        <label className="field">رمز الطاولة<input dir="ltr" name="code" required maxLength={6} minLength={6} pattern="[a-fA-F0-9]{6}" defaultValue={code || ''}/></label>
        <button type="button" className="light" id="scanInvite" onClick={onScan}>مسح رمز الدعوة</button>
      </> : <label className="field">عدد اللاعبين<select name="capacity">
        {mercy ? [2,3,4,5,6].map(n => <option key={n} value={n}>{n} لاعبين</option>) : <>
          <option value="4">أربعة لاعبين · فريقان</option><option value="6">ستة لاعبين · ثلاثة فرق</option></>}
      </select></label>}
      <p className="hint">اتصلوا بشبكة واي فاي واحدة أو بنقطة اتصال المضيف.</p>
      <p role="alert" className="err">{error}</p>
      <button className="gold" disabled={saving}>{join ? 'تأكيد الانضمام' : 'افتح الطاولة'}</button>
    </form></>;
}
