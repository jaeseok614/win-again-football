// Goal scenes are a viewer hold, never a mutation of match time, RNG or tactics.
var goalSceneHold=false,goalSceneClock=null,goalSceneAge=0,goalSceneRAF=null,goalSceneMatch=null,goalScenePreview=false;
const goalScene=document.createElement('section');goalScene.id='goal-scene';goalScene.hidden=true;goalScene.setAttribute('aria-label','득점 장면');$('pitch').append(goalScene);
function closeGoalScene(){const focused=goalScene.contains(document.activeElement);goalSceneHold=false;goalScene.hidden=true;goalSceneClock=null;if(goalSceneRAF!==null)cancelAnimationFrame(goalSceneRAF);goalSceneRAF=null;if(focused)$('primary')?.focus({preventScroll:true});}
function tickGoalScene(now){
 goalSceneRAF=null;if(!goalSceneHold)return;if(view!=='match'||document.hidden||state!==goalSceneMatch||document.querySelector('dialog[open]'))return closeGoalScene();
 const dt=goalSceneClock===null?0:Math.min(80,Math.max(0,now-goalSceneClock));goalSceneClock=now;
 if(goalScenePreview||!state.paused||!F.running(state))goalSceneAge+=dt;
 if(goalSceneAge>=4400)return closeGoalScene();goalSceneRAF=requestAnimationFrame(tickGoalScene);
}
function showGoalScene(moment){
 if(!motionEnabled()||view!=='match'||document.hidden||document.querySelector('dialog[open]'))return;
 const event=[...state.logs].reverse().find(e=>e.type==='goal'&&e.minute===moment.minute&&e.team===(moment.kind==='goal'?0:1)),story=moment.kind==='preview'?{team:0,title:'골! 함께 뛰어오릅니다',score:null,route:'세리머니 미리보기',crowd:'득점의 기쁨을 동료와 팬들과 함께!'}:MatchAtmosphere.goal(state,event);
 if(!story)return;closeGoalScene();goalSceneMatch=state;goalScenePreview=moment.kind==='preview';goalSceneHold=true;goalSceneAge=0;goalSceneClock=null;
 const player=story.team===0?(state.players[event?.scorerId]||state.lineup.map(id=>state.players[id]).find(p=>p.name===moment.player)):currentVisualOpponentRoster().find(p=>p.name===moment.player);
 const portrait=player?Portraits.html(player,{size:'large'}):'',own=story.team===0;goalScene.dataset.team=String(story.team);goalScene.dataset.story=story.kind||'preview';
 goalScene.innerHTML='<div class="goal-scene-art" aria-hidden="true"></div><div class="goal-scene-copy"><small>'+escapeText(moment.label)+' · '+(own?'토투넘 득점':'상대 득점')+'</small><h3>'+escapeText(story.title)+'</h3><div class="goal-scene-scorer">'+portrait+'<div><strong>'+escapeText(moment.player)+'</strong><span>'+escapeText(story.route)+'</span></div>'+(story.score?'<b class="goal-scene-score">'+story.score.join(' : ')+'</b>':'')+'</div><p>'+escapeText(story.crowd)+'</p></div><div class="goal-scene-actions"><button type="button" data-goal-close>경기 보기</button>'+(moment.kind!=='preview'&&state===season.match&&typeof openMatchReplay==='function'?'<button type="button" data-goal-replay>득점 다시 보기</button>':'')+'</div>';
 goalScene.hidden=false;goalScene.querySelector('[data-goal-close]').onclick=closeGoalScene;const replay=goalScene.querySelector('[data-goal-replay]');if(replay)replay.onclick=()=>{closeGoalScene();openMatchReplay($('primary'));save();render();};
 goalSceneRAF=requestAnimationFrame(tickGoalScene);
}
goalScene.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();closeGoalScene();}});
const atmospherePresent=presentMoment;presentMoment=function(moment){atmospherePresent(moment);if(['goal','concede','preview'].includes(moment.kind))showGoalScene(moment);};
const atmospherePreview=previewMatchMoment;previewMatchMoment=function(){closeMatchPopup();atmospherePreview();};
const atmosphereClear=clearMatchFeedback;clearMatchFeedback=function(options){closeGoalScene();atmosphereClear(options);};
const atmospherePending=movementHighlightPending;movementHighlightPending=function(){return goalSceneHold||atmospherePending();};
const atmosphereFrame=motionFrame;motionFrame=function(now){const frame=atmosphereFrame(now);if(frame&&view==='match'&&!document.hidden){let caption=$('crowd-caption');if(!caption){caption=document.createElement('small');caption.id='crowd-caption';$('commentary').append(caption);}const text=MatchAtmosphere.crowd(frame,state.minute);if(caption.textContent!==text)caption.textContent=text;}return frame;};
document.addEventListener('visibilitychange',()=>{if(document.hidden)closeGoalScene();});
