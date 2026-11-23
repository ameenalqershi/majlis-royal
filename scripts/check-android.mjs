// Exercise the installed APK, its visible WebView, and the host running inside it.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { setTimeout as delay } from 'node:timers/promises';

const apk = process.argv[2] ?? 'build/android/majlis.apk';
const adb = (...args) => execFileSync('adb', args, { encoding: 'utf8', timeout: 30_000 });
const port = adb('forward', 'tcp:0', 'tcp:8787').trim();
const origin = 'http://127.0.0.1:' + port;
const diagnostics = 'build/android/diagnostics';

async function request(action, input = {}) {
  const response = await fetch(origin + '/api/' + action, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
    signal: AbortSignal.timeout(8000),
  });
  const value = await response.json();
  assert.ok(response.ok && !value.error, action + ': ' + JSON.stringify(value));
  return value;
}

async function waitForLounge() {
  for (let attempt = 0; attempt < 30; attempt++) {
    // The UI tree includes WebView content once React has rendered.
    const dump = adb('shell', 'uiautomator', 'dump', '/sdcard/majlis-ui.xml');
    if (dump.includes('dumped')) {
      const ui = adb('shell', 'cat', '/sdcard/majlis-ui.xml');
      if (ui.includes('العب أونو') && ui.includes('العب جاكارو')) return;
    }
    await delay(1000);
  }
  throw new Error('The Android lounge did not display both games');
}

async function exerciseTable(kind, capacity) {
  const host = await request('create', { name: 'مضيف', kind, capacity });
  try {
    const guests = [];
    for (let i = 1; i < capacity; i++) {
      guests.push(await request('join', { code: host.code, name: 'ضيف ' + i }));
    }
    const state = await request('start', host);
    assert.equal(state.kind, kind);
    assert.equal(state.players.length, capacity);
    const guestState = await request('state', guests[0]);
    assert.equal(guestState.seat, 1);
    assert.equal(guestState.rev, state.rev);
    if (kind === 'mercy') {
      assert.equal(guestState.game.hand.length, 7);
    } else {
      assert.equal(state.game.board.length, capacity * 4);
      const card = state.game.moves.findIndex(moves => moves.length);
      assert.ok(card >= 0);
      const next = await request('play', { ...host, card, move: 0, rev: state.rev });
      assert.equal(next.game.turn, 1);
      assert.equal((await request('state', guests[0])).rev, next.rev);
    }
  } finally {
    await request('leave', host);
  }
}

try {
  adb('install', '-r', apk);
  adb('shell', 'am', 'start', '-W', '-n', 'games.majlis.royal/games.majlis.MainActivity');
  await waitForLounge();
  await exerciseTable('jackaroo', 4);
  await exerciseTable('mercy', 2);
  console.log('Verified the installed APK, Arabic lounge, native LAN host and both engines.');
} catch (error) {
  mkdirSync(diagnostics, { recursive: true });
  try {
    writeFileSync(diagnostics + '/logcat.txt', adb('logcat', '-d', '-t', '1000'));
    adb('pull', '/sdcard/majlis-ui.xml', diagnostics + '/ui.xml');
  } catch (diagnosticError) {
    console.error('Could not collect all Android diagnostics:', diagnosticError.message);
  }
  throw error;
} finally {
  adb('forward', '--remove', 'tcp:' + port);
}
