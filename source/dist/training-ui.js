let individualTrainingSlot='',individualTrainingFocus='technique',individualTrainingNote='',individualTrainingNoteContext=null;
var trainingCentreFilters={position:'all',query:'',sort:'recommended'};
const trainingDisplayNumber=value=>Number(value.toFixed(2)).toLocaleString('ko-KR');
function trainingPlayerMarkup(p){
 const progress=p.xpInStep/270*100,growth=!p.growthSinceRegistration?'': ' · 처음 등록보다 '+(p.growthSinceRegistration>0?'+':'')+p.growthSinceRegistration;
 const status=p.injured?'부상 휴식':p.energy<70?'회복 필요':p.starting?'현재 선발':'교체 명단';
 const milestone=p.capped?'주요 능력 성장 한계':p.minutesToGrowth+'분 출전하면 '+p.primaryLabel+' +1';
 return '<button type="button" class="training-roster-player" data-training-slot="'+playerUiText(p.slot)+'" data-training-identity="'+playerUiText(p.identity)+'" aria-pressed="'+(p.slot===individualTrainingSlot)+'" aria-label="'+playerUiText(p.name)+' 훈련 선수로 선택"><span class="training-player-top">'+Portraits.html(p)+'<span class="training-player-copy"><strong>'+playerUiText(p.name)+'</strong><small>'+p.pos+' · #'+p.no+' · '+status+'</small></span></span><span class="training-player-metrics"><span>'+p.primaryLabel+' <b>'+p.primary+'</b> / '+p.cap+'</span><span>체력 <b class="'+(p.energy<70?'loss':'')+'">'+Math.round(p.energy)+'</b></span></span><span class="training-player-growth" style="--growth:'+progress+'%" aria-hidden="true"></span><span class="training-player-footnotes"><span>'+milestone+'</span><small>'+playerUiText(p.recommendation.available?p.recommendation.label:status)+(p.capped?'':growth)+'</small></span></button>';
}
function renderTrainingRoster(){
 const list=$('training-roster-list');if(!list)return;
 const d=TrainingCentre.read(season,trainingCentreFilters);trainingCentreFilters={...d.filters};
 const focused=list.contains(document.activeElement)?document.activeElement?.dataset.trainingSlot:null;
 list.innerHTML=d.players.length?d.players.map(trainingPlayerMarkup).join(''):'<p class="training-roster-empty">조건에 맞는 선수가 없습니다. 이름이나 포지션을 바꿔보세요.</p>';
 $('training-roster-count').textContent=d.totalMatched+' / '+d.summary.total+'명 · 주요 능력 / 성장 한계';
 document.querySelectorAll('[data-training-position]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.trainingPosition===d.filters.position)));
 if(focused)list.querySelector('[data-training-slot="'+focused+'"]')?.focus({preventScroll:true});
}
function chooseTrainingPlayer(slot,identity){
 const p=season.squad[slot];if(!p||(identity!==undefined&&p.identity!==identity))return;
 individualTrainingSlot=slot;individualTrainingNote='';save();renderIndividualTraining();
 const heading=$('training-selected-name');if(innerWidth<730)heading?.scrollIntoView({block:'start',behavior:'instant'});heading?.focus({preventScroll:true});
}
function chooseTrainingFocus(focus){
 if(!Object.hasOwn(Training.choices,focus))return;
 individualTrainingFocus=focus;save();renderIndividualTraining();
 document.querySelector('[data-training-focus="'+focus+'"]')?.focus({preventScroll:true});
}
function renderIndividualTraining(){
 const panel=$('individual-training');if(!panel)return;
 if(typeof view!=='undefined'&&view!=='squad')return;
 const all=TrainingCentre.read(season),players=Object.values(season.squad);
 if(!all.valid||!players.length){panel.innerHTML='<p>현재 구단의 선수를 확인하세요.</p>';return;}
 if(!season.squad[individualTrainingSlot])individualTrainingSlot=all.players[0].slot;
 const p=season.squad[individualTrainingSlot],d=PlayerDevelopment.analyze(season,p.id),key=S.primaryKey(p),q=Training.preview(season,p.id,individualTrainingFocus,p.identity),row=all.players.find(person=>person.slot===p.id);
 if(individualTrainingNoteContext&&(individualTrainingNoteContext.year!==season.year||individualTrainingNoteContext.round!==season.round||individualTrainingNoteContext.identity!==p.identity))individualTrainingNote='';
 const number=trainingDisplayNumber,escape=playerUiText;
 const options=players.map(player=>'<option value="'+escape(player.id)+'" '+(p.id===player.id?'selected':'')+'>'+escape(player.name)+' · '+player.pos+(player.injury?' · 부상 휴식':'')+'</option>').join('');
 const programOptions=Object.entries(Training.choices).map(([focus,rule])=>'<option value="'+focus+'" '+(focus===individualTrainingFocus?'selected':'')+'>'+rule.label+'</option>').join('');
 const statCards=[[d.growth.label,p[key],d.growth.cap+'까지 성장'],['속도',p.speed,'최대 99'],['지구력',p.endurance,'최대 99'],['현재 체력',Math.round(d.currentEnergy),p.injury?'부상 휴식':row.starting?'현재 선발':'교체 명단']].map(([label,value,note])=>'<div><span>'+label+'</span><strong>'+value+'</strong><small>'+note+'</small></div>').join('');
 const programs=Object.entries(Training.choices).map(([focus,rule])=>{const preview=d.previews[focus],effect=preview.gain>0?preview.keyLabel+' +'+number(preview.gain):focus==='recovery'?'체력 가득':'성장 한계';return '<button type="button" data-training-focus="'+focus+'" aria-pressed="'+(individualTrainingFocus===focus)+'"><span>'+rule.label+'</span><strong>'+effect+'</strong><small>'+(focus==='recovery'?'회복 · 체력 100까지':'체력 −'+number(preview.cost))+'</small></button>';}).join('');
 const changed=q.gain>0?number(q.before)+' → '+number(q.after):q.focus==='recovery'?'이미 100':'성장 한계 '+q.cap+' 도달';
 const fatigue=q.focus==='recovery'?'': '<p>체력 '+number(q.energyBefore)+' → '+number(q.energyAfter)+' (−'+q.cost+')</p>';
 const weekly=all.context.trained?'완료':all.context.trainingOpen?'선택 가능':'대기';
 const weeklyNote=all.context.trained?'이번 주 훈련을 마쳤습니다. 다음 리그 경기 준비 때 다시 열립니다.':all.context.trainingOpen?'전체 훈련과 개인 훈련 중 이번 주 한 번을 선택하세요.':season.competition==='europe'?'챔피언스리그에서는 훈련을 쉬고 다음 리그 경기 준비 때 다시 열립니다.':'경기 중·컵 경기에는 훈련을 쉬고 다음 리그 경기를 준비합니다.';
 const growth=!row.growthSinceRegistration?'': '처음 등록보다 '+d.growth.label+' '+(row.growthSinceRegistration>0?'+':'')+row.growthSinceRegistration+' · ';
 panel.innerHTML='<section class="training-centre"><header class="training-centre-heading"><div><h2>훈련 센터</h2><p>'+weeklyNote+'</p></div><span class="training-week-badge">'+season.year+'시즌 · '+(season.competition==='europe'?'유럽 경기 · 훈련 대기':'리그 '+Math.min(14,season.round+1)+'R')+'</span></header><div class="training-summary"><div><span>건강한 선수</span><strong>'+all.summary.fit+' / '+all.summary.total+'</strong></div><div><span>주요 능력 성장 여유</span><strong>'+all.summary.growable+'명</strong></div><div><span>체력 70 미만</span><strong>'+all.summary.tired+'명</strong></div><div><span>이번 주 훈련</span><strong>'+weekly+'</strong></div></div><div class="training-centre-layout"><section class="training-roster-panel" aria-label="훈련할 선수 목록"><div class="training-roster-toolbar"><label class="sr-only" for="training-search">선수 검색</label><input id="training-search" type="search" placeholder="선수 이름 검색" value="'+escape(trainingCentreFilters.query)+'" autocomplete="off"><label class="sr-only" for="training-sort">훈련 선수 정렬</label><select id="training-sort">'+[['recommended','코치 추천순'],['potential','성장 여유순'],['minutes','다음 성장 가까운 순']].map(([value,label])=>'<option value="'+value+'" '+(value===trainingCentreFilters.sort?'selected':'')+'>'+label+'</option>').join('')+'</select></div><div class="training-position-filters" role="group" aria-label="훈련 선수 포지션">'+[['all','전체'],['GK','GK'],['DEF','DEF'],['MID','MID'],['FW','FW']].map(([value,label])=>'<button type="button" data-training-position="'+value+'" aria-pressed="'+(value===trainingCentreFilters.position)+'">'+label+'</button>').join('')+'</div><p id="training-roster-count" class="training-roster-count"></p><div id="training-roster-list" class="training-roster-list"></div></section><section class="training-session-panel" aria-label="선택한 선수 훈련"><label for="individual-training-player">집중할 선수</label><select id="individual-training-player">'+options+'</select><div class="training-selected-heading">'+Portraits.html(p,{size:'large'})+'<div><span>'+p.pos+' · #'+p.no+'</span><h3 id="training-selected-name" tabindex="-1">'+escape(p.name)+'</h3><small>'+escape(growth)+p.xp+'분의 확정 출전 경험</small></div><button type="button" class="profile-inline-button" data-player-detail="'+escape(p.identity)+'">상세 ↗</button></div><div class="training-selected-stats">'+statCards+'</div><p class="training-program-label">프로그램 미리보기</p><div class="training-program-grid" role="group" aria-label="훈련 프로그램">'+programs+'</div><div class="individual-training-preview"><span>'+(q.available?'실행 전 미리보기':'훈련 효과 미리보기 · 현재 실행 불가')+'</span><strong>'+q.keyLabel+' '+changed+'</strong>'+fatigue+'<small>'+(q.focus==='technique'?'선수의 성장 한계까지만 올립니다.':q.focus==='recovery'?'부상 기간은 경기 휴식으로 채웁니다.':'최대 99까지 올립니다.')+'</small></div><button id="train-individual" class="'+(q.available?'primary':'secondary')+'" '+(q.available?'':'disabled')+'>훈련 실행 · '+escape(p.name)+'</button><p class="individual-training-reason">'+escape(q.reason||'이 선수 한 명에게 적용합니다. 이번 주 팀 전체 훈련은 사용할 수 없게 됩니다.')+'</p>'+(individualTrainingNote?'<p class="individual-training-note" role="status" tabindex="-1">'+escape(individualTrainingNote)+'</p>':'')+'<button type="button" class="training-next-match secondary" data-training-match '+(!state?'disabled':'')+'>경기 준비로</button><details class="training-program-advanced"><summary>프로그램 목록으로 선택</summary><label class="sr-only" for="individual-training-focus">훈련 프로그램</label><select id="individual-training-focus">'+programOptions+'</select></details><details class="training-growth"><summary>성장 목표와 코치 추천</summary>'+renderDevelopment(p)+'</details><details class="training-character"><summary>선수 특징 · 라커룸</summary>'+renderPlayerCharacter({...p,energy:d.currentEnergy})+'</details></section></div></section>';
 renderTrainingRoster();bindPlayerCharacter({...p,energy:d.currentEnergy});
 $('training-search').oninput=event=>{trainingCentreFilters.query=event.target.value;renderTrainingRoster();};
 $('training-sort').onchange=event=>{trainingCentreFilters.sort=event.target.value;renderTrainingRoster();};
 $('individual-training-player').onchange=event=>chooseTrainingPlayer(event.target.value);
 $('individual-training-focus').onchange=event=>chooseTrainingFocus(event.target.value);
 const expectedIdentity=p.identity,expectedSlot=p.id;
 $('train-individual').onclick=()=>{
  action(()=>{if(individualTrainingSlot!==expectedSlot)throw Error('훈련 선수가 바뀌었습니다. 현재 선수를 다시 선택하세요.');const done=Training.train(season,expectedSlot,individualTrainingFocus,expectedIdentity);individualTrainingNoteContext={year:season.year,round:season.round,identity:done.identity};individualTrainingNote=done.name+' · '+done.keyLabel+' '+number(done.before)+' → '+number(done.after)+' (+'+number(done.gain)+')'+(done.focus==='recovery'?'':' · 체력 '+number(done.energyBefore)+' → '+number(done.energyAfter))+' · 이번 주 훈련 완료';});
  panel.querySelector('.individual-training-note')?.focus({preventScroll:true});
 };
 panel.onclick=event=>{
  const player=event.target.closest('[data-training-slot]'),focus=event.target.closest('[data-training-focus]'),position=event.target.closest('[data-training-position]'),recommend=event.target.closest('[data-development-focus]'),match=event.target.closest('[data-training-match]');
  if(player){chooseTrainingPlayer(player.dataset.trainingSlot,player.dataset.trainingIdentity);return;}
  if(focus){chooseTrainingFocus(focus.dataset.trainingFocus);return;}
  if(position){trainingCentreFilters.position=position.dataset.trainingPosition;renderTrainingRoster();return;}
  if(recommend){const current=season.squad[individualTrainingSlot];if(!current||current.id!==recommend.dataset.developmentSlot||current.identity!==recommend.dataset.developmentIdentity)return;const next=PlayerDevelopment.analyze(season,current.id).recommendation;if(next.available&&next.focus===recommend.dataset.developmentFocus)chooseTrainingFocus(next.focus);return;}
  if(match&&!match.disabled&&state){setView('match');}
 };
}
