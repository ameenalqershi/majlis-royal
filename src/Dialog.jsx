import { useLayoutEffect, useRef } from 'react';

export function Dialog({ children, onClose, label }) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    const dialog = ref.current;
    dialog.showModal();
    return () => dialog.close();
  }, []);
  return <dialog id="modal" ref={ref} aria-label={label} onCancel={e => { e.preventDefault(); onClose(); }}>
    <button type="button" className="close" aria-label="إغلاق" onClick={onClose}>×</button>
    <div id="dialogBody">{children}</div>
  </dialog>;
}
