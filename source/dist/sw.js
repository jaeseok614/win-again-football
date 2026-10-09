/* Only this game's static shell is cached. Campaign data stays in the page. */
'use strict';
const PWA_VERSION = 'v22';
const SCOPE_URL = new URL(self.registration.scope);
const CACHE_PREFIX = 'win-again-pwa:' + encodeURIComponent(SCOPE_URL.href) + ':';
const FIXED_ASSETS = ['./', './index.html', './manifest.webmanifest', './cache-assets.js',
  './assets/app-icon-192.png', './assets/app-icon-512.png'];
let assetListError = false;
try { importScripts('./cache-assets.js'); } catch (_) { assetListError = true; }

function scopeContains(url) {
  return url.origin === SCOPE_URL.origin && url.pathname.startsWith(SCOPE_URL.pathname);
}
function excluded(url) {
  return /(?:^|\/)(?:qa(?:-|\/|\.)|offline-check(?:-|\/|\.)|api(?:\/|$)|auth(?:\/|$))/i.test(url.pathname) ||
    url.searchParams.has('qa') || url.searchParams.has('offline-check');
}
function gameDocument(url) {
  return scopeContains(url) && !excluded(url) &&
    (url.pathname === SCOPE_URL.pathname || url.pathname === new URL('./index.html', SCOPE_URL).pathname);
}
function assetURLs() {
  if (assetListError || !Array.isArray(self.WIN_AGAIN_ASSETS) || !self.WIN_AGAIN_ASSETS.length) {
    throw new Error('asset-list-unavailable');
  }
  const fixed = FIXED_ASSETS.map(path => new URL(path, SCOPE_URL).href);
  const dynamic = self.WIN_AGAIN_ASSETS.map(path => {
    if (typeof path !== 'string') throw new Error('invalid-asset-list');
    const url = new URL(path, SCOPE_URL);
    const relative = url.pathname.slice(SCOPE_URL.pathname.length);
    const versionQuery = url.searchParams.size === 1 && /^\d{1,6}$/.test(url.searchParams.get('v') || '');
    const script = /^[a-z][a-z0-9-]*\.(?:js|css)$/i.test(relative) && versionQuery;
    const imageQuery = url.searchParams.size === 0 ||
      url.searchParams.size === 1 && /^\d{1,6}$/.test(url.searchParams.get('v') || '');
    const image = /^assets\/[a-z][a-z0-9-]*\.(?:png|jpe?g|svg|webp)$/i.test(relative) &&
      imageQuery;
    if (!scopeContains(url) || excluded(url) || url.username || url.password || url.hash ||
        !(fixed.includes(url.href) || script || image)) {
      throw new Error('invalid-asset-list');
    }
    return url.href;
  });
  return [...new Set([...fixed, ...dynamic])];
}
let PRECACHE_URLS = [];
try { PRECACHE_URLS = assetURLs(); } catch (_) { assetListError = true; }
const ASSET_SET = new Set(PRECACHE_URLS);
function listRevision() {
  let hash = 2166136261;
  for (const c of PRECACHE_URLS.join('\n')) { hash ^= c.charCodeAt(0); hash = Math.imul(hash, 16777619); }
  return (hash >>> 0).toString(36);
}
const suppliedRevision = self.WIN_AGAIN_CACHE_REVISION;
const CACHE_REVISION = typeof suppliedRevision === 'string' && /^[a-z0-9][a-z0-9._-]{0,63}$/i.test(suppliedRevision)
  ? suppliedRevision : listRevision();
const CACHE_NAME = CACHE_PREFIX + PWA_VERSION + ':' + CACHE_REVISION;
const INDEX_URL = new URL('./index.html', SCOPE_URL).href;

