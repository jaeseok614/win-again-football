var mediaPrefs={effects:true,haptics:false},matchFeedback=null,momentTimer=0,impactTimer=0,lastMoment=null;
function motionEnabled(){return mediaPrefs.effects&&!matchMedia('(prefers-reduced-motion: reduce)').matches;}
function matchMomentFor(events,match,fast=false){
 const event=[...events].reverse().find(e=>e.type==='goal')||[...events].reverse().find(e=>e.type==='shot'&&e.team===1)||[...events].reverse().find(e=>e.type==='sub');if(!event)return null;
 const kind=event.type==='goal'?(event.team===0?'goal':'concede'):event.type==='shot'?'save':'sub';
 const keeper=match.lineup.map(id=>match.players[id]).find(p=>p.pos==='GK'),scorer=match.players[event.scorerId]||(event.scorerIdentity?F.identityProfile(event.scorerIdentity):null);
 const player=kind==='goal'?scorer?.name||S.club(S.own).name:kind==='save'?keeper?.name||S.club(S.own).short+' 골키퍼':kind==='concede'?S.opponentFor(season).name:F.displayText(event.text,match.players);
 return {kind,minute:event.minute,title:{goal:'GOAL!',concede:'다시 집중!',save:'SUPER SAVE',sub:'새로운 승부수'}[kind],player,detail:S.displayText(F.displayText(event.text,scorer?[scorer]:match.players)),label:(fast?'하이라이트 · ':'')+event.minute+'′'};
}
function clearMatchFeedback(){if(typeof cancelMovementPreview==='function')cancelMovementPreview();clearTimeout(momentTimer);clearTimeout(impactTimer);momentTimer=impactTimer=0;const card=$('match-moment');if(card)card.hidden=true;const pitch=$('pitch');if(pitch)delete pitch.dataset.moment;matchFeedback?.cancel();}
function playMatchFeedback(kind){const result=matchFeedback?.play(kind);renderFeedbackControls();return result;}
function presentMoment(moment){
 if(view!=='match'||document.hidden)return;clearTimeout(momentTimer);clearTimeout(impactTimer);lastMoment={...moment};
 const card=$('match-moment'),pitch=$('pitch');card.dataset.kind=moment.kind;card.innerHTML='<span class="moment-kicker match-moment-minute">'+escapeText(moment.label)+'</span><strong class="moment-title match-moment-title">'+escapeText(moment.title)+'</strong><span class="moment-player match-moment-player">'+escapeText(moment.player)+'</span><span class="moment-detail">'+escapeText(moment.detail)+'</span>'+Array.from({length:6},(_,i)=>'<i aria-hidden="true" class="moment-spark spark-'+(i+1)+'"></i>').join('');card.hidden=false;
 delete pitch.dataset.moment;if(motionEnabled()){void pitch.offsetWidth;pitch.dataset.moment=moment.kind;impactTimer=setTimeout(()=>{delete pitch.dataset.moment;},1000);}
 playMatchFeedback(moment.kind);if(soundOn)tone(moment.kind);momentTimer=setTimeout(()=>{card.hidden=true;},4200);
}
function presentMatchEvents(events,fast=false){
 if(!state)return;const reversed=[...events].reverse(),latest=reversed.find(e=>e.type==='goal')||reversed.find(e=>e.type==='shot'&&e.team===1)||reversed.find(e=>['shot','chance'].includes(e.type));if(latest){lastEvent=latest;lastEventAt=performance.now();}
 const moment=matchMomentFor(events,state,fast);if(moment)presentMoment(moment);else if(events.some(e=>e.type==='start'))playMatchFeedback('kickoff');else if(state.phase==='full')playMatchFeedback('fulltime');
}
function presentSubstitution(change){if(!change||state.phase==='prep')return;presentMoment({kind:'sub',minute:state.minute,title:'새로운 승부수',player:change.in.name,label:state.minute+'′ · 선수 교체',detail:change.out.name+' OUT · '+change.in.name+' IN'});}
function previewMatchMoment(){if(!state)return;const star=state.players.f2||state.lineup.map(id=>state.players[id]).find(p=>p.pos==='FW');presentMoment({kind:'preview',minute:null,title:'GOAL!',player:star?.name||S.club(S.own).name,label:'연출 미리보기',detail:'경기 기록은 바뀌지 않아요.'});if(innerWidth<730)$('pitch').scrollIntoView({behavior:'instant',block:'center'});}
function renderFeedbackControls(){
 const host=$('experience-controls');if(!host||!matchFeedback)return;document.querySelector('.app').classList.toggle('matchday-effects-off',!mediaPrefs.effects);
 const device=matchFeedback.snapshot(),reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 const note=!device.supported?'이 브라우저는 진동을 지원하지 않아요.':device.blocked||device.lastStatus==='error'?'브라우저가 진동 요청을 실행하지 못했어요.':mediaPrefs.haptics?'진동 요청 켜짐 · 실제 진동은 기기 설정에 따라 달라요.':'진동은 지원 기기에서 켤 수 있어요.';
 const html='<div class="experience-controls"><div class="experience-status"><span class="eyebrow">경기 연출</span><span>'+escapeText(reduced?'기기의 움직임 줄이기 설정 적용 · '+note:note)+'</span></div><div class="experience-buttons"><button data-experience="effects" aria-pressed="'+mediaPrefs.effects+'">연출 '+(mediaPrefs.effects?'켜짐':'꺼짐')+'</button><button data-experience="haptics" aria-pressed="'+mediaPrefs.haptics+'" '+(!device.supported?'disabled':'')+'>'+(device.supported?(mediaPrefs.haptics?'진동 끄기':'진동 켜기'):'진동 미지원')+'</button><button data-experience="preview">연출 미리보기</button></div></div>';
 if(host.dataset.feedbackMarkup!==html){host.innerHTML=html;host.dataset.feedbackMarkup=html;}
}
function initMatchFeedback(){
 matchFeedback=Feedback.create({vibrate:typeof navigator.vibrate==='function'?pattern=>navigator.vibrate(pattern):null,visible:()=>!document.hidden,active:()=>view==='match'&&navigator.userActivation?.hasBeenActive!==false,now:()=>performance.now(),haptics:mediaPrefs.haptics});
 $('experience-controls').addEventListener('click',e=>{const button=e.target.closest('[data-experience]');if(!button)return;const setting=button.dataset.experience;if(setting==='preview'){previewMatchMoment();return;}if(setting==='effects'){mediaPrefs.effects=!mediaPrefs.effects;clearMatchFeedback();lastEvent=null;document.querySelectorAll('[data-player]').forEach(el=>{el.style.marginLeft='';el.style.marginTop='';});}else if(setting==='haptics'){mediaPrefs.haptics=!mediaPrefs.haptics;matchFeedback.setEnabled(mediaPrefs.haptics);if(mediaPrefs.haptics)playMatchFeedback('preview');}save();renderFeedbackControls();drawField();$('experience-controls').querySelector('[data-experience="'+setting+'"]').focus();});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)clearMatchFeedback();});window.addEventListener('pagehide',clearMatchFeedback);
 matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change',()=>{clearMatchFeedback();document.querySelectorAll('[data-player]').forEach(el=>{el.style.marginLeft='';el.style.marginTop='';});renderFeedbackControls();drawField();});
}
function feedbackSnapshot(){return {preferences:{...mediaPrefs},device:matchFeedback?.snapshot()||null,motion:motionEnabled(),moment:lastMoment?{...lastMoment}:null,visible:!$('match-moment').hidden};}
