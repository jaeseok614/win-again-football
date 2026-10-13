// One landscape workspace; original controls keep their original event handlers.
var landscapeTacticsTab='overview';
function applyLandscapeTactics(){
 const section=$('match-popup-tactics'),host=$('tactical-editor');if(!host)return;
 section.classList.add('landscape-tactics');
 const visible={overview:'.tactical-pitch,.tactical-selected-profile,.tactical-team-strip',roles:'.tactical-pitch,.tactical-team-strip',support:'.tactical-pitch,.support-map-toggle,.support-summary,.tactical-team-strip'};
 for(const n of host.children)n.classList.toggle('report-page-off',!n.matches(visible[landscapeTacticsTab]||visible.overview));
 for(const n of section.children){if(n===host)continue;n.classList.toggle('report-page-off',!n.matches('.field-toolbar,.landscape-tactics-tabs')&&!(n.id==='pitch-player-tools'&&landscapeTacticsTab==='roles'));}
 let tabs=section.querySelector('.landscape-tactics-tabs');
 if(!tabs){tabs=document.createElement('nav');tabs.className='landscape-tactics-tabs';tabs.setAttribute('aria-label','배치판 옆 정보');tabs.innerHTML=[['overview','선수 능력'],['roles','선수 역할'],['support','지원 관계']].map(([id,label])=>'<button type="button" data-tactics-side="'+id+'">'+label+'</button>').join('');section.prepend(tabs);tabs.onclick=e=>{const b=e.target.closest('[data-tactics-side]');if(!b)return;landscapeTacticsTab=b.dataset.tacticsSide;applyLandscapeTactics();};}
 section.dataset.side=landscapeTacticsTab;
 tabs.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.tacticsSide===landscapeTacticsTab)));
 if(!selected&&state?.lineup?.length){const id=positions().find(r=>r.p.pos!=='GK')?.id;if(id){selected=id;renderPitchPlayerTools();}}
}
const landscapePopupRender=renderMatchPopup;
renderMatchPopup=function(){landscapePopupRender();if(matchPopupActive==='tactics')applyLandscapeTactics();};
const rotationPrompt=document.createElement('dialog');
rotationPrompt.id='landscape-rotation';rotationPrompt.setAttribute('aria-labelledby','landscape-rotation-title');
rotationPrompt.innerHTML='<div class="rotation-device" aria-hidden="true">↻</div><h2 id="landscape-rotation-title">휴대폰을 가로로 돌려 주세요</h2><p>선수 배치와 능력치를 한눈에 보는 가로 전용 게임입니다.<br>휴대폰의 자동 회전을 켜 주세요.</p><button type="button" id="landscape-fullscreen">전체 화면으로 전환</button><p id="landscape-rotation-note" role="status">진행 중인 경기는 일시 정지됩니다.</p>';
document.body.append(rotationPrompt);
rotationPrompt.addEventListener('cancel',e=>e.preventDefault());
$('landscape-fullscreen').onclick=async()=>{try{if(!document.fullscreenElement)await document.documentElement.requestFullscreen();if(screen.orientation?.lock)await screen.orientation.lock('landscape');}catch(error){$('landscape-rotation-note').textContent='이 브라우저는 방향 고정을 지원하지 않습니다. 자동 회전을 켜고 기기를 가로로 돌려 주세요.';}};
function syncLandscapeOrientation(){
 const portrait=innerHeight>innerWidth;
 if(portrait&&!rotationPrompt.open){if(typeof state!=='undefined'&&state&&typeof pauseForPlanning==='function')pauseForPlanning();rotationPrompt.showModal();}
 else if(!portrait&&rotationPrompt.open)rotationPrompt.close();
}
window.addEventListener('resize',syncLandscapeOrientation);
syncLandscapeOrientation();

// Bound the display field to a football-like ratio. Does not touch world coordinates.
var matchWorkspaceFrame=0;
function fitMatchWorkspace(){
 if(matchWorkspaceFrame)return;
 matchWorkspaceFrame=requestAnimationFrame(()=>{
  matchWorkspaceFrame=0;if(view!=='match'||innerWidth<innerHeight)return;
  const pane=$('match-pane');if(!pane)return;
  const style=getComputedStyle(pane),rows=style.gridTemplateRows.split(' ').map(Number.parseFloat),availableHeight=rows[1]+rows[2]+Number.parseFloat(style.rowGap);
  if(!Number.isFinite(availableHeight))return;
  const width=Math.floor((pane.clientWidth-4)*.62);
  pane.style.setProperty('--match-field-width',Math.round(width)+'px');
  pane.style.setProperty('--match-field-height',Math.floor(availableHeight)+'px');
 });
}
new ResizeObserver(fitMatchWorkspace).observe($('match-pane'));window.addEventListener('resize',fitMatchWorkspace);
