// Physical time is separate from display speed. Hidden/paused matches never tick.
var continuousVisualBefore=null,continuousVisualCurrent=null,continuousVisualContact=false;
function continuousVisualFrame(match){if(match!==continuousMatch||continuousVisualCurrent?.tick!==match.continuous.tick||match.paused||!F.running(match)||continuousVisualContact)return F.continuousFrame(match);return ContinuousFootball.interpolate(continuousVisualBefore,continuousVisualCurrent,continuousBudget/100)||F.continuousFrame(match);}
var continuousStamp=0,continuousBudget=0,continuousMatch=null,continuousSavedAt=0,continuousRenderAt=0,continuousRAF=null;
function continuousDisplayRate(match){return MatchFlow.displayRate(match,playbackPrefs);}
function continuousDisplayTick(now){
 continuousRAF=requestAnimationFrame(continuousDisplayTick);
 const match=practiceSession?.match?.continuousSetup?practiceSession.match:state,practice=match===practiceSession?.match;
 const active=appSessionStarted&&match?.continuousSetup&&F.running(match)&&!match.paused&&!document.hidden&&(practice?$('practice-dialog').open:view==='match'&&!goalSceneHold&&!matchCeremonyHold);
 if(!active||continuousMatch!==match){continuousStamp=now;continuousBudget=0;continuousMatch=match;continuousVisualBefore=null;continuousVisualCurrent=null;continuousVisualContact=false;if(!active)return;}
 const delta=Math.min(50,Math.max(0,now-continuousStamp));continuousStamp=now;
 continuousBudget=Math.min(1200,continuousBudget+delta*continuousDisplayRate(match));
 const oldMinute=match.minute,oldPhase=match.phase,events=[],started=performance.now();
 while(continuousBudget>=100&&F.running(match)&&performance.now()-started<6){
  const rate=continuousDisplayRate(match);continuousVisualBefore=F.continuousFrame(match);const rows=F.advanceContinuous(match,1);continuousVisualCurrent=F.continuousFrame(match);continuousVisualContact=rows.some(e=>['goal','shot','card'].includes(e.type));events.push(...rows);continuousBudget-=100;
  if(rate!==continuousDisplayRate(match)){continuousBudget=0;break;}
  if(rows.some(e=>['goal','shot','card','break'].includes(e.type))){continuousBudget=0;break;}
 }
 if(!events.length&&oldMinute===match.minute)return;
 const important=events.some(e=>['attempt','goal','shot','card','break'].includes(e.type));
 if(practice){presentPracticeEvents(events);if(important||now-continuousRenderAt>500){renderPractice();continuousRenderAt=now;}return;}
 presentMatchEvents(events);
 if(important||oldMinute!==match.minute||now-continuousRenderAt>500){render();continuousRenderAt=now;}
 if(now-continuousSavedAt>3000||oldPhase!==match.phase){save();continuousSavedAt=now;}
 // The coach's optional late pause uses the same continuous world on resume.
 if(match.phase==='late'&&!playbackPrefs.coachPause65){F.begin(match);save();render();}
 if(!motionEnabled())drawField();
}
continuousRAF=requestAnimationFrame(continuousDisplayTick);
document.addEventListener('visibilitychange',()=>{continuousStamp=performance.now();continuousBudget=0;});
window.addEventListener('pagehide',()=>{if(continuousRAF!==null)cancelAnimationFrame(continuousRAF);continuousRAF=null;});
window.addEventListener('pageshow',()=>{if(continuousRAF===null){continuousStamp=performance.now();continuousBudget=0;continuousRAF=requestAnimationFrame(continuousDisplayTick);}});
