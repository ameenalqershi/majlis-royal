import { useCallback, useEffect, useRef, useState } from 'react';

const storageKey = 'majlis-seat-v1';

export async function request(action, data = {}, signal) {
  const response = await fetch('/api/' + action, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    signal,
  });
  const value = await response.json();
  if (!response.ok || value.error) throw new Error(value.error || 'تعذّر الاتصال');
  return value;
}

function readSeat() {
  try {
    const seat = JSON.parse(localStorage.getItem(storageKey));
    return seat?.token && seat?.code ? seat : null;
  } catch {
    return null;
  }
}

export function useTable(invited, notify) {
  const [seat, setSeat] = useState(readSeat);
  const [open, setOpen] = useState(() => Boolean(seat && (!invited || invited === seat.code)));
  const [state, setState] = useState(null);
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);

  const clear = useCallback(() => {
    localStorage.removeItem(storageKey);
    setSeat(null);
    setState(null);
    setOpen(false);
  }, []);

  const accept = useCallback(next => {
    setState(previous => previous?.code === next.code && previous.rev >= next.rev ? previous : next);
  }, []);

  useEffect(() => {
    if (!seat || !open) return;
    const controller = new AbortController();
    let timer;
    async function refresh() {
      try {
        const next = await request('state', seat, controller.signal);
        if (!controller.signal.aborted) accept(next);
      } catch (error) {
        if (controller.signal.aborted) return;
        if (/العثور|انتهت/.test(error.message)) clear();
        notify(error.message);
      } finally {
        if (!controller.signal.aborted) timer = setTimeout(refresh, 1000);
      }
    }
    refresh();
    return () => { controller.abort(); clearTimeout(timer); };
  }, [seat, open, accept, clear, notify]);

  async function enter(action, data) {
    const next = await request(action, data);
    localStorage.setItem(storageKey, JSON.stringify(next));
    history.replaceState(null, '', '/');
    setState(null);
    setSeat(next);
    setOpen(true);
  }

  async function act(action, data = {}) {
    if (pending.current) return false;
    pending.current = true;
    setBusy(true);
    try {
      const next = await request(action, { ...seat, ...data });
      if (action === 'leave') clear();
      else accept(next);
      return true;
    } catch (error) {
      notify(error.message);
      return false;
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return { seat, state, open, setOpen, enter, act, busy };
}
