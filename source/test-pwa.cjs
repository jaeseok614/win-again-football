'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const zlib = require('node:zlib');
const crypto = require('node:crypto');
const dir = process.env.PWA_DIST ? path.resolve(process.env.PWA_DIST) : path.join(__dirname, 'dist');
const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.webmanifest'), 'utf8'));
const icon512Path = manifest.icons.find(icon => icon.sizes === '512x512').src;
const workerSource = fs.readFileSync(path.join(dir, 'sw.js'), 'utf8');
const scope = 'https://game.test/football/';
let groups = 0;
async function test(name, fn) { await fn(); groups++; console.log('PASS ' + name); }
function absolute(value, base = scope) { return new URL(typeof value === 'string' ? value : value.url, base).href; }
function inlineHash(html) { return /<meta name="win-again-inline-shell" content="v22:([a-f0-9]{64})">/.exec(html)?.[1]; }
function markInlineShell(html) {
  const hash = crypto.createHash('sha256').update(html, 'utf8').digest('hex');
  const marker = '<meta name="win-again-inline-shell" content="v22:' + hash + '">';
  return html.includes('</head>') ? html.replace('</head>', marker + '</head>') : marker + html;
}
function storage() {
  const maps = new Map();
  const state = { maps, putFails: false, network: null };
  state.keys = async () => [...maps.keys()];
  state.delete = async name => maps.delete(name);
  state.open = async name => {
    if (!maps.has(name)) maps.set(name, new Map());
    const map = maps.get(name);
    return {
      match: async request => map.get(absolute(request))?.clone(),
      put: async (request, response) => {
        if (state.putFails) throw new Error('QuotaExceededError');
        map.set(absolute(request), response.clone());
      },
      addAll: async requests => {
        const pending = [];
        for (const request of requests) {
          const response = await state.network(request);
          if (!response.ok) throw new Error('precache-http-failure');
          pending.push([absolute(request), response.clone()]);
        }
        if (state.putFails) throw new Error('QuotaExceededError');
        for (const [key, value] of pending) map.set(key, value);
      }
    };
  };
  return state;
}
function harness(config = {}, shared = storage()) {
  const base = config.scope || scope, listeners = {}, messages = [], calls = [];
  const state = { offline: false, failURL: '', html: '', skip: 0, claim: 0 };
  const defaultHTML = '<!doctype html><title>이번엔 우승한다</title><script src="./app.js?v=22"></script><link href="./style.css?v=22" rel="stylesheet">';
  async function network(request) {
    const url = absolute(request, base); calls.push(url);
    if (state.offline) throw new Error('network-offline');
    if (url === state.failURL) return new Response('missing', { status: 404 });
    if (config.network) return config.network(url);
    const pathname = new URL(url).pathname;
    if (pathname === new URL(base).pathname || pathname.endsWith('/index.html')) {
      return new Response(state.html || config.html || defaultHTML, { headers: { 'Content-Type': 'text/html' } });
    }
    return new Response('asset ' + url);
  }
  shared.network = network;
  const pages = [base, new URL('./index.html', base).href, new URL('./qa-v22.html', base).href,
    'https://game.test/other/', 'https://elsewhere.test/football/'].map(url => ({ url, postMessage: message => messages.push({ url, message }) }));
  const self = { registration: { scope: base },
    addEventListener: (type, fn) => { listeners[type] = fn; },
    skipWaiting: async () => { state.skip++; },
    clients: { matchAll: async () => pages, claim: async () => { state.claim++; } }
  };
  const context = vm.createContext({ self, caches: shared, fetch: network, URL, Request, Response,
    crypto: crypto.webcrypto, TextEncoder, Uint8Array,
    importScripts: name => {
      assert.equal(name, './cache-assets.js');
      if (config.importFail) throw new Error('asset-import-failed');
      self.WIN_AGAIN_ASSETS = config.assets ?? ['./app.js?v=22', './style.css?v=22', './assets/player-faces-v12.png'];
      self.WIN_AGAIN_CACHE_REVISION = config.revision || 'release22';
      self.WIN_AGAIN_INLINE_SHELL = config.inline === true;
      self.WIN_AGAIN_INLINE_SHELL_HASH = Object.hasOwn(config, 'inlineHash') ? config.inlineHash : inlineHash(config.html || defaultHTML);
    }
  });
  vm.runInContext(workerSource, context, { filename: 'sw.js' });
  async function event(type, extra = {}) {
    let pending;
    listeners[type]({ ...extra, waitUntil: promise => { pending = promise; } });
    await pending;
  }
  function request(value, mode = 'same-origin', method = 'GET') { return { url: absolute(value, base), mode, method }; }
  async function fetchEvent(value, mode = 'same-origin', method = 'GET') {
    let answer;
    listeners.fetch({ request: request(value, mode, method), respondWith: promise => { answer = promise; } });
    return answer ? { handled: true, response: await answer } : { handled: false };
  }
  return { shared, self, pages, messages, calls, state, event, fetchEvent,
    name: vm.runInContext('CACHE_NAME', context), prefix: vm.runInContext('CACHE_PREFIX', context),
    urls: Array.from(vm.runInContext('PRECACHE_URLS', context)) };
}
function readPNG(file) {
  const data = fs.readFileSync(file);
  assert.equal(data.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  const width = data.readUInt32BE(16), height = data.readUInt32BE(20);
  assert.equal(data[24], 8); assert.equal(data[25], 2); assert.equal(data[28], 0);
  const chunks = [];
  for (let at = 8; at < data.length;) {
    const len = data.readUInt32BE(at), type = data.toString('ascii', at + 4, at + 8);
    if (type === 'IDAT') chunks.push(data.subarray(at + 8, at + 8 + len));
    at += len + 12;
  }
  const raw = zlib.inflateSync(Buffer.concat(chunks)), stride = width * 3, pixels = Buffer.alloc(stride * height);
  function paeth(a, b, c) { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); return pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)]; assert(filter <= 4);
    for (let x = 0; x < stride; x++) {
      const a = x >= 3 ? pixels[y * stride + x - 3] : 0, b = y ? pixels[(y - 1) * stride + x] : 0;
      const c = y && x >= 3 ? pixels[(y - 1) * stride + x - 3] : 0;
      const predictor = [0, a, b, Math.floor((a + b) / 2), paeth(a, b, c)][filter];
      pixels[y * stride + x] = (raw[y * (stride + 1) + x + 1] + predictor) & 255;
    }
  }
  return { width, height, pixels };
}

