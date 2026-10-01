let playerDetailIdentity=null,playerDetailOpener=null,playerDetailStamp='';
const detailRoles={GK:'골키퍼',DEF:'수비수',MID:'미드필더',FW:'공격수'};
const detailNumber=value=>Number(value.toFixed(2)).toLocaleString('ko-KR');
function playerDetailMarkup(d){
 const p=d.owned?Object.values(season.squad).find(person=>person.identity===d.identity):F.identityProfile(d.identity);
 const r=d.records,g=d.development?.growth,experience=d.development?.experience;
 const ids=Object.values(season.squad).map(person=>person.identity),index=ids.indexOf(d.identity);
 const recordValues=[['출전',r.apps,'경기'],['선발',r.starts,'경기'],['득점',r.goals,'골'],['도움',r.assists,'개'],['출전 시간',r.minutes,'분'],['무실점',d.pos==='GK'?r.cleanSheets:'—',d.pos==='GK'?'경기':'골키퍼 기록']];
 const growthText=!d.owned?'영입 후 훈련과 출전으로 성장합니다.':g.capped?'주요 능력은 성장 한계에 도달했어요. 속도와 지구력도 살펴보세요.':'확정 출전 '+experience.nextPrimaryGrowthMinutes+'분을 더하면 '+d.primaryLabel+' +1';
 return `<div class="player-detail-content">
  <div class="detail-topline"><span class="eyebrow">${d.owned?'OUR PLAYER':'SCOUT FILE'} / ${season.year} SEASON</span><button id="player-detail-close" class="detail-close" aria-label="선수 상세 닫기">닫기 <span aria-hidden="true">×</span></button></div>
  <div class="detail-hero">${Portraits.html(p,{size:'large'})}<div><span class="detail-nickname">${playerUiText(d.nickname)}</span><h2 id="player-detail-name">${playerUiText(d.name)}</h2><p>${playerUiText(detailRoles[d.pos])} · ${d.age}세${d.no!==null?' · #'+d.no:''}<span>${d.owned?(d.condition.starting?'현재 선발 명단':'우리 구단 등록 선수'):(d.source==='academy'?'발견한 유소년':'영입 시장 후보')} · 주급 ${moneyLabel(d.wage)}</span></p></div></div>
  <p id="player-detail-description" class="detail-intro">${playerUiText(d.tagline)}</p>
  <blockquote class="detail-quote">${playerUiText(PlayerCharacter.info(p).quote)}</blockquote>
  <div class="detail-summary"><div><span>${d.primaryLabel} · 현재 능력</span><strong>${d.current.primary}<small> / ${d.current.potential}</small></strong></div><div><span>남은 성장 여유</span><strong>${d.current.growthHeadroom}<small> 포인트</small></strong></div><div><span>현재 체력</span><strong class="${d.condition.status==='caution'?'detail-warning':''}">${d.current.energy===null?'—':detailNumber(d.current.energy)}<small>${d.current.energy===null?' 영입 전':' / 100'}</small></strong></div></div>
  <p class="detail-condition ${d.condition.status==='injured'?'detail-warning':''}">${playerUiText(d.condition.label)}${d.injury?' · '+playerUiText(H.kindLabel(d.injury.kind)):''}</p>
  <div class="detail-columns"><section class="detail-skills" aria-label="선수 능력"><h3>이 선수의 무기</h3>${d.stats.map(stat=>'<div class="detail-stat '+(stat.primary?'detail-primary-stat':'')+'"><span>'+stat.label+'</span><div class="detail-stat-track" aria-hidden="true"><i style="width:'+(stat.value===null?0:Math.max(0,Math.min(100,stat.value)))+'%"></i></div><b>'+ (stat.value===null?'—':stat.value)+'</b></div>').join('')}<p>강조한 능력이 포지션의 주요 능력입니다.<br>성장 한계는 주요 능력에 적용합니다.</p></section>
  <section class="detail-records" aria-label="우리 구단의 확정된 현재 시즌 기록"><h3>${r.year}시즌 우리 구단 기록 <small>리그 + 컵</small></h3><div class="detail-record-grid">${recordValues.map(([label,value,unit])=>'<div><span>'+label+'</span><strong>'+ (typeof value==='number'?value.toLocaleString('ko-KR'):value)+'</strong><small>'+unit+'</small></div>').join('')}</div><p>${r.partial?'업데이트 이후 확정한 경기부터 집계합니다.':'우리 구단에서 확정한 경기만 집계합니다.'}<br>진행 중인 경기와 승부차기 득점은 제외합니다.</p></section></div>
  <div class="detail-growth"><div><span class="eyebrow">NEXT CHAPTER</span><h3>${growthText}</h3><p>${d.owned?'누적 성장 경험 '+d.current.xp.toLocaleString('ko-KR')+'분 · '+(d.development.recommendation.available?'코치 추천: '+playerUiText(d.development.recommendation.label):playerUiText(d.development.recommendation.reason)):'현재 전력 '+d.current.primary+' · 주요 능력 성장 한계 '+d.current.potential+' · 성장 여유 '+d.current.growthHeadroom}</p></div><button id="player-detail-route" class="primary">${d.owned?'개인 훈련 보기 →':d.source==='academy'?'유소년 센터로 →':'영입 화면으로 →'}</button><small>${d.owned?'프로그램과 효과를 확인한 뒤 훈련을 실행하세요.':'계약 비용과 보낼 선수를 확인한 뒤 결정하세요.'}</small></div>
  ${d.owned?'<div class="detail-navigation" aria-label="우리 선수 둘러보기"><button id="player-detail-prev" aria-label="이전 선수">← 이전 선수</button><span>'+(index+1)+' / '+ids.length+'</span><button id="player-detail-next" aria-label="다음 선수">다음 선수 →</button></div>':''}
 </div>`;
}
function renderPlayerDetails(d){
 const dialog=$('player-detail-dialog'),focusId=dialog.contains(document.activeElement)?document.activeElement.id:null,scroll=dialog.scrollTop;
 dialog.innerHTML=playerDetailMarkup(d);playerDetailStamp=JSON.stringify(d);dialog.scrollTop=scroll;
 $('player-detail-close').onclick=()=>closePlayerDetails();
 $('player-detail-route').onclick=routePlayerDetails;
 for(const [id,step] of [['player-detail-prev',-1],['player-detail-next',1]]){const button=$(id);if(button)button.onclick=()=>{
  const ids=Object.values(season.squad).map(p=>p.identity),index=ids.indexOf(playerDetailIdentity);if(index<0)return closePlayerDetails();
  openPlayerDetails(ids[(index+step+ids.length)%ids.length]);dialog.scrollTop=0;$('player-detail-close').focus({preventScroll:true});
 };}
 if(focusId)$(focusId)?.focus({preventScroll:true});
}
function openPlayerDetails(identity,opener){
 const d=PlayerDetails.read(season,identity);if(!d.valid)return;
 const dialog=$('player-detail-dialog'),alreadyOpen=dialog.open;if(!alreadyOpen)playerDetailOpener=opener||document.activeElement;
 playerDetailIdentity=identity;renderPlayerDetails(d);
 if(!alreadyOpen){dialog.scrollTop=0;dialog.showModal();document.documentElement.classList.add('player-detail-open');$('player-detail-close').focus({preventScroll:true});}
}
function closePlayerDetails({restore=true}={}){
 const dialog=$('player-detail-dialog'),identity=playerDetailIdentity,opener=playerDetailOpener;
 playerDetailIdentity=null;playerDetailOpener=null;playerDetailStamp='';if(dialog.open)dialog.close();document.documentElement.classList.remove('player-detail-open');
 if(restore){const visible=element=>element?.isConnected&&element.getClientRects().length;
  const replacement=[...document.querySelectorAll('[data-player-detail]')].find(b=>b.dataset.playerDetail===identity&&visible(b));
  const target=visible(opener)?opener:replacement||document.querySelector('[data-view][aria-current="page"]');target?.focus({preventScroll:true});
 }
}
function routePlayerDetails(){
 const d=PlayerDetails.read(season,playerDetailIdentity);if(!d.valid)return closePlayerDetails();
 if(d.owned){const p=Object.values(season.squad).find(person=>person.identity===d.identity);if(!p)return closePlayerDetails();
  individualTrainingSlot=p.id;individualTrainingNote='';if(d.development.recommendation.available)individualTrainingFocus=d.development.recommendation.focus;
  squadTab='training';closePlayerDetails({restore:false});setView('squad');$('individual-training-player')?.focus({preventScroll:true});
 }else{const target=d.source==='academy'?'academy':'market';closePlayerDetails({restore:false});setView(target);
  const button=[...document.querySelectorAll('[data-player-detail]')].find(b=>b.dataset.playerDetail===d.identity&&b.getClientRects().length);button?.focus({preventScroll:true});button?.scrollIntoView({block:'center',behavior:'instant'});
 }
}
function refreshPlayerDetails(){
 const dialog=$('player-detail-dialog');if(!dialog?.open||!playerDetailIdentity)return;
 const d=PlayerDetails.read(season,playerDetailIdentity);if(!d.valid)return closePlayerDetails();if(JSON.stringify(d)!==playerDetailStamp)renderPlayerDetails(d);
}
document.addEventListener('click',event=>{const button=event.target.closest('[data-player-detail]');if(button)openPlayerDetails(button.dataset.playerDetail,button);});
document.getElementById('player-detail-dialog').addEventListener('cancel',event=>{event.preventDefault();closePlayerDetails();});
document.getElementById('player-detail-dialog').addEventListener('click',event=>{if(event.target!==event.currentTarget)return;const r=event.currentTarget.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)closePlayerDetails();});
document.getElementById('player-detail-dialog').addEventListener('close',()=>{if(!document.getElementById('player-detail-dialog').open)document.documentElement.classList.remove('player-detail-open');});
