var matchdayTab='live';
function matchdayText(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function matchdayPlayerCard(p){
 return '<div class="matchday-selected-player">'+Portraits.html(p)+'<div class="matchday-selected-copy"><small>교체할 선수 · '+matchdayText(p.role)+'</small><h3 id="matchday-selected-name" tabindex="-1">'+matchdayText(p.name)+'</h3></div></div><div class="matchday-selected-stats"><span>'+matchdayText(p.primaryLabel)+' <b>'+p.primary+'</b></span><span>속도 <b>'+p.speed+'</b></span><span>체력 <b class="'+(p.energy<50?'loss':'')+'">'+Math.round(p.energy)+'</b></span></div><div class="matchday-selected-actions"><button type="button" data-player-detail="'+matchdayText(p.identity)+'">선수 상세</button><button type="button" data-matchday="clear">선택 취소</button></div>';
}
function matchdaySelectionMarkup(d){
 if(d.liveMode==='full')return '<div class="matchday-selection-hint"><h3>교체 종료</h3><p>경기 결과를 확인한 뒤 다음 일정을 준비하세요.</p></div>';
 if(d.selected)return matchdayPlayerCard(d.selected)+'<p class="matchday-candidate-note">'+(d.substitution.canSubstitute?(d.candidates.length?'아래에서 '+matchdayText(d.selected.role)+' 교체 후보를 고르세요.':'같은 포지션의 출전 가능한 후보가 없습니다.'):d.minute===0&&d.liveMode!=='prep'?'첫 1분이 지난 뒤 교체할 수 있습니다.':'교체 3회를 모두 사용했습니다.')+'</p>';
 return '<div class="matchday-selection-hint"><h3>교체할 선수</h3><p>경기장에서 선수를 누르거나, 아래 선발을 선택하세요.</p></div><div class="matchday-tired-list">'+d.lowestEnergy.map(p=>'<button type="button" data-matchday-player="'+matchdayText(p.id)+'" aria-label="'+matchdayText(p.name)+' 교체 대상으로 선택">'+Portraits.html(p)+'<span><strong>'+matchdayText(p.name)+'</strong><small>'+matchdayText(p.pos)+' · 체력 '+Math.round(p.energy)+'</small></span></button>').join('')+'</div><small class="matchday-candidate-note">현재 선발 중 체력이 낮은 3명</small>';
}
function renderMatchday(){
 const host=document.getElementById('matchday-summary');if(!host)return;
 const d=Matchday.read(season,selected);host.hidden=!d.valid;if(!d.valid)return;
 if(d.liveMode==='live'||d.liveMode==='full')matchdayTab='live';
 const stats=d.stats.map(s=>'<div class="matchday-stat"><span>'+s.label+'</span><strong>'+s.own+' <i>:</i> '+s.opponent+'</strong><small>우리 : 상대</small></div>').join('');
 const summary='<div class="matchday-summary-grid">'+stats+'<div class="matchday-stat"><span>선발 평균 체력</span><strong>'+Math.round(d.averageEnergy)+'</strong><small>'+d.tiredCount+'명 체력 50 미만</small></div><div class="matchday-stat"><span>'+(d.liveMode==='prep'?'교체 가능 횟수':'남은 교체')+'</span><strong>'+d.substitution.remaining+' <small>/ '+d.substitution.limit+'</small></strong><small>'+matchdayText(d.tacticLabel)+'</small></div></div>';
 if(host.dataset.markup!==summary){host.innerHTML=summary;host.dataset.markup=summary;}
 const analysis=matchdayTab==='analysis';
 document.getElementById('matchday-live').hidden=analysis;
 document.getElementById('tactics-board').hidden=!analysis;
 for(const id of ['live','analysis']){const button=document.getElementById('matchday-tab-'+id),active=matchdayTab===id;button.setAttribute('aria-selected',String(active));button.tabIndex=active?0:-1;button.disabled=id==='analysis'&&d.liveMode==='full';}
 const selection=document.getElementById('matchday-selection'),html=matchdaySelectionMarkup(d);
 if(selection.dataset.markup!==html){
  const focused=selection.contains(document.activeElement)?document.activeElement:null;
  const key=focused?.dataset.matchdayPlayer,action=focused?.dataset.matchday;
  const identity=focused?.dataset.playerDetail;
  selection.innerHTML=html;selection.dataset.markup=html;
  const selector=key?'[data-matchday-player="'+key+'"]':action?'[data-matchday="'+action+'"]':identity?'[data-player-detail="'+identity+'"]':null;
  if(focused){const next=(selector&&selection.querySelector(selector))||document.getElementById('matchday-selected-name')||selection.querySelector('[data-matchday-player]');next?.focus({preventScroll:true});}
 }
 const roster=document.getElementById('matchday-roster');roster.hidden=d.liveMode==='full';
 const note=document.getElementById('selection-hint');note.hidden=!!d.selected||d.liveMode==='full';
 if(!d.selected&&d.liveMode!=='full')note.textContent='선발을 선택하면 같은 포지션의 후보만 표시합니다.';
 document.getElementById('bench-heading').textContent=d.selected?d.selected.role+' 교체 후보':'교체 명단';
 document.getElementById('pause').textContent=d.paused?'5분 진행':'일시 정지';
}
function setMatchdayTab(tab){
 if(!['live','analysis'].includes(tab)||!state||tab==='analysis'&&state.phase==='full')return;
 if(tab==='analysis'){pauseForPlanning();tacticsBoardOpen=true;const details=document.getElementById('tactics-board')?.querySelector('details');if(details)details.open=true;}
 matchdayTab=tab;save();render();
 document.getElementById('matchday-tab-'+tab)?.focus({preventScroll:true});
}
function focusMatchdaySelection(){
 const host=document.getElementById('matchday-selection');if(!host||view!=='match')return;
 host.scrollIntoView({block:'center',behavior:'instant'});
 (document.getElementById('matchday-selected-name')||host.querySelector('[data-matchday-player]'))?.focus({preventScroll:true});
}
function selectMatchdayPlayer(id){
 if(!state||!editable()||!state.lineup.includes(id))return;
 pauseForPlanning();collapseTacticsBoard();matchdayTab='live';selected=id;save();render();
 if(innerWidth<730)focusMatchdaySelection();
}
document.getElementById('matchday-tabs')?.addEventListener('click',event=>{const button=event.target.closest('[data-matchday-tab]');if(button&&!button.disabled)setMatchdayTab(button.dataset.matchdayTab);});
document.getElementById('matchday-tabs')?.addEventListener('keydown',event=>{
 const button=event.target.closest('[data-matchday-tab]');if(!button||!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
 event.preventDefault();setMatchdayTab(event.key==='Home'?'live':event.key==='End'?'analysis':button.dataset.matchdayTab==='live'?'analysis':'live');
});
document.getElementById('match-pane')?.addEventListener('click',event=>{
 const player=event.target.closest('[data-matchday-player]'),button=event.target.closest('[data-matchday]');
 if(player){selectMatchdayPlayer(player.dataset.matchdayPlayer);return;}
 if(!button||button.disabled)return;
 if(button.dataset.matchday==='clear'){selected=null;save();render();}
 else if(button.dataset.matchday==='roster'){if(!state||!editable())return;pauseForPlanning();matchdayTab='live';save();render();focusMatchdaySelection();}
});
