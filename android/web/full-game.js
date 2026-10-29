/* Native-only purchase presentation. Entitlements arrive only from the native verifier. */
(() => {
 'use strict';
 let billing = { owned:false, canBuy:false, busy:false, status:'unavailable', price:'', message:'정식판 판매를 준비하고 있습니다. 첫 시즌은 무료로 체험할 수 있어요.' };
 const bridge = window.WinAgainBilling;
 const blocked = s => !billing.owned && Number(s?.year) > 1;
 const request = action => {
  if (!bridge || typeof bridge.postMessage !== 'function') return;
  bridge.postMessage(JSON.stringify({action}));
 };
 function update() {
  const dialog = document.getElementById('full-game-dialog');
  if (!dialog) return;
  dialog.querySelector('[data-full-status]').textContent = billing.message;
  const buy = dialog.querySelector('[data-full-buy]');
  buy.textContent = billing.owned ? '정식판 이용 중' : billing.price ? billing.price+' · 1회 구매' : '판매 준비 중';
  buy.disabled = billing.owned || billing.busy || !billing.canBuy;
  dialog.querySelector('[data-full-restore]').disabled = billing.busy;
 }
 function show() {
  if (typeof pauseForPlanning === 'function') pauseForPlanning();
  let dialog = document.getElementById('full-game-dialog');
  if (!dialog) {
   dialog = document.createElement('dialog'); dialog.id = 'full-game-dialog';
   dialog.setAttribute('aria-labelledby','full-game-title');
   dialog.innerHTML = '<header><h2 id="full-game-title">첫 시즌 무료 · 정식판 1회 구매</h2><button type="button" data-full-close aria-label="정식판 안내 닫기">닫기</button></header>'+
    '<div class="full-game-copy"><p>첫 시즌의 모든 리그·컵 경기와 결산까지 무료입니다. 두 번째 시즌부터는 정식판이 필요해요. 자동 결제·구독·광고는 없습니다.</p>'+
    '<p>한 번 구매하면 이후 시즌과 새 삶을 계속 즐길 수 있어요. 같은 Google Play 계정으로 구매를 복원할 수 있습니다. 구단 기록 열람·저장·내보내기는 계속 가능해요.</p>'+
    '<p class="full-game-note">구매·복원 및 7일마다 권한 확인에 인터넷이 필요합니다. 구매 토큰은 개발자의 검증 서버와 Google Play에서 확인하며 구단 파일에는 구매 권한이 포함되지 않습니다.</p>'+
    '<p data-full-status role="status" aria-live="polite"></p></div>'+
    '<footer><button type="button" class="primary" data-full-buy></button><button type="button" class="secondary" data-full-restore>구매 복원</button><button type="button" class="secondary" data-full-save>구단 저장·내보내기</button></footer>';
   dialog.querySelector('[data-full-close]').onclick = () => dialog.close();
   dialog.querySelector('[data-full-buy]').onclick = () => { if (!billing.busy && billing.canBuy && !billing.owned) { billing={...billing,busy:true,message:'Google Play 결제 화면을 여는 중…'};update();request('buy'); } };
   dialog.querySelector('[data-full-restore]').onclick = () => { if (!billing.busy) { billing={...billing,busy:true,message:'구매 내역을 확인하는 중…'};update();request('restore');if(!bridge){billing={...billing,busy:false,message:'Google Play에서 설치한 앱에서 구매를 복원해 주세요.'};update();} } };
   dialog.querySelector('[data-full-save]').onclick = () => {dialog.close();openPortability();};
   document.body.appendChild(dialog);
  }
  update(); if (!dialog.open) dialog.showModal();
  dialog.querySelector('[data-full-close]').focus({preventScroll:true});
 }
 function requireFull() { if (!billing.owned) { show(); throw Error('무료 체험은 첫 시즌까지입니다. 정식판을 구매하거나 구매 내역을 복원해 주세요.'); } }
 // Model entry points also protect WebMCP actions and imported later-season saves.
 const nextSeason = S.nextSeason, settle = S.settle;
 S.nextSeason = (...args) => {requireFull();return nextSeason(...args);};
 S.settle = (s,...args) => {if(blocked(s))requireFull();return settle(s,...args);};
 const advance = advanceMatchWithFeedback;
 advanceMatchWithFeedback = (...args) => {if(blocked(season))requireFull();return advance(...args);};
 for (const name of ['begin','finishSegment']) {
  const original=F[name];F[name]=(match,...args)=>{if(match===season.match&&blocked(season))requireFull();return original(match,...args);};
 }
 // Returning an empty event list stops old restored running matches without
 // throwing into RAF/intervals. Practice stays free and physics is untouched.
 for (const name of ['tick','advanceContinuous']) {
  const original=F[name];F[name]=(match,...args)=>{if(match===season.match&&blocked(season)){match.paused=true;return [];}return original(match,...args);};
 }
 const shell=renderAppShell;
 renderAppShell=()=>{shell();const info=document.getElementById('launch-campaign');if(info)info.textContent+=' · '+(billing.owned?'정식판':Number(season.year)>1?'정식판 구매·복원 필요':'첫 시즌 무료 체험');};
 const renderInfo=window.renderPwaStatus;
 window.renderPwaStatus=()=>{
  renderInfo();
  const host=document.getElementById('portability-dialog')?.querySelector('.portable-install');
  if(host&&!host.querySelector('[data-full-open]')){
   const button=document.createElement('button');button.type='button';button.className='secondary';button.dataset.fullOpen='';button.textContent='정식판 구매·복원';button.onclick=show;host.appendChild(button);
  }
 };
 document.querySelectorAll('[data-open-portability]').forEach(button=>button.textContent='저장·정식판');
 // First disclosure is visible before the player enters a new trial campaign.
 let disclosed=false;
 try{disclosed=localStorage.getItem('win-again-trial-notice-v1')==='seen';}catch{/* The notice can be shown again if storage is unavailable. */}
 document.addEventListener('click',event=>{
  if(event.target.closest?.('#launch-continue')&&!disclosed&&!billing.owned){disclosed=true;try{localStorage.setItem('win-again-trial-notice-v1','seen');}catch{}event.preventDefault();event.stopImmediatePropagation();show();}
  if(event.target.closest?.('#confirm-next-season')&&!billing.owned){event.preventDefault();event.stopImmediatePropagation();show();}
 },true);
 if (bridge) bridge.onmessage=event=>{
  let value;try{value=JSON.parse(event.data);}catch{return;}
  if(value?.type!=='billing'||typeof value.owned!=='boolean')return;
  billing={owned:value.owned,canBuy:value.canBuy===true,busy:value.busy===true,status:String(value.status||''),price:String(value.price||''),message:String(value.message||'')};
  if(!billing.owned&&Number(season.year)>1&&state)state.paused=true;
  update();renderAppShell();
 };
 window.WinAgainFullGame=Object.freeze({show, get status(){return Object.freeze({...billing});}});
 const style=document.createElement('style');style.textContent=
  '#full-game-dialog{box-sizing:border-box;width:min(680px,calc(100% - 20px));max-height:calc(100dvh - 16px);padding:14px;overflow:hidden}'+
  '#full-game-dialog[open]{display:flex;flex-direction:column;gap:10px}#full-game-dialog header,#full-game-dialog footer{display:flex;gap:8px;align-items:center;flex-shrink:0}'+
  '#full-game-dialog h2{font-size:18px;line-height:1.3;margin:0;flex:1}#full-game-dialog p{font-size:14px;line-height:1.45;margin:0 0 8px}'+
  '#full-game-dialog .full-game-copy{min-height:0;overflow:auto}#full-game-dialog .full-game-note{font-size:12px}#full-game-dialog button{min-height:44px;white-space:normal}'+
  '#full-game-dialog footer{flex-wrap:wrap;margin:0;padding:0;border:0}#full-game-dialog footer button{flex:1}#full-game-dialog [data-full-status]{margin:0;color:#c9e8ac}'+
  '@media(max-height:390px){#full-game-dialog[open]{padding:10px;gap:6px}#full-game-dialog h2{font-size:16px}#full-game-dialog p{font-size:12px;line-height:1.35;margin-bottom:6px}#full-game-dialog .full-game-note{font-size:11px}}';
 document.head.appendChild(style);
 renderAppShell();
 request('status');
})();