(async () => {
  await test('manifest preserves relative installation and the long Korean title with recognizable mask-safe football icons', async () => {
    assert.equal(manifest.name, '눈 떠보니 5부 리그 감독이었다! 이번 생엔 우승한다'); assert.equal(manifest.short_name, '이번 생엔 우승한다');
    assert.equal(Array.from(manifest.name).length, 29);
    for (const key of ['id', 'scope', 'start_url']) assert.equal(manifest[key], './');
    assert.equal(manifest.display, 'standalone'); assert.equal(manifest.theme_color, '#0c0e12');
    assert.equal(manifest.background_color, '#0c0e12');
    assert.deepEqual(manifest.icons.map(icon => [icon.sizes, icon.purpose]), [['192x192', 'any'], ['512x512', 'maskable']]);
    for (const icon of manifest.icons) {
      const png = readPNG(path.join(dir, icon.src)), size = Number(icon.sizes.split('x')[0]);
      assert.equal(png.width, size); assert.equal(png.height, size);
      let centralWhite = 0, centralBlack = 0, grass = 0, sky = 0;
      for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
        const offset = (y * size + x) * 3, pixel = [...png.pixels.subarray(offset, offset + 3)];
        const safe = Math.hypot(x + .5 - size / 2, y + .5 - size / 2) <= size * .4;
        if (safe && pixel.every(channel => channel > 165) && Math.max(...pixel) - Math.min(...pixel) < 55) centralWhite++;
        if (safe && y > size * .25 && y < size * .7 && pixel.every(channel => channel < 55)) centralBlack++;
        if (y > size * .68 && pixel[1] > pixel[0] * 1.2 && pixel[1] > pixel[2] * 1.2) grass++;
        if (y < size * .4 && pixel[2] > pixel[0] * 1.3 && pixel[2] > 20) sky++;
      }
      assert(centralWhite > size * size * .06, 'the white football remains visible in the central safe circle');
      assert(centralBlack > size * size * .015, 'the black football panels remain visible in the central safe circle');
      assert(grass > size * size * .05, 'the icon retains its green pitch');
      assert(sky > size * size * .08, 'the icon retains its blue stadium background');
    }
    assert(!/localStorage|indexedDB|season\.squad/.test(workerSource));
  });
  await test('install precaches the complete local game and reports only to main game pages', async () => {
    const h = harness(); await h.event('install');
    assert.equal(h.state.skip, 1); assert(h.name.includes(encodeURIComponent(scope)));
    assert(h.name.endsWith(':v22:release22'));
    assert.equal(h.shared.maps.get(h.name).size, h.urls.length);
    assert(h.urls.includes(absolute('./app.js?v=22')));
    assert(!h.urls.includes(absolute('./assets/stadium-v10.png')));
    assert.equal(h.messages.length, 2); assert(h.messages.every(x => x.message.type === 'WIN_AGAIN_PWA_READY'));
    const versioned = harness({ assets: ['./app.js?v=22', './style.css?v=22', './assets/player-faces-v12.png?v=12', './assets/stadium-v10.png?v=10'] });
    await versioned.event('install');
    assert(versioned.urls.includes(absolute('./assets/player-faces-v12.png?v=12')));
    assert(versioned.urls.includes(absolute('./assets/stadium-v10.png?v=10')));
  });
  await test('compiled public shell installs without absent original game images or external scripts', async () => {
    const html = process.argv[2] ? fs.readFileSync(path.resolve(process.argv[2]), 'utf8')
      : markInlineShell('<!doctype html><title>이번엔 우승한다</title><script>const example = \'<script src="absent.js?v=22">\';</script><a href="optional-download.js">export</a>');
    const h = harness({ assets: ['./index.html', './manifest.webmanifest'], inline: true,
      html });
    await h.event('install'); assert.equal(h.state.skip, 1);
    assert.equal(h.urls.length, 6); assert(!h.urls.some(url => /faces|stadium|app\.js/.test(url)));
    if (process.env.PWA_DIST) {
      const build = { self: {} };
      vm.runInNewContext(fs.readFileSync(path.join(dir, 'cache-assets.js'), 'utf8'), build);
      const actual = harness({ assets: Array.from(build.self.WIN_AGAIN_ASSETS),
        revision: build.self.WIN_AGAIN_CACHE_REVISION, inline: build.self.WIN_AGAIN_INLINE_SHELL === true,
        inlineHash: build.self.WIN_AGAIN_INLINE_SHELL_HASH,
        network: url => {
          const relative = new URL(url).pathname.slice(new URL(scope).pathname.length) || 'index.html';
          const file = path.resolve(dir, decodeURIComponent(relative));
          assert(!path.relative(dir, file).startsWith('..'), 'precache must stay in the public folder');
          return new Response(fs.readFileSync(file), { headers: { 'Content-Type': file.endsWith('.html') ? 'text/html' : 'application/octet-stream' } });
        }
      });
      await actual.event('install'); assert.equal(actual.state.skip, 1);
      await actual.event('activate'); assert.equal(actual.state.claim, 1);
      assert.equal(actual.shared.maps.get(actual.name).size, actual.urls.length);
      assert(actual.name.endsWith(':v22:' + build.self.WIN_AGAIN_CACHE_REVISION));
    }
  });
  await test('inline HTTP 200 error pages and damaged bundles preserve and serve the complete cached game', async () => {
    const html = markInlineShell('<!doctype html><html><head><title>이번엔 우승한다</title></head><body><main id="club-pane">valid game</main><script>const game = "ready";</script></body></html>');
    const h = harness({ assets: ['./index.html', './manifest.webmanifest'], inline: true, html });
    await h.event('install');
    const damaged = ['<!doctype html><title>Maintenance</title><p>Please try again later.</p>',
      html.replace('const game = "ready";', 'const game = "broken";'), html.slice(0, -40),
      '<!--' + html.match(/<meta name="win-again-inline-shell"[^>]+>/)[0] + '--><p>Unavailable</p>',
      '<script>const example = ' + JSON.stringify(html.match(/<meta name="win-again-inline-shell"[^>]+>/)[0]) + ';</script>'];
    for (const responseHTML of damaged) {
      h.state.html = responseHTML;
      const result = await h.fetchEvent('./', 'navigate');
      assert.equal(result.response.status, 200); assert.equal(await result.response.text(), html);
      assert.equal(await (await (await h.shared.open(h.name)).match('./index.html')).text(), html);
    }
    h.state.offline = true;
    assert.equal(await (await h.fetchEvent('./', 'navigate')).response.text(), html);
  });
  await test('invalid inline builds cannot replace or activate over the previous complete release', async () => {
    const html = markInlineShell('<!doctype html><title>이번엔 우승한다</title><script>const game = "ready";</script>');
    const shared = storage(), old = harness({ assets: ['./index.html'], inline: true, html, revision: 'old' }, shared);
    await old.event('install');
    const configs = [
      { html: '<!doctype html><title>Maintenance</title><p>Unavailable</p>' },
      { html: html.replace('ready', 'broken') }, { html, inlineHash: undefined },
      { html, inlineHash: '0'.repeat(64) }, { html: html + html.match(/<meta name="win-again-inline-shell"[^>]+>/)[0] }
    ];
    for (let i = 0; i < configs.length; i++) {
      const update = harness({ assets: ['./index.html'], inline: true, revision: 'bad' + i, ...configs[i] }, shared);
      await assert.rejects(update.event('install'), /shell-assets-mismatch/);
      assert.equal(update.state.skip, 0); assert(!shared.maps.has(update.name));
      assert.equal(await (await (await shared.open(old.name)).match('./index.html')).text(), html);
    }
    shared.maps.get(old.name).set(absolute('./index.html'), new Response(html.replace('ready', 'damaged')));
    old.messages.length = 0;
    await old.event('message', { source: old.pages[0], data: { type: 'WIN_AGAIN_PWA_STATUS' } });
    assert.equal(old.messages[0].message.type, 'WIN_AGAIN_PWA_ERROR');
    await old.event('message', { source: old.pages[0], data: { type: 'SKIP_WAITING' } });
    assert.equal(old.state.skip, 1); await assert.rejects(old.event('activate'), /offline-cache-incomplete/);
  });
  await test('worker bypasses other origins, paths, methods, QA, auth, JSON and obsolete asset queries', async () => {
    const h = harness();
    const excluded = [['https://elsewhere.test/football/app.js?v=22'], ['/other/app.js?v=22'],
      ['./qa-v22.html', 'navigate'], ['./offline-check.html', 'navigate'], ['./?qa=1', 'navigate'],
      ['./api/state.json'], ['./auth/'], ['./season-save.json'], ['./app.js?v=21'], ['./unlisted.js?v=22'], ['./app.js?v=22&x=1'], ['./', 'navigate', 'POST']];
    for (const args of excluded) assert.equal((await h.fetchEvent(...args)).handled, false);
    assert.equal(h.calls.length, 0);
  });
  await test('current static resources are cache-first and a missing cached resource can refill online', async () => {
    const h = harness(); await h.event('install'); const before = h.calls.length;
    h.state.offline = true; let result = await h.fetchEvent('./app.js?v=22');
    assert(result.handled); assert.match(await result.response.text(), /asset/); assert.equal(h.calls.length, before);
    h.shared.maps.get(h.name).delete(absolute('./app.js?v=22')); h.state.offline = false;
    result = await h.fetchEvent('./app.js?v=22'); assert(result.response.ok);
    assert(h.shared.maps.get(h.name).has(absolute('./app.js?v=22')));
  });
  await test('main documents prefer network, survive offline and reject a mismatched future shell cache', async () => {
    const h = harness(); await h.event('install'); h.state.html = '<p>fresh</p><script src="./app.js?v=22"></script>';
    let result = await h.fetchEvent('./?screen=club', 'navigate'); assert.match(await result.response.text(), /fresh/);
    h.state.html = '<p>future</p><script src="./app.js?v=23"></script>';
    result = await h.fetchEvent('./index.html', 'navigate'); assert.match(await result.response.text(), /future/);
    h.state.offline = true; result = await h.fetchEvent('./', 'navigate'); assert.match(await result.response.text(), /fresh/);
    h.state.offline = false; h.state.failURL = absolute('./');
    result = await h.fetchEvent('./', 'navigate'); assert.match(await result.response.text(), /fresh/);
  });
  await test('activation deletes only prior caches for this exact game scope', async () => {
    const h = harness(); await h.event('install');
    const old = h.prefix + 'v21:old', other = 'win-again-pwa:' + encodeURIComponent('https://game.test/other/') + ':v21:old';
    h.shared.maps.set(old, new Map()); h.shared.maps.set(other, new Map()); h.shared.maps.set('other-app-data', new Map());
    await h.event('activate'); assert(!h.shared.maps.has(old)); assert(h.shared.maps.has(other));
    assert(h.shared.maps.has('other-app-data')); assert.equal(h.state.claim, 1);
  });
  await test('an incomplete update never activates and preserves the previous complete game cache', async () => {
    const shared = storage(), old = harness({ revision: 'old' }, shared); await old.event('install');
    const original = shared.maps.get(old.name), keys = [...original.keys()];
    const update = harness({ revision: 'new', assets: ['./app.js?v=22', './style.css?v=22', './new-ui.js?v=22'] }, shared);
    update.state.failURL = absolute('./new-ui.js?v=22');
    await assert.rejects(update.event('install')); assert.equal(update.state.skip, 0); assert.equal(update.state.claim, 0);
    assert.equal(shared.maps.get(old.name), original); assert.deepEqual([...original.keys()], keys);
    assert(!shared.maps.has(update.name)); assert(update.messages.every(x => x.message.type === 'WIN_AGAIN_PWA_ERROR'));
  });
  await test('a missing referenced bundle rejects install rather than advertising broken offline readiness', async () => {
    const h = harness({ html: '<script src="./app.js?v=22"></script><script src="./missing.js?v=22"></script>' });
    await assert.rejects(h.event('install'), /shell-assets-mismatch/);
    assert.equal(h.state.skip, 0); assert(!h.shared.maps.has(h.name));
    assert.equal(h.messages[0].message.type, 'WIN_AGAIN_PWA_ERROR');
  });
  await test('invalid or unavailable build asset lists cannot install or fetch unintended content', async () => {
    const invalid = [{ importFail: true }, { assets: [] }, { assets: ['./qa-v22-app.js?v=22'] },
      { assets: ['./app.js?v=21'] }, { assets: ['./save.json'] }, { assets: ['https://elsewhere.test/app.js?v=22'] },
      { assets: ['../app.js?v=22'] }, { assets: ['./auth/secret.js?v=22'] }, { assets: ['./assets/private.json'] }];
    for (const config of invalid) {
      const h = harness(config); await assert.rejects(h.event('install'));
      assert.equal(h.state.skip, 0); assert.equal(h.calls.length, 0);
    }
  });
  await test('status and skip-waiting messages require a complete cache and a main-page client', async () => {
    const h = harness(); await h.event('install'); h.messages.length = 0;
    await h.event('message', { source: h.pages[0], data: { type: 'WIN_AGAIN_PWA_STATUS' } });
    assert.equal(h.messages[0].message.type, 'WIN_AGAIN_PWA_READY');
    await h.event('message', { source: h.pages[0], data: { type: 'SKIP_WAITING' } }); assert.equal(h.state.skip, 2);
    h.shared.maps.get(h.name).delete(absolute('./' + icon512Path)); h.messages.length = 0;
    await h.event('message', { source: h.pages[0], data: { type: 'WIN_AGAIN_PWA_STATUS' } });
    assert.equal(h.messages[0].message.type, 'WIN_AGAIN_PWA_ERROR');
    await h.event('message', { source: h.pages[0], data: { type: 'SKIP_WAITING' } }); assert.equal(h.state.skip, 2);
    h.messages.length = 0; await h.event('message', { source: h.pages[2], data: { type: 'WIN_AGAIN_PWA_STATUS' } });
    assert.equal(h.messages.length, 0); await assert.rejects(h.event('activate'));
  });
  await test('quota failures leave online responses usable and reinstalling an identical ready release is safe', async () => {
    const h = harness(); await h.event('install'); const before = h.calls.length;
    await h.event('install'); assert.equal(h.calls.length, before); assert.equal(h.state.skip, 2);
    h.shared.putFails = true; h.state.html = '<p>online</p><script src="./app.js?v=22"></script>';
    let result = await h.fetchEvent('./', 'navigate'); assert.match(await result.response.text(), /online/);
    h.shared.maps.get(h.name).delete(absolute('./style.css?v=22'));
    result = await h.fetchEvent('./style.css?v=22'); assert(result.response.ok);
    const empty = harness({ inline: true, assets: ['./index.html'] }); empty.state.offline = true;
    result = await empty.fetchEvent('./', 'navigate'); assert.equal(result.response.status, 503);
  });
  console.log('Validated ' + groups + ' PWA groups.');
})().catch(error => { console.error(error); process.exitCode = 1; });