function cacheable(response, documentOnly = false) {
  if (!response || !response.ok || response.status !== 200 || !['basic', 'default'].includes(response.type)) return false;
  if (!response.url) return true;
  const url = new URL(response.url);
  return documentOnly ? gameDocument(url) : scopeContains(url) && !excluded(url) &&
    (ASSET_SET.has(url.href) || gameDocument(url));
}
async function shellMatchesAssets(response) {
  if (!cacheable(response, true)) return false;
  const html = await response.clone().text();
  // Ignore markup examples inside embedded code, styles and HTML comments.
  const markup = html.replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, tag => tag.slice(0, tag.indexOf('>') + 1))
    .replace(/<style\b[^>]*>[\s\S]*?<\/style\s*>/gi, '').replace(/<!--[\s\S]*?-->/g, '');
  const resources = [...markup.matchAll(/<(?:script|link)\b[^>]*>/gi)]
    .flatMap(tag => [...tag[0].matchAll(/(?:src|href)\s*=\s*["']([^"']+)["']/gi)])
    .map(match => new URL(match[1], SCOPE_URL))
    .filter(url => /\.(?:js|css)$/i.test(url.pathname));
  if (!resources.every(url => ASSET_SET.has(url.href))) return false;
  if (self.WIN_AGAIN_INLINE_SHELL !== true) {
    return resources.some(url => url.pathname === new URL('./app.js', SCOPE_URL).pathname);
  }
  // A successful HTTP response can still be a hosting error or a truncated build.
  // The build marker binds the entire inline document to this release's asset list.
  const expectedHash = self.WIN_AGAIN_INLINE_SHELL_HASH;
  if (resources.length || typeof expectedHash !== 'string' || !/^[a-f0-9]{64}$/.test(expectedHash)) return false;
  const markers = [...markup.matchAll(/<meta name="win-again-inline-shell" content="v22:([a-f0-9]{64})">/g)];
  if (markers.length !== 1 || markers[0][1] !== expectedHash) return false;
  const unsignedHTML = html.replace(markers[0][0], '');
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(unsignedHTML));
  const actualHash = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
  return actualHash === expectedHash;
}
async function readyCache() {
  if (assetListError || !PRECACHE_URLS.length || !(await caches.keys()).includes(CACHE_NAME)) return false;
  const cache = await caches.open(CACHE_NAME);
  for (const url of PRECACHE_URLS) if (!cacheable(await cache.match(url))) return false;
  return await shellMatchesAssets(await cache.match(INDEX_URL));
}
async function notifyPages(type) {
  const message = type === 'WIN_AGAIN_PWA_READY'
    ? readyMessage()
    : { type, version: PWA_VERSION, message: 'offline-cache-failed' };
  try {
    const pages = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const page of pages) if (gameDocument(new URL(page.url))) page.postMessage(message);
  } catch (_) { /* A closing tab must not invalidate an installed cache. */ }
}
function readyMessage(){return {type:'WIN_AGAIN_PWA_READY',version:PWA_VERSION,assets:PRECACHE_URLS.length,...(self.WIN_AGAIN_INLINE_SHELL===true&&/^[a-f0-9]{64}$/.test(self.WIN_AGAIN_INLINE_SHELL_HASH||'')?{shellHash:self.WIN_AGAIN_INLINE_SHELL_HASH}:{})};}
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const alreadyPresent = (await caches.keys()).includes(CACHE_NAME);
    try {
      if (assetListError) throw new Error('asset-list-unavailable');
      const cache = await caches.open(CACHE_NAME);
      if (alreadyPresent && await readyCache()) {
        await notifyPages('WIN_AGAIN_PWA_READY');
        await self.skipWaiting();
        return;
      }
      await cache.addAll(PRECACHE_URLS.map(url => new Request(url, { cache: 'reload', credentials: 'same-origin' })));
      if (!await shellMatchesAssets(await cache.match(INDEX_URL))) throw new Error('shell-assets-mismatch');
      if (!await readyCache()) throw new Error('offline-cache-incomplete');
      await notifyPages('WIN_AGAIN_PWA_READY');
      await self.skipWaiting();
    } catch (error) {
      if (!alreadyPresent) await caches.delete(CACHE_NAME);
      await notifyPages('WIN_AGAIN_PWA_ERROR');
      throw error;
    }
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    if (!await readyCache()) throw new Error('offline-cache-incomplete');
    await Promise.all((await caches.keys()).filter(name => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME)
      .map(name => caches.delete(name)));
    await self.clients.claim();
    await notifyPages('WIN_AGAIN_PWA_READY');
  })());
});
async function documentRequest(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if (response.type === 'opaqueredirect' || response.ok && !cacheable(response, true)) return response;
    if (!cacheable(response, true)) throw new Error('document-unavailable');
    if (await shellMatchesAssets(response)) {
      try { await cache.put(INDEX_URL, response.clone()); } catch (_) { /* Online play stays available. */ }
    } else if (self.WIN_AGAIN_INLINE_SHELL === true) {
      throw new Error('shell-assets-mismatch');
    }
    return response;
  } catch (_) {
    return await cache.match(INDEX_URL) || await cache.match(SCOPE_URL.href) ||
      new Response('경기를 오프라인으로 열려면 온라인에서 먼저 실행해 주세요.',
        { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  }
}
async function staticRequest(request) {
  const cache = await caches.open(CACHE_NAME);
  const saved = await cache.match(request);
  if (saved) return saved;
  const response = await fetch(request);
  if (cacheable(response)) {
    try { await cache.put(request, response.clone()); } catch (_) { /* A cache quota error does not discard a network response. */ }
  }
  return response;
}
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (!scopeContains(url) || excluded(url)) return;
  if (request.mode === 'navigate') {
    if (gameDocument(url)) event.respondWith(documentRequest(request));
  } else if (ASSET_SET.has(url.href) && !gameDocument(url)) {
    event.respondWith(staticRequest(request));
  }
});
self.addEventListener('message', event => {
  if (!event.source?.url || !gameDocument(new URL(event.source.url))) return;
  if (event.data?.type === 'SKIP_WAITING') {
    event.waitUntil((async () => { if (await readyCache()) await self.skipWaiting(); })());
  } else if (event.data?.type === 'WIN_AGAIN_PWA_STATUS') {
    event.waitUntil((async () => {
      event.source.postMessage(await readyCache()
        ? readyMessage()
        : { type: 'WIN_AGAIN_PWA_ERROR', version: PWA_VERSION, message: 'offline-cache-failed' });
    })());
  }
});
