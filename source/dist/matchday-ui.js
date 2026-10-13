var matchdayTab='live';
function matchdayText(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function matchdayCardInfo(id,team=0){
 const events=(state?.discipline?.events||[]).filter(e=>e.team===team&&e.id===id),sentOff=events.some(e=>e.card==='red'),secondYellow=events.some(e=>e.reason==='second-yellow'),yellow=events.filter(e=>e.card==='yellow').length+(secondYellow?1:0);
 if(sentOff)return {sentOff, yellow, label:secondYellow?'두 번째 경고로 퇴장':'퇴장', markup:'<em class="matchday-card-badge sent-off">🟥 '+(secondYellow?'두 번째 경고 · 퇴장':'퇴장')+'</em>'};
 if(yellow)return {sentOff:false,yellow,label:'경고 '+yellow,markup:'<em class="matchday-card-badge">🟨 경고 '+yellow+'</em>'};
 return {sentOff:false,yellow:0,label:'',markup:''};
}
function matchdayPlayerMetrics(p){
 const live=state?.players?.[p.id],person=live?.identity===p.identity?live:p;
 return {overall:SquadOverview.overall(person),condition:typeof PlayerTraits!=='undefined'?PlayerTraits.condition(season,person):{score:null,tier:'unknown',label:'정보 없음'}};
}
function matchdaySelectionMarkup(d){
 if(d.liveMode==='full')return '<div class="matchday-selection-hint"><h3>교체 종료</h3><p>경기 결과를 확인한 뒤 다음 일정을 준비하세요.</p></div>';
 const reason=d.selected&&matchdayCardInfo(d.selected.id).sentOff?'퇴장한 선수는 교체할 수 없습니다.':d.substitution.canSubstitute?(d.candidates.length?'':'같은 포지션의 출전 가능한 후보가 없습니다.'):d.minute===0&&d.liveMode!=='prep'?'첫 1분이 지난 뒤 교체할 수 있습니다.':d.substitution.windows?.remaining===0?'교체 기회를 모두 사용했습니다.':'교체 가능 인원을 모두 사용했습니다.';
 const recommendation=d.substitution.suggestion;
 const selection=d.selected?'<div class="roster-choice"><span><small>선택한 선발 · '+matchdayText(d.selected.pos)+'</small><b id="matchday-selected-name" tabindex="-1">'+matchdayText(d.selected.name)+'</b><small>종합 '+matchdayPlayerMetrics(d.selected).overall+' · 체력 '+Math.round(d.selected.energy)+(reason?' · '+matchdayText(reason):'')+'</small></span><button type="button" data-matchday="clear">선택 취소</button></div>':'<div class="roster-choice"><span><b>1. 나올 선수를 선택하세요</b><small>'+(recommendation?'코치 추천: '+matchdayText(recommendation.out.name)+' → '+matchdayText(recommendation.incoming.name):'2. 오른쪽 후보를 눌러 교체합니다.')+'</small></span></div>';
 const players=state.lineup.map(id=>({...state.players[id]}));
 const shown=new Set(players.map(p=>p.id));for(const id of state.lineup)if(!shown.has(id)&&matchdayCardInfo(id).sentOff)players.push({...state.players[id]});
 return selection+'<div class="matchday-tired-list">'+players.map(p=>{const card=matchdayCardInfo(p.id),metrics=matchdayPlayerMetrics(p);return '<button type="button" data-matchday-player="'+matchdayText(p.id)+'" aria-pressed="'+(p.id===d.selected?.id)+'" aria-label="'+matchdayText(p.name)+', 종합 '+metrics.overall+', 체력 '+Math.round(p.energy)+', 컨디션 '+matchdayText(metrics.condition.label)+' · '+(d.liveMode==='prep'?'선발 변경':'교체 대상으로 선택')+(card.label?' · '+card.label:'')+'" '+(card.sentOff?'disabled title="퇴장한 선수는 교체할 수 없습니다"':'')+'>'+Portraits.html(p)+'<span><strong>'+matchdayText(p.name)+'</strong><small>'+matchdayText(p.pos)+' · 종합 '+metrics.overall+'</small><small class="matchday-form form-'+metrics.condition.tier+'">체력 '+Math.round(p.energy)+' · '+matchdayText(metrics.condition.label)+'</small>'+card.markup+'</span></button>';}).join('')+'</div><small class="matchday-candidate-note">'+('종합·컨디션은 게임 내 계산 · 선발을 선택한 뒤 후보를 누르면 '+(d.liveMode==='prep'?'선발이 변경됩니다':'교체됩니다'))+'</small>';
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
 const shown=typeof visibleMatchForReports==='function'?visibleMatchForReports():state,d=Matchday.read({...season,match:shown},selected);host.hidden=!d.valid;if(!d.valid){const board=document.getElementById('tactics-board');if(board)board.hidden=true;return;}
 renderLiveMatchStats(d);
 if(typeof Opposition!=='undefined'&&typeof opponentMatchContext!=='undefined'&&opponentMatchContext!==state.seed){opponentMatchContext=state.seed;if(d.liveMode==='prep')matchdayTab='opponent';}
 if(d.liveMode==='live'||d.liveMode==='full')matchdayTab='live';
 const stats=d.stats.map(s=>'<div class="matchday-stat"><span>'+s.label+'</span><strong>'+s.own+' <i>:</i> '+s.opponent+'</strong><small>우리 : 상대</small></div>').join('');
 const facts=typeof matchPopupActive!=='undefined'&&matchPopupActive==='stats'?'<table class="stats-table" aria-label="현재 경기 상세 통계"><thead><tr><th scope="col">경기 기록</th><th scope="col">우리</th><th scope="col">상대</th></tr></thead><tbody>'+(typeof visibleMatchFacts==='function'?visibleMatchFacts(shown):Matchday.facts(shown)).map(row=>'<tr><td>'+matchdayText(row.label)+'</td><td>'+matchdayText(row.own)+'</td><td>'+matchdayText(row.opponent)+'</td></tr>').join('')+'</tbody></table><p class="stats-caption">'+(shown.continuousSetup?'점유율과 패스·선방은 실제 경기 계산 기록입니다. xG는 위치·각도·압박을 반영한 게임 지표입니다.':'점유율은 구간별 중원 전력을 바탕으로 추정한 값입니다. xG는 실제 슈팅 확률의 합계입니다. —는 이전 경기 엔진에서 기록하지 않은 항목입니다.')+'</p>':'';
 const performance=typeof MatchPerformance!=='undefined'&&typeof matchPopupActive!=='undefined'&&matchPopupActive==='stats'?MatchPerformance.fromMatch(shown):null;
 const ratings=performance?.valid&&performance.rows.length?'<section class="match-performance" aria-label="실시간 선수 평점"><div class="match-performance-heading"><h3>실시간 선수 평점</h3><span>기록 기반</span></div><table class="stats-table"><thead><tr><th scope="col">선수</th><th scope="col">평점</th><th scope="col">기록</th></tr></thead><tbody>'+performance.rows.map(row=>'<tr'+(performance.best.some(best=>best.id===row.id)?' class="match-rating-best"':'')+'><td>'+matchdayText(row.name)+' <small>'+matchdayText(row.pos)+' · '+row.minutes+'분</small></td><td><b>'+row.rating.toFixed(1)+'</b></td><td>'+matchdayText(row.highlights.join(' · ')||'출전')+'</td></tr>').join('')+'</tbody></table><p class="stats-caption">'+matchdayText(performance.formula)+'</p></section>':'';
 const challenge=typeof matchPopupActive!=='undefined'&&matchPopupActive==='stats'&&typeof MatchdayObjectives!=='undefined'&&typeof matchdayChallengeMarkup==='function'?matchdayChallengeMarkup(MatchdayObjectives.current({...season,match:shown})):'';
 const windowNote=d.substitution.windows?' · 기회 '+d.substitution.windows.remaining+'/'+d.substitution.windows.limit:'';
 const summary='<div class="matchday-summary-grid">'+stats+'<button type="button" class="matchday-stat matchday-fatigue '+(d.lowestEnergy[0].energy<50?'critical':'')+'" data-matchday-player="'+matchdayText(d.lowestEnergy[0].id)+'" aria-label="'+matchdayText(d.lowestEnergy[0].name)+' 체력 '+Math.round(d.lowestEnergy[0].energy)+', 평균 '+Math.round(d.averageEnergy)+'. 교체 준비"><span>선발 평균 체력</span><strong>'+Math.round(d.averageEnergy)+'</strong><small class="fatigue-low">최저 '+matchdayText(d.lowestEnergy[0].name.split(' ').at(-1))+' '+Math.round(d.lowestEnergy[0].energy)+'</small></button><div class="matchday-stat"><span>'+(d.liveMode==='prep'?'교체 가능 횟수':'남은 교체')+'</span><strong>'+d.substitution.remaining+' <small>/ '+d.substitution.limit+'</small></strong><small>'+matchdayText(d.tacticLabel)+windowNote+'</small></div></div>'+facts+challenge+ratings+matchdayMomentumMarkup(d.momentum,d.insight);
 if(host.dataset.markup!==summary){const open=host.querySelector('.match-momentum')?.open;host.innerHTML=summary;host.dataset.markup=summary;if(open)host.querySelector('.match-momentum').open=true;}
 const analysis=matchdayTab==='analysis';
 document.getElementById('matchday-live').hidden=matchdayTab!=='live';
 const opponentHost=document.getElementById('opposition-report');if(opponentHost)opponentHost.hidden=matchdayTab!=='opponent';
 document.getElementById('tactics-board').hidden=!analysis;
 for(const id of ['live','opponent','analysis']){const button=document.getElementById('matchday-tab-'+id),active=matchdayTab===id;if(!button)continue;button.setAttribute('aria-selected',String(active));button.tabIndex=active?0:-1;button.disabled=id==='analysis'&&d.liveMode==='full';}
 const selection=document.getElementById('matchday-selection');
 if(typeof matchPopupActive==='undefined'||matchPopupActive==='roster'){
 const html=matchdaySelectionMarkup(d);
 if(selection.dataset.markup!==html){
  const focused=selection.contains(document.activeElement)?document.activeElement:null;
  const key=focused?.dataset.matchdayPlayer,action=focused?.dataset.matchday;
  const identity=focused?.dataset.playerDetail;
  selection.innerHTML=html;selection.dataset.markup=html;
  const selector=key?'[data-matchday-player="'+key+'"]':action?'[data-matchday="'+action+'"]':identity?'[data-player-detail="'+identity+'"]':null;
  if(focused){const next=(selector&&selection.querySelector(selector))||document.getElementById('matchday-selected-name')||selection.querySelector('[data-matchday-player]');next?.focus({preventScroll:true});}
 }
 }
 const roster=document.getElementById('matchday-roster');roster.hidden=d.liveMode==='full';
 const note=document.getElementById('selection-hint');note.hidden=!!d.selected||d.liveMode==='full';
 if(!d.selected&&d.liveMode!=='full')note.textContent='선발을 선택하면 같은 포지션의 후보만 표시합니다.';
 document.getElementById('bench-heading').textContent=d.selected?d.selected.role+(d.liveMode==='prep'?' 선발 변경 후보':' 교체 후보'):d.liveMode==='prep'?'출전 가능한 후보':'교체 명단';
 if(typeof playbackPrefs!=='undefined')document.getElementById('pause').value=playbackPrefs.speed;
 if(typeof renderOpponentReport==='function')renderOpponentReport();
 const cards=document.getElementById('card-counter');if(cards&&typeof Discipline!=='undefined'){cards.hidden=!state.discipline;const own=Discipline.count(state),opp=Discipline.count(state,1);cards.textContent='🟨 '+own.yellow+':'+opp.yellow+' · 🟥 '+own.red+':'+opp.red;}
}

function renderLiveMatchStats(data){
 const host=document.getElementById('match-live-stats');if(!host||!state||view!=='match')return;
 const shown=typeof visibleMatchForReports==='function'?visibleMatchForReports():state,prep=shown.phase==='prep',facts=Matchday.facts(shown),get=(key,alias)=>facts.find(r=>r.key===key||r.key===alias),empty={own:'—',opponent:'—'},possession=prep?empty:get('possession')||empty;
 const passes=get('passes'),completed=get('completed'),accuracy=prep||!passes||!completed?empty:{own:passes.own?Math.round(completed.own/passes.own*100)+'%':'—',opponent:passes.opponent?Math.round(completed.opponent/passes.opponent*100)+'%':'—'};
 const rows=[['xg','기대 득점 (xG)',get('xg')],['shots','전체 슈팅',{own:shown.shots[0],opponent:shown.shots[1]}],['onTarget','유효 슈팅',get('onTarget')],['passes','패스',passes],['accuracy','패스 성공률',accuracy],['corners','코너킥',get('corners','corner')],['fouls','반칙',get('fouls')],['tackles','성공 태클',get('tackles')],['saves','선방',get('saves')],['offsides','오프사이드',get('offsides')],['yellow','경고',get('yellow')],['red','퇴장',get('red')]];
 const percent=prep?50:Number.parseInt(possession.own)||0;
 const markup='<header class="live-stats-heading"><b>경기 통계</b><span>'+ (prep?'킥오프 전 · 기록 대기':'우리 팀 : 상대 팀')+'</span></header><section class="live-possession" aria-label="점유율 · 우리 '+possession.own+' 상대 '+possession.opponent+'"><div><b>'+possession.own+'</b><span>공 점유율'+(!prep&&!shown.continuousSetup?' · 추정':'')+'</span><b>'+possession.opponent+'</b></div><i class="possession-bar" data-empty="'+prep+'" aria-hidden="true"><em style="width:'+percent+'%"></em></i></section><div class="live-stats-comparison">'+rows.map(([key,label,value])=>{const r=prep?empty:value||empty,own=Number.parseFloat(r.own),opp=Number.parseFloat(r.opponent),valid=Number.isFinite(own)&&Number.isFinite(opp);return '<div class="live-stat-row" data-stat="'+key+'"><b class="'+(valid&&own>opp?'stat-own-lead':'')+'">'+matchdayText(r.own)+'</b><span>'+label+'</span><b class="'+(valid&&opp>own?'stat-opponent-lead':'')+'">'+matchdayText(r.opponent)+'</b></div>';}).join('')+'</div><footer class="live-stats-footer">선발 체력 '+Math.round(data.averageEnergy)+' · 남은 교체 '+data.substitution.remaining+'/'+data.substitution.limit+'<span>xG · 게임 내 기회 품질 지표</span></footer>';
 if(host.dataset.markup!==markup){host.innerHTML=markup;host.dataset.markup=markup;}
}
function setMatchdayTab(tab){
 if(!['live','opponent','analysis'].includes(tab)||!state||tab==='analysis'&&state.phase==='full')return;
 if(typeof openMatchPopup==='function'){if(tab==='live')closeMatchPopup();else openMatchPopup(tab);return;}
 if(tab==='opponent')pauseForPlanning();
 if(tab==='analysis'){pauseForPlanning();tacticsBoardOpen=true;const details=document.getElementById('tactics-board')?.querySelector('details');if(details)details.open=true;}
 matchdayTab=tab;save();render();
 document.getElementById('matchday-tab-'+tab)?.focus({preventScroll:true});
}
function focusMatchdaySelection(playerId=null){
 if(typeof openMatchPopup==='function'){openMatchPopup('roster',document.activeElement,{playerId});return;}
 const host=document.getElementById('matchday-selection');if(!host||view!=='match')return;
 host.scrollIntoView({block:'center',behavior:'instant'});
 (document.getElementById('matchday-selected-name')||host.querySelector('[data-matchday-player]'))?.focus({preventScroll:true});
}
function selectMatchdayPlayer(id){
 if(!state||!editable()||!Matchday.read(season,id).selected)return;
 pauseForPlanning();collapseTacticsBoard();matchdayTab='live';selected=id;save();render();
 if(typeof openMatchPopup==='function'||innerWidth<730)focusMatchdaySelection(id);
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
