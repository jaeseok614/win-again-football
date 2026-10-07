var playbackPrefs={speed:'normal',coachPause65:false},matchClock=MatchFlow.createClock();
function renderMatchControls(){
 const host=document.getElementById('match-controls');if(!host)return;
 if(!state||state.phase==='full'){host.hidden=true;return;}host.hidden=false;
 const active=F.running(state),status=active?(state.paused?state.minute+'분 · 작전 타임':state.minute+'분 · 경기 진행 중'):state.phase==='prep'?'감독의 속도로 경기 보기':state.phase==='half'?'하프타임 · 후반을 준비하세요':'65분 · 코치 점검';
 const markup=`<section class="match-controls" aria-label="경기 속도와 작전 시간"><div class="match-control-heading"><div><span class="eyebrow">경기 진행</span><strong>${status}</strong></div><button type="button" class="secondary" data-match-planning ${active?'':'disabled'}>${active&&state.paused?'작전 마치고 경기 이어가기':'멈추고 작전 보드 열기'}</button></div><div class="match-control-settings"><div class="match-speed-buttons" role="group" aria-label="경기 진행 속도">${Object.entries(MatchFlow.speeds).map(([key,s])=>`<button type="button" data-match-speed="${key}" aria-pressed="${playbackPrefs.speed===key}" aria-label="${s.label} 경기 속도">${s.label}<small>${s.multiplier}×</small></button>`).join('')}</div><label class="coach-pause-setting"><input type="checkbox" data-coach-pause ${playbackPrefs.coachPause65?'checked':''}>65분에 코치와 자동 작전 타임</label></div><p>전술·교체는 경기 중 언제든 · 하프타임은 자동 정지 · 빠르게 보기는 5분씩</p></section>`;
 // The timer must not replace the focused speed or planning control every tick.
 if(host.dataset.markup===markup)return;
 const previous=document.activeElement,focus=host.contains(previous)?previous?.dataset:null;
 host.innerHTML=markup;host.dataset.markup=markup;
 const selector=focus?.matchSpeed?'[data-match-speed="'+focus.matchSpeed+'"]':focus&&Object.hasOwn(focus,'matchPlanning')?'[data-match-planning]':focus&&Object.hasOwn(focus,'coachPause')?'[data-coach-pause]':null;
 if(selector)host.querySelector(selector)?.focus({preventScroll:true});
}
function pauseForPlanning(){
 if(!state||!F.running(state))return;
 state.paused=true;matchClock.reset();movementStamp=performance.now();clearMatchFeedback({preservePending:true});
}
function collapseTacticsBoard(){tacticsBoardOpen=false;const details=document.getElementById('tactics-board')?.querySelector('details');if(details)details.open=false;}
function toggleMatchPlanning(openBoard=false){
 if(!state||!F.running(state))return;
 if(openBoard)matchdayTab=state.paused?'live':'analysis';
 action(()=>{if(state.paused){state.paused=false;selected=null;matchClock.reset();movementStamp=performance.now();}else{pauseForPlanning();if(openBoard)tacticsBoardOpen=true;}});
 if(openBoard&&state.paused){const host=document.getElementById('tactics-board'),details=host?.querySelector('details');if(details){details.open=true;details.querySelector('summary')?.scrollIntoView({behavior:'instant',block:'start'});details.querySelector('summary')?.focus({preventScroll:true});}}
}
document.getElementById('match-controls')?.addEventListener('click',event=>{
 const speed=event.target.closest('[data-match-speed]'),planning=event.target.closest('[data-match-planning]');
 if(speed){const chosen=speed.dataset.matchSpeed;if(!Object.hasOwn(MatchFlow.speeds,chosen))return;playbackPrefs.speed=chosen;matchClock.reset();save();renderMatchControls();document.getElementById('match-controls').querySelector('[data-match-speed="'+chosen+'"]')?.focus({preventScroll:true});}
 else if(planning&&!planning.disabled)toggleMatchPlanning(true);
});
document.getElementById('match-controls')?.addEventListener('change',event=>{if(!event.target.matches('[data-coach-pause]'))return;playbackPrefs.coachPause65=event.target.checked;save();renderMatchControls();renderTacticsBoard();document.getElementById('match-controls').querySelector('[data-coach-pause]')?.focus({preventScroll:true});});
