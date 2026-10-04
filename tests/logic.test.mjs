import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { isTikTokInAppBrowser, detectDevice, isIOS, isAndroid, isTikTokBrowser, whatsappLinks, boot } from '../script.js';
import { CONFIG } from '../config.js';
export const agents = {
  iosTikTok: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 musical_ly_2023501030 JsSdk/1.0 NetType/WIFI Safari/604.1',
  androidTikTok: 'Mozilla/5.0 (Linux; Android 14; Pixel 8 Build/AP1A; wv) AppleWebKit/537.36 Version/4.0 Chrome/125.0 Mobile Safari/537.36 trill/202350 TikTok 35.0',
  safari: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1',
  android: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/125.0 Mobile Safari/537.36',
  desktop: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125.0 Safari/537.36'
};
test('five required user agents', () => {
  for (const [name, userAgent] of Object.entries(agents)) {
    const d = detectDevice({ userAgent });
    assert.equal(d.tiktok, name.includes('TikTok'));
    assert.equal(d.normal, !name.includes('TikTok'));
    assert.equal(d.os, name === 'desktop' ? 'desktop' : name.startsWith('android') ? 'android' : 'ios');
  }
});
test('UA hints, iPad desktop UA and TikTok alternate tokens', () => {
  assert.equal(isAndroid({ userAgentData: { platform: 'Android' } }), true);
  assert.equal(isIOS({ platform: 'MacIntel', maxTouchPoints: 5 }), true);
  for (const token of ['BytedanceWebview', 'ByteLocale', 'Aweme', 'musical.ly', 'Trill/']) assert.ok(isTikTokBrowser({ userAgent: token }));
  assert.equal(detectDevice({}).os, 'unknown');
  assert.equal(detectDevice({ userAgent: agents.android + ' Instagram' }).normal, false);
});
test('exact destination, encoding, generated no-JS fallback', async () => {
  const links = whatsappLinks();
  const url = new URL(links.web);
  assert.equal(url.hostname, 'wa.me');
  assert.equal(url.pathname, '/393333379939');
  assert.equal(url.searchParams.get('text'), CONFIG.whatsappMessage);
  assert.equal([...url.searchParams].length, 1);
  assert.ok((await readFile(new URL('../index.html', import.meta.url), 'utf8')).includes(links.web));
  assert.equal(new URL(links.app).searchParams.get('text'), CONFIG.whatsappMessage);
});

function harness(userAgent = agents.safari, options = {}) {
  const listeners = {}, timers = new Map(), calls = [], elements = new Map();
  let id = 0;
  const element = () => ({ textContent: '', hidden: true, dataset: {}, removeAttribute() {}, querySelector: () => element(), querySelectorAll: () => [element(), element(), element()], addEventListener(type, fn) { this[type] = fn; } });
  const doc = { body: element(), visibilityState: 'visible', querySelector(s) { if (!elements.has(s)) elements.set(s, element()); return elements.get(s); }, addEventListener(t, fn) { listeners[t] = fn; } };
  const data = new Map();
  const win = { location: { href: 'https://example.org/?utm_source=tiktok&utm_campaign=bio', assign: url => calls.push(url) },
    sessionStorage: { getItem: k => { if (options.blockStorage) throw Error(); return data.get(k); }, setItem: (k,v) => { if (options.blockStorage) throw Error(); data.set(k,v); } },
    history: { state: null, replaceState(state, _, url) { this.state = state; assert.equal(url, win.location.href); } },
    performance: { getEntriesByType: () => [{ type: options.navigation || 'navigate' }] },
    setTimeout: fn => { timers.set(++id, fn); return id; }, clearTimeout: id => timers.delete(id), addEventListener: (t,fn) => { listeners[t] = fn; } };
  const app = boot(win, doc, { userAgent });
  return { app, win, doc, calls, listeners, flush() { const list = [...timers.values()]; timers.clear(); list.forEach(fn => fn()); } };
}
test('automatic mobile redirect only once and parameters preserved', () => {
  const h = harness(); h.flush(); h.app.openWhatsApp({ automatic: true });
  assert.deepEqual(h.calls, [whatsappLinks().web]);
  boot(h.win, h.doc, { userAgent: agents.safari }); h.flush();
  assert.equal(h.calls.length, 1);
  assert.ok(h.win.location.href.includes('utm_campaign=bio'));
});
test('TikTok, desktop and unknown never auto-redirect', () => {
  for (const agent of [agents.iosTikTok, agents.androidTikTok, agents.desktop, 'unknown']) {
    const h = harness(agent); h.flush(); assert.equal(h.calls.length, 0);
  }
});
test('manual app attempt falls back to HTTPS', () => {
  const h = harness(); h.app.openWhatsApp();
  assert.equal(h.calls[0], whatsappLinks().app); h.flush();
  assert.equal(h.calls[1], whatsappLinks().web);
});
test('app switch cancels fallback and back-forward cache does not reopen', () => {
  const h = harness(); h.app.openWhatsApp(); h.doc.visibilityState = 'hidden';
  h.listeners.visibilitychange(); h.flush(); assert.equal(h.calls.length, 1);
  h.listeners.pageshow({ persisted: true }); h.flush(); assert.equal(h.calls.length, 1);
});
test('blocked storage and reload/back navigation remain safe', () => {
  for (const navigation of ['reload', 'back_forward']) {
    const h = harness(agents.safari, { blockStorage: true, navigation }); h.flush(); assert.equal(h.calls.length, 0);
  }
  const h = harness(agents.safari, { blockStorage: true }); h.flush();
  boot(h.win, h.doc, { userAgent: agents.safari }); h.flush(); assert.equal(h.calls.length, 1);
});
test('page hidden before opening cancels scheduled navigation', () => {
  const h = harness(); h.doc.visibilityState = 'hidden'; h.listeners.visibilitychange(); h.flush(); assert.equal(h.calls.length, 0);
});

test('combined TikTok detection and external browser handoff', () => {
  for (const token of ['TikTok', 'MUSICAL_LY', 'Bytedance', 'BytedanceWebview', 'trill', 'musically']) {
    assert.equal(isTikTokInAppBrowser({ userAgent: token }), true);
  }
  const iosWebview = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148';
  const androidWebview = agents.android + '; wv)';
  for (const ref of ['https://tiktok.com/', 'https://vm.tiktok.com/abc']) {
    for (const userAgent of [iosWebview, androidWebview]) assert.equal(isTikTokInAppBrowser({ userAgent }, ref), true);
    for (const userAgent of [agents.safari, agents.android, agents.desktop]) assert.equal(isTikTokInAppBrowser({ userAgent }, ref), false);
  }
  for (const ref of ['', 'https://tiktok.com.attacker.test/', 'invalid']) assert.equal(isTikTokInAppBrowser({ userAgent: iosWebview }, ref), false);
});
test('debug is opt-in and includes detection evidence', () => {
  const h = harness(agents.iosTikTok);
  assert.equal(h.doc.querySelector('#debug').hidden, true);
  h.win.location.href += '&debug=1';
  boot(h.win, h.doc, { userAgent: agents.iosTikTok });
  assert.equal(h.doc.querySelector('#debug').hidden, false);
  assert.match(h.doc.querySelector('#debug').textContent, /Device: iOS/);
  assert.match(h.doc.querySelector('#debug').textContent, /TikTok browser: true/);
  assert.match(h.doc.querySelector('#debug').textContent, /Referrer:/);
});
