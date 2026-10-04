import { CONFIG } from './config.js';

const ua = (nav) => String(nav.userAgent || '');
export function isIOS(nav = navigator) {
  return /iPhone|iPad|iPod/i.test(ua(nav)) ||
    (/Mac/i.test(nav.platform || nav.userAgentData?.platform || '') && nav.maxTouchPoints > 1);
}
export function isAndroid(nav = navigator) {
  return /Android/i.test(ua(nav)) || /Android/i.test(nav.userAgentData?.platform || '');
}
export function isTikTokInAppBrowser(nav = navigator, referrer = typeof document !== 'undefined' ? document.referrer : '') {
  const agent = ua(nav);
  if (/TikTok|musical_ly|musical\.ly|Bytedance|trill|musically|ByteLocale|Aweme/i.test(agent)) return true;
  let fromTikTok = false;
  try { const host = new URL(referrer).hostname; fromTikTok = host === 'tiktok.com' || host.endsWith('.tiktok.com'); } catch { /* Empty or invalid referrer. */ }
  // A TikTok referrer alone must not trap a genuine external browser in the guide.
  const webview = /; wv\)|WebView/i.test(agent) ||
    (isIOS(nav) && /AppleWebKit/i.test(agent) && !/Version\/|CriOS\/|FxiOS\/|EdgiOS\//i.test(agent));
  return fromTikTok && webview;
}
export const isTikTokBrowser = isTikTokInAppBrowser;
export function detectDevice(nav = navigator, referrer = typeof document !== 'undefined' ? document.referrer : '') {
  const os = isIOS(nav) ? 'ios' : isAndroid(nav) ? 'android' :
    /Windows NT|Macintosh|X11|CrOS|Linux x86_64/i.test(ua(nav)) ? 'desktop' : 'unknown';
  const tiktok = isTikTokInAppBrowser(nav, referrer);
  const embedded = tiktok || /FBAN|FBAV|Instagram|; wv\)|WebView|Line\/|MicroMessenger/i.test(ua(nav));
  const knownBrowser = /Safari\/|Chrome\/|CriOS\/|Firefox\/|FxiOS\/|Edg|SamsungBrowser\//i.test(ua(nav));
  return { os, tiktok, normal: !embedded && knownBrowser };
}
export function whatsappLinks(config = CONFIG) {
  const text = encodeURIComponent(config.whatsappMessage);
  return { web: `https://wa.me/${config.whatsappNumber}?text=${text}`,
    app: `whatsapp://send?phone=${config.whatsappNumber}&text=${text}` };
}

export function boot(win = window, doc = document, nav = navigator) {
  const device = detectDevice(nav, doc.referrer || '');
  const debug = doc.querySelector('#debug');
  if (new URL(win.location.href).searchParams.get('debug') === '1') {
    debug.hidden = false;
    debug.textContent = `Device: ${{ ios: 'iOS', android: 'Android', desktop: 'Desktop', unknown: 'Unknown' }[device.os]}\nTikTok browser: ${device.tiktok}\nUser Agent: ${ua(nav)}\nReferrer: ${doc.referrer || '(vuoto)'}`;
  }
  const links = whatsappLinks();
  const key = 'morris-whatsapp-attempt-v1';
  let autoTimer, fallbackTimer, statusTimer, attempted = false;
  const title = doc.querySelector('#title');
  const subtitle = doc.querySelector('#subtitle');
  const cta = doc.querySelector('#cta');
  const guide = doc.querySelector('#guide');
  const hint = doc.querySelector('#hint');
  title.textContent = CONFIG.text.ready;
  subtitle.textContent = CONFIG.text.desktopSubtitle;
  hint.textContent = CONFIG.text.reassurance;
  cta.href = links.web;
  cta.querySelector('span').textContent = CONFIG.text.cta;
  const cancel = () => { win.clearTimeout(autoTimer); win.clearTimeout(fallbackTimer); win.clearTimeout(statusTimer); };
  const showReady = () => { title.textContent = CONFIG.text.ready; hint.textContent = CONFIG.text.fallback; };
  const markAttempt = () => {
    attempted = true;
    try { win.sessionStorage.setItem(key, '1'); } catch { /* Storage may be blocked. */ }
    try { win.history.replaceState({ ...win.history.state, [key]: true }, '', win.location.href); } catch { /* Keep the current URL. */ }
  };
  const hasAttempt = () => {
    if (attempted || win.history.state?.[key]) return true;
    try { if (win.sessionStorage.getItem(key)) return true; } catch { /* Use history/navigation instead. */ }
    const type = win.performance?.getEntriesByType?.('navigation')?.[0]?.type;
    return type === 'back_forward' || type === 'reload';
  };
  function openWhatsApp({ automatic = false } = {}) {
    cancel();
    if (automatic && hasAttempt()) return;
    markAttempt();
    if (!automatic && (device.os === 'ios' || device.os === 'android') && device.normal) {
      // Custom schemes are attempted only following a real user gesture.
      fallbackTimer = win.setTimeout(() => {
        if (doc.visibilityState !== 'hidden') win.location.assign(links.web);
      }, CONFIG.fallbackDelay);
      try { win.location.assign(links.app); }
      catch { cancel(); win.location.assign(links.web); }
    } else {
      // HTTPS universal link is the reliable automatic path on iOS and Android.
      try { win.location.assign(links.web); } catch { showReady(); }
      statusTimer = win.setTimeout(showReady, CONFIG.fallbackDelay);
    }
  }
  cta.addEventListener('click', (event) => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button) return;
    event.preventDefault();
    openWhatsApp();
  });
  doc.addEventListener('visibilitychange', () => {
    if (doc.visibilityState === 'hidden') { cancel(); if (attempted) showReady(); }
  });
  win.addEventListener('pagehide', cancel);
  win.addEventListener('pageshow', (event) => { if (event.persisted) { cancel(); if (!device.tiktok) showReady(); } });
  if (device.tiktok) {
    doc.body.dataset.mode = 'guide';
    doc.querySelector('.brand').hidden = true;
    doc.querySelector('.eyebrow').hidden = true;
    doc.querySelector('footer').hidden = true;
    title.textContent = CONFIG.text.guideTitle;
    subtitle.textContent = CONFIG.text.guideSubtitle;
    guide.hidden = false;
    doc.querySelector('#arrow').removeAttribute('hidden');
    const steps = device.os === 'ios' ? CONFIG.text.iosSteps : CONFIG.text.androidSteps;
    guide.querySelectorAll('li span').forEach((el, i) => { el.textContent = steps[i]; });
    hint.textContent = CONFIG.text.guideReassurance;
    doc.querySelector('#fallback').hidden = true;
  } else if ((device.os === 'ios' || device.os === 'android') && device.normal && !hasAttempt()) {
    title.textContent = CONFIG.text.opening;
    subtitle.textContent = CONFIG.text.reassurance;
    hint.textContent = CONFIG.text.fallback;
    autoTimer = win.setTimeout(() => {
      if (doc.visibilityState !== 'hidden') openWhatsApp({ automatic: true });
    }, CONFIG.autoDelay);
  }
  doc.body.dataset.ready = 'true';
  return { device, openWhatsApp };
}
if (typeof document !== 'undefined') boot();
