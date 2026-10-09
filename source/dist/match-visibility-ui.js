function pendingVisibleMatchEvent(){
 if(!state||typeof lastEvent==='undefined'||!lastEvent||!motionEnabled()||typeof lastEventFast!=='undefined'&&lastEventFast||!MatchVisibility.pending(state,lastEvent))return null;
 return movementEvent!==lastEvent||movementEventAge<Movement.impactAge(lastEvent)?lastEvent:null;
}
function visibleMatchForReports(){return MatchVisibility.read(state,pendingVisibleMatchEvent());}
function visibleMatchFacts(match=visibleMatchForReports()){return Matchday.facts(match).map(row=>row.key==='xg'&&match.presentationPending?{...row,own:'장면 재생 중',opponent:'장면 재생 중'}:row);}
function renderVisibleMatchTimeline(){
 const host=$('timeline');if(!host||!state||view!=='match'||matchPopupActive!=='stats')return;
 const html=visibleMatchForReports().logs.filter(l=>l.type!=='break'&&l.type!=='start').slice(-7).reverse().map(l=>'<div class="event '+(l.type==='goal'?'goal':'')+'"><b>'+l.minute+'′</b><span>'+escapeText(matchLogText(l))+'</span></div>').join('');
 if(host.dataset.visibleMarkup!==html){host.innerHTML=html;host.dataset.visibleMarkup=html;}
}
var visibleCompletionStatus=null;
function syncVisibleMatchCompletion(){
 if(!state||view!=='match')return;const waiting=state.phase==='full'&&!!pendingVisibleMatchEvent(),button=$('primary'),results=$('results');
 if(button){button.disabled=waiting;if(waiting)button.textContent='마지막 장면 재생 중';}if(results&&waiting)results.hidden=true;
 const status=$('match-status');if(status&&state.phase==='full'){if(waiting){if(status.textContent!=='마지막 장면 재생 중')visibleCompletionStatus={match:state,text:status.textContent};status.textContent='마지막 장면 재생 중';}else if(visibleCompletionStatus?.match===state){status.textContent=visibleCompletionStatus.text;visibleCompletionStatus=null;}}
}
function refreshVisibleMatchReports(){
 if(view!=='match'||!state)return;
 if(state.phase==='full'&&!pendingVisibleMatchEvent()){renderResults();$('results').hidden=false;}
 renderMatchday();renderMatchPopup();renderVisibleMatchTimeline();syncVisibleMatchCompletion();
}
