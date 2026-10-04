var matchdayTab='live';
function matchdayText(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function matchdayPlayerCard(p){
 return '<div class="matchday-selected-player">'+Portraits.html(p)+'<div class="matchday-selected-copy"><small>교체할 선수 · '+matchdayText(p.role)+'</small><h3 id="matchday-selected-name" tabindex="-1">'+matchdayText(p.name)+'</h3></div></div><div class="matchday-selected-stats"><span>'+matchdayText(p.primaryLabel)+' <b>'+p.primary+'</b></span><span>속도 <b>'+p.speed+'</b></span><span>체력 <b class="'+(p.energy<50?'loss':'')+'">'+Math.round(p.energy)+'</b></span></div><div class="matchday-selected-actions"><button type="button" data-player-detail="'+matchdayText(p.identity)+'">선수 상세</button><button type="button" data-matchday="clear">선택 취소</button></div>';
}
function matchdaySelectionMarkup(d){
 if(d.liveMode==='full')return '<div class="matchday-selection-hint"><h3>교체 종료</h3><p>경기 결과를 확인한 뒤 다음 일정을 준비하세요.</p></div>';
 if(d.selected)return matchdayPlayerCard(d.selected)+'<p class="matchday-candidate-note">'+(d.substitution.canSubstitute?(d.candidates.length?'아래에서 '+matchdayText(d.selected.role)+' 교체 후보를 고르세요.':'같은 포지션의 출전 가능한 후보가 없습니다.'):d.minute===0&&d.liveMode!=='prep'?'첫 1분이 지난 뒤 교체할 수 있습니다.':'교체 3회를 모두 사용했습니다.')+'</p>';
 const q=d.substitution.suggestion,suggestion=q?'<button type="button" class="suggested-sub" data-matchday-player="'+matchdayText(q.out.id)+'" aria-label="추천 교체 검토 · '+matchdayText(q.out.name)+' 대신 '+matchdayText(q.incoming.name)+'"><span>코치 추천 교체</span><b>'+matchdayText(q.out.name)+' <i aria-hidden="true">→</i> '+matchdayText(q.incoming.name)+'</b><small>'+matchdayText(q.reason)+' · 눌러서 후보 확인</small></button>':'';
 return suggestion+'<div class="matchday-selection-hint"><h3>교체할 선수</h3><p>경기장에서 선수를 누르거나, 아래 선발을 선택하세요.</p></div><div class="matchday-tired-list">'+d.lowestEnergy.map(p=>'<button type="button" data-matchday-player="'+matchdayText(p.id)+'" aria-label="'+matchdayText(p.name)+' 교체 대상으로 선택">'+Portraits.html(p)+'<span><strong>'+matchdayText(p.name)+'</strong><small>'+matchdayText(p.pos)+' · 체력 '+Math.round(p.energy)+'</small></span></button>').join('')+'</div><small class="matchday-candidate-note">현재 선발 중 체력이 낮은 3명</small>';
}
function matchdayMomentumMarkup(momentum,insight){
 const bars=momentum.windows.map((item,index)=>{
  const own=Math.round(item.own/momentum.scale*100),opponent=Math.round(item.opponent/momentum.scale*100),current=index===momentum.active;
  return '<li class="'+(current?'current':'')+'"'+(current?' aria-current="true"':'')+' aria-label="'+item.from+'분부터 '+item.to+'분, 우리 흐름 '+item.own+', 상대 흐름 '+item.opponent+'"><span class="momentum-bars" aria-hidden="true"><i class="ours" style="height:'+own+'%"></i><i class="theirs" style="height:'+opponent+'%"></i></span><small>'+(item.to===90?'90′':item.to)+'</small></li>';
 }).join('');
 const alert=insight?'<div class="analyst-alert" role="status"><b>'+matchdayText(insight.title)+'</b><span>'+matchdayText(insight.text)+'</span><button type="button" data-matchday="'+matchdayText(insight.action)+'">'+matchdayText(insight.actionLabel)+'</button></div>':'';
 return alert+'<details class="match-momentum '+momentum.leader+'" aria-label="15분 단위 경기 흐름"><summary class="momentum-heading"><span><b>경기 흐름</b><small>분석 그래프 보기</small></span><p>'+matchdayText(momentum.message)+'</p></summary><div class="momentum-detail"><span class="momentum-legend" aria-hidden="true"><i></i>우리 <i></i>상대 · 기회 · 슈팅 · 골 가중치</span><ol>'+bars+'</ol></div></details>';
}
function renderMatchday(){
 if(typeof view!=='undefined'&&view!=='match')return;
 const host=document.getElementById('matchday-summary');if(!host)return;
 const d=Matchday.read(season,selected);host.hidden=!d.valid;if(!d.valid){const board=document.getElementById('tactics-board');if(board)board.hidden=true;return;}
 if(typeof Opposition!=='undefined'&&typeof opponentMatchContext!=='undefined'&&opponentMatchContext!==state.seed){opponentMatchContext=state.seed;if(d.liveMode==='prep')matchdayTab='opponent';}
 if(d.liveMode==='live'||d.liveMode==='full')matchdayTab='live';
 const stats=d.stats.map(s=>'<div class="matchday-stat"><span>'+s.label+'</span><strong>'+s.own+' <i>:</i> '+s.opponent+'</strong><small>우리 : 상대</small></div>').join('');
 const summary='<div class="matchday-summary-grid">'+stats+'<button type="button" class="matchday-stat matchday-fatigue '+(d.lowestEnergy[0].energy<50?'critical':'')+'" data-matchday-player="'+matchdayText(d.lowestEnergy[0].id)+'" aria-label="'+matchdayText(d.lowestEnergy[0].name)+' 체력 '+Math.round(d.lowestEnergy[0].energy)+', 평균 '+Math.round(d.averageEnergy)+'. 교체 준비"><span>선발 평균 체력</span><strong>'+Math.round(d.averageEnergy)+'</strong><small class="fatigue-low">최저 '+matchdayText(d.lowestEnergy[0].name.split(' ').at(-1))+' '+Math.round(d.lowestEnergy[0].energy)+'</small></button><div class="matchday-stat"><span>'+(d.liveMode==='prep'?'교체 가능 횟수':'남은 교체')+'</span><strong>'+d.substitution.remaining+' <small>/ '+d.substitution.limit+'</small></strong><small>'+matchdayText(d.tacticLabel)+'</small></div></div>'+matchdayMomentumMarkup(d.momentum,d.insight);
 if(host.dataset.markup!==summary){const open=host.querySelector('.match-momentum')?.open;host.innerHTML=summary;host.dataset.markup=summary;if(open)host.querySelector('.match-momentum').open=true;}
 const analysis=matchdayTab==='analysis';
 document.getElementById('matchday-live').hidden=matchdayTab!=='live';
 const opponentHost=document.getElementById('opposition-report');if(opponentHost)opponentHost.hidden=matchdayTab!=='opponent';
 document.getElementById('tactics-board').hidden=!analysis;
 for(const id of ['live','opponent','analysis']){const button=document.getElementById('matchday-tab-'+id),active=matchdayTab===id;if(!button)continue;button.setAttribute('aria-selected',String(active));button.tabIndex=active?0:-1;button.disabled=id==='analysis'&&d.liveMode==='full';}
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
 if(typeof renderOpponentReport==='function')renderOpponentReport();
 const cards=document.getElementById('card-counter');if(cards&&typeof Discipline!=='undefined'){cards.hidden=!state.discipline;const own=Discipline.count(state),opp=Discipline.count(state,1);cards.textContent='🟨 '+own.yellow+':'+opp.yellow+' · 🟥 '+own.red+':'+opp.red;}
}
function setMatchdayTab(tab){
 if(!['live','opponent','analysis'].includes(tab)||!state||tab==='analysis'&&state.phase==='full')return;
 if(tab==='opponent')pauseForPlanning();
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
 if(!state||!editable()||!Matchday.read(season,id).selected)return;
 pauseForPlanning();collapseTacticsBoard();matchdayTab='live';selected=id;save();render();
 if(innerWidth<730)focusMatchdaySelection();
}
document.getElementById('matchday-tabs')?.addEventListener('click',event=>{const button=event.target.closest('[data-matchday-tab]');if(button&&!button.disabled)setMatchdayTab(button.dataset.matchdayTab);});
document.getElementById('matchday-tabs')?.addEventListener('keydown',event=>{
 const button=event.target.closest('[data-matchday-tab]');if(!button||!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
 event.preventDefault();const tabs=document.getElementById('matchday-tab-opponent')?['live','opponent','analysis']:['live','analysis'],index=tabs.indexOf(button.dataset.matchdayTab);setMatchdayTab(event.key==='Home'?tabs[0]:event.key==='End'?tabs.at(-1):tabs[(index+(event.key==='ArrowRight'?1:tabs.length-1))%tabs.length]);
});
document.getElementById('match-pane')?.addEventListener('click',event=>{
 const player=event.target.closest('[data-matchday-player]'),button=event.target.closest('[data-matchday]');
 if(player){selectMatchdayPlayer(player.dataset.matchdayPlayer);return;}
 if(!button||button.disabled)return;
 if(button.dataset.matchday==='analysis'){setMatchdayTab('analysis');return;}
 if(button.dataset.matchday==='clear'){selected=null;save();render();}
 else if(button.dataset.matchday==='roster'){if(!state||!editable())return;pauseForPlanning();matchdayTab='live';save();render();focusMatchdaySelection();}
});
