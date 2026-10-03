var pwaInstallPrompt=null,pwaReady=false,pwaError=false,pwaRegistering=false,pwaRegistration=null;
var pwaPreparationPhase='idle',pwaPreparationDismissed=false,pwaPreparationTimer=null,pwaRegistrationAttempt=0,pwaInstallingWorker=null;
var pwaObservedWorkers=new WeakSet(),pwaObservedRegistrations=new WeakSet();
function pwaStandalone(){return window.matchMedia?.('(display-mode: standalone)').matches||navigator.standalone===true;}
function pwaPreparationHost(){
 let host=$('pwa-preparation');if(host)return host;
 host=document.createElement('div');host.id='pwa-preparation';host.hidden=true;host.setAttribute('role','status');host.setAttribute('aria-live','polite');
 const notice=$('notice');if(notice?.insertAdjacentElement)notice.insertAdjacentElement('afterend',host);else document.body.prepend(host);
 return host;
}
function renderPwaPreparation(){
 const host=pwaPreparationHost();host.hidden=pwaPreparationPhase==='idle'||pwaPreparationDismissed;if(host.hidden)return;
 host.dataset.state=pwaPreparationPhase;
 const preparing=pwaPreparationPhase==='preparing',error=pwaPreparationPhase==='error';
 const title=preparing?'오프라인 게임 준비 중':error?'오프라인 준비를 완료하지 못했어요':'오프라인 준비 완료';
 const detail=preparing?'게임 파일을 내려받고 확인하고 있어요. 준비가 끝나면 알려드릴게요.':error?'인터넷 연결을 확인하고 다시 준비해 주세요.':'이제 이 기기에서 인터넷 없이도 게임을 열 수 있어요.';
 host.innerHTML='<div class="pwa-preparation-copy"><strong>'+title+'</strong><p>'+detail+'</p></div>'+(preparing?'<progress class="pwa-preparation-progress" aria-label="오프라인 게임 준비 중"></progress>':error?'<button type="button" class="pwa-preparation-retry">다시 준비</button>':'<button type="button" class="pwa-preparation-dismiss" aria-label="오프라인 준비 알림 닫기">×</button>');
 const retry=host.querySelector('.pwa-preparation-retry');if(retry)retry.onclick=()=>registerPwa(true);
 const dismiss=host.querySelector('.pwa-preparation-dismiss');if(dismiss)dismiss.onclick=()=>{pwaPreparationDismissed=true;renderPwaPreparation();};
}
function setPwaPreparation(phase){
 const changed=pwaPreparationPhase!==phase;pwaPreparationPhase=phase;pwaReady=phase==='ready';pwaError=phase==='error';pwaRegistering=phase==='preparing';
 if(changed){
  pwaPreparationDismissed=false;if(pwaPreparationTimer!==null)clearTimeout(pwaPreparationTimer);pwaPreparationTimer=null;
  if(phase==='ready')pwaPreparationTimer=setTimeout(()=>{pwaPreparationTimer=null;pwaPreparationDismissed=true;renderPwaPreparation();},7000);
 }
 renderPwaStatus();
}
function renderPwaStatus(){
 renderPwaPreparation();const label=$('pwa-state'),button=$('pwa-install');if(!label||!button)return;
 label.textContent=pwaError?'오프라인 저장을 완료하지 못했어요. 인터넷에 연결해 다시 준비해 주세요.':pwaRegistering?'게임을 이 기기에 저장하는 중입니다.':pwaStandalone()?(pwaReady?'홈 화면 앱으로 실행 중 · 오프라인 준비 완료':'홈 화면 앱으로 실행 중'):pwaReady?'오프라인 준비 완료 · 한 번 접속한 이 기기에서 인터넷 없이도 실행할 수 있어요.':location.protocol==='file:'?'홈 화면 설치는 인터넷 게임 주소에서 사용할 수 있어요.':'먼저 인터넷에 연결해 게임을 열어 주세요.';
 button.hidden=!pwaInstallPrompt||pwaStandalone();button.onclick=async()=>{const prompt=pwaInstallPrompt;if(!prompt)return;try{await prompt.prompt();await prompt.userChoice;}catch{}pwaInstallPrompt=null;renderPwaStatus();};
}
function observePwaWorker(worker){
 if(!worker)return;pwaInstallingWorker=worker;if(pwaObservedWorkers.has(worker))return;pwaObservedWorkers.add(worker);
 worker.addEventListener('statechange',()=>{
  if(worker!==pwaInstallingWorker)return;
  if(worker.state==='activated')worker.postMessage({type:'WIN_AGAIN_PWA_STATUS'});
  if(worker.state==='redundant'&&pwaPreparationPhase==='preparing')setPwaPreparation('error');
 });
}
function observePwaRegistration(registration){
 if(registration.installing)observePwaWorker(registration.installing);
 if(pwaObservedRegistrations.has(registration))return;pwaObservedRegistrations.add(registration);
 registration.addEventListener('updatefound',()=>{if(!registration.installing)return;setPwaPreparation('preparing');observePwaWorker(registration.installing);});
}
function requestPwaStatus(registration){
 if(!registration.installing)registration.active?.postMessage({type:'WIN_AGAIN_PWA_STATUS'});
}
function registerPwa(retry=false){
 if(pwaRegistering)return Promise.resolve();const attempt=++pwaRegistrationAttempt;setPwaPreparation('preparing');
 return navigator.serviceWorker.register('./sw.js',{scope:'./',updateViaCache:'none'}).then(async registration=>{
  if(attempt!==pwaRegistrationAttempt)return;pwaRegistration=registration;observePwaRegistration(registration);
  if(retry&&typeof registration.update==='function')await registration.update();
  if(attempt!==pwaRegistrationAttempt)return;requestPwaStatus(registration);
  return navigator.serviceWorker.ready;
 }).then(registration=>{if(registration&&attempt===pwaRegistrationAttempt)requestPwaStatus(registration);}).catch(()=>{if(attempt===pwaRegistrationAttempt)setPwaPreparation('error');});
}
function initPwa(){
 window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();pwaInstallPrompt=event;renderPwaStatus();});window.addEventListener('appinstalled',()=>{pwaInstallPrompt=null;renderPwaStatus();});
 const allowed=/^https?:$/.test(location.protocol)&&window.isSecureContext&&/\/$|\/index\.html$/.test(location.pathname)&&!/(?:qa-|offline-check)/.test(location.pathname);
 if(!allowed||!('serviceWorker' in navigator)){renderPwaStatus();return;}
 navigator.serviceWorker.addEventListener('message',event=>{
  const data=event.data;if(data?.version!=='v22')return;
  if(pwaInstallingWorker?.state==='installing'&&event.source&&event.source!==pwaInstallingWorker)return;
  if(data.type==='WIN_AGAIN_PWA_READY')setPwaPreparation('ready');
  if(data.type==='WIN_AGAIN_PWA_ERROR')setPwaPreparation('error');
 });
 navigator.serviceWorker.addEventListener('controllerchange',()=>navigator.serviceWorker.controller?.postMessage({type:'WIN_AGAIN_PWA_STATUS'}));
 registerPwa();
}
