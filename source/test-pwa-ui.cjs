'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'dist/pwa-ui.js'),'utf8');let groups=0;
async function test(name,fn){await fn();groups++;console.log('PASS '+name);}
function eventTarget(){return {listeners:{},addEventListener(type,fn){(this.listeners[type]??=[]).push(fn);},emit(type,event={}){for(const fn of this.listeners[type]||[])fn(event);}};}
function worker(state='activated'){return {...eventTarget(),state,messages:[],postMessage(message){this.messages.push(message);}};}
function harness(options={}){
 const nodes=new Map(),timers=new Map(),cleared=[],body={children:[],prepend(node){this.children.unshift(node);}},calls={register:0,update:0,prompt:0};let nextTimer=0;
 function element(id=''){
  const node={hidden:false,dataset:{},attributes:{},children:new Map(),textContent:'',markup:'',setAttribute(name,value){this.attributes[name]=String(value);},querySelector(selector){return this.children.get(selector)||null;}};
  Object.defineProperty(node,'id',{get(){return this.nodeId||'';},set(value){this.nodeId=value;if(value)nodes.set(value,this);}});node.id=id;
  Object.defineProperty(node,'innerHTML',{get(){return this.markup;},set(value){this.markup=value;this.children.clear();for(const match of value.matchAll(/<([a-z]+)[^>]*class="([^"]+)"[^>]*>/g)){const child=element();child.tagName=match[1].toUpperCase();for(const name of match[2].split(/\s+/))this.children.set('.'+name,child);}}});
  return node;
 }
 const notice=element('notice');notice.insertAdjacentElement=(_,node)=>body.children.push(node);
 const host=options.noHost?null:element('pwa-preparation');if(host)body.children.push(host);
 if(options.dialog){element('pwa-state');element('pwa-install');}
 const active=worker(),registration={...eventTarget(),active,installing:options.installing||null,async update(){calls.update++;if(options.updateError)throw Error('offline');}};
 const serviceWorker={...eventTarget(),controller:active,ready:options.readyResolved?Promise.resolve(registration):new Promise(()=>{}),async register(url,settings){calls.register++;calls.url=url;calls.settings=settings;if(options.registrationError)throw Error('register failed');return registration;}};
 const window={...eventTarget(),isSecureContext:options.secure!==false,matchMedia:()=>({matches:options.standalone===true})};
 const navigator={standalone:options.standalone===true};if(!options.noWorker)navigator.serviceWorker=serviceWorker;
 const context=vm.createContext({window,navigator,location:{protocol:options.protocol||'https:',pathname:options.pathname||'/football/'},document:{body,createElement:()=>element()},$:id=>nodes.get(id)||null,setTimeout(fn,ms){const id=++nextTimer;timers.set(id,{fn,ms});return id;},clearTimeout(id){cleared.push(id);timers.delete(id);}});
 vm.runInContext(source,context,{filename:'pwa-ui.js'});
 const h={context,nodes,body,timers,cleared,calls,options,window,serviceWorker,registration,active,get:id=>nodes.get(id),read:expression=>vm.runInContext(expression,context),element,
  async flush(){for(let i=0;i<10;i++)await Promise.resolve();},message(type,source=registration.active,version='v22'){serviceWorker.emit('message',{data:{type,version},source});},expireTimers(){for(const [id,timer] of [...timers]){timers.delete(id);timer.fn();}}};
 context.initPwa();return h;
}
(async()=>{
 await test('main game shows honest preparation progress without opening the save dialog and waits for verified readiness',async()=>{
  const h=harness({readyResolved:true});await h.flush();const host=h.get('pwa-preparation');
  assert.equal(host.hidden,false);assert.equal(host.dataset.state,'preparing');assert.match(host.innerHTML,/게임 파일을 내려받고 확인/);assert.match(host.innerHTML,/<progress/);assert.doesNotMatch(host.innerHTML,/value=|\d+%/);
  assert.equal(h.read('pwaReady'),false);assert.equal(h.calls.register,1);assert.equal(h.calls.url,'./sw.js');assert.equal(h.calls.settings.updateViaCache,'none');assert(h.active.messages.some(message=>message.type==='WIN_AGAIN_PWA_STATUS'));
  h.message('WIN_AGAIN_PWA_READY');assert.equal(host.dataset.state,'ready');assert.equal(h.read('pwaReady'),true);assert.match(host.innerHTML,/인터넷 없이도/);assert(!host.querySelector('.pwa-preparation-progress'));
  assert.equal(h.timers.size,1);assert.equal([...h.timers.values()][0].ms,7000);h.message('WIN_AGAIN_PWA_READY');assert.equal(h.timers.size,1);
  h.expireTimers();assert.equal(host.hidden,true);h.message('WIN_AGAIN_PWA_READY');assert.equal(host.hidden,true);
  h.element('pwa-state');h.element('pwa-install');h.context.renderPwaStatus();assert.match(h.get('pwa-state').textContent,/오프라인 준비 완료/);assert.equal(host.hidden,true);
 });
 await test('failed preparation stays visible and retry registers, checks for an update and recovers without reloading the game',async()=>{
  const h=harness({dialog:true});await h.flush();h.message('WIN_AGAIN_PWA_READY');h.message('WIN_AGAIN_PWA_ERROR');const host=h.get('pwa-preparation');
  assert.equal(host.hidden,false);assert.equal(host.dataset.state,'error');assert.equal(h.timers.size,0);assert.match(h.get('pwa-state').textContent,/완료하지 못/);
  const retry=host.querySelector('.pwa-preparation-retry');assert(retry);retry.onclick();h.context.registerPwa(true);assert.equal(host.dataset.state,'preparing');await h.flush();assert.equal(h.calls.register,2);assert.equal(h.calls.update,1);
  h.message('WIN_AGAIN_PWA_READY');assert.equal(host.dataset.state,'ready');assert.equal(h.read('pwaError'),false);host.querySelector('.pwa-preparation-dismiss').onclick();assert.equal(host.hidden,true);
 });
 await test('already installing workers and later updates show progress, reject stale ready reports and surface installation failure',async()=>{
  const installing=worker('installing'),h=harness({installing});await h.flush();assert.equal(installing.listeners.statechange.length,1);assert.equal(h.active.messages.length,0);
  h.message('WIN_AGAIN_PWA_READY',h.active);assert.equal(h.get('pwa-preparation').dataset.state,'preparing');
  installing.state='redundant';installing.emit('statechange');assert.equal(h.get('pwa-preparation').dataset.state,'error');
  const update=worker('installing');h.registration.installing=update;h.registration.emit('updatefound');assert.equal(h.get('pwa-preparation').dataset.state,'preparing');assert.equal(update.listeners.statechange.length,1);
  h.message('WIN_AGAIN_PWA_READY',installing);assert.equal(h.get('pwa-preparation').dataset.state,'preparing');h.message('WIN_AGAIN_PWA_READY',update);assert.equal(h.get('pwa-preparation').dataset.state,'ready');
  update.state='activated';update.emit('statechange');assert.equal(update.messages.at(-1).type,'WIN_AGAIN_PWA_STATUS');h.serviceWorker.emit('controllerchange');assert.equal(h.active.messages.at(-1).type,'WIN_AGAIN_PWA_STATUS');
 });
 await test('registration and update failures offer a retry, and errors from unrelated versions cannot change readiness',async()=>{
  const h=harness({registrationError:true});await h.flush();const host=h.get('pwa-preparation');assert.equal(host.dataset.state,'error');assert(host.querySelector('.pwa-preparation-retry'));
  h.options.registrationError=false;h.options.updateError=true;host.querySelector('.pwa-preparation-retry').onclick();await h.flush();assert.equal(host.dataset.state,'error');assert.equal(h.calls.update,1);
  h.options.updateError=false;host.querySelector('.pwa-preparation-retry').onclick();await h.flush();h.message('WIN_AGAIN_PWA_READY');h.message('WIN_AGAIN_PWA_ERROR',h.active,'v21');assert.equal(host.dataset.state,'ready');
 });
 await test('home screen install events preserve preparation status and offer the real browser install prompt',async()=>{
  const h=harness({dialog:true});await h.flush();let prevented=0;const prompt={preventDefault(){prevented++;},async prompt(){h.calls.prompt++;},userChoice:Promise.resolve({outcome:'accepted'})};
  h.window.emit('beforeinstallprompt',prompt);assert.equal(prevented,1);assert.equal(h.get('pwa-install').hidden,false);assert.equal(h.get('pwa-preparation').dataset.state,'preparing');await h.get('pwa-install').onclick();assert.equal(h.calls.prompt,1);assert.equal(h.get('pwa-install').hidden,true);
  h.window.emit('appinstalled');assert.equal(h.read('pwaReady'),false);assert.equal(h.get('pwa-preparation').dataset.state,'preparing');
  const standalone=harness({standalone:true,dialog:true});await standalone.flush();standalone.window.emit('beforeinstallprompt',prompt);assert.equal(standalone.get('pwa-install').hidden,true);standalone.message('WIN_AGAIN_PWA_READY');assert.match(standalone.get('pwa-state').textContent,/홈 화면 앱으로 실행 중 · 오프라인 준비 완료/);
 });
 await test('file, insecure, QA and unsupported pages do not advertise preparation and older markup gets a visible status host',async()=>{
  for(const options of [{protocol:'file:'},{secure:false},{pathname:'/football/qa-v22.html'},{pathname:'/football/offline-check.html'},{noWorker:true}]){const h=harness(options);await h.flush();assert.equal(h.calls.register,0);assert.equal(h.get('pwa-preparation').hidden,true);assert.equal(h.read('pwaReady'),false);}
  const h=harness({noHost:true});await h.flush();assert.equal(h.get('pwa-preparation').hidden,false);assert.equal(h.get('pwa-preparation').attributes.role,'status');assert(h.body.children.includes(h.get('pwa-preparation')));
 });
 console.log('Validated '+groups+' visible PWA preparation UI groups.');
})().catch(error=>{console.error(error);process.exitCode=1;});
