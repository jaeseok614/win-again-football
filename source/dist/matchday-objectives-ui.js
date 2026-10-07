function matchdayChallengeMarkup(d){
 if(!d?.valid)return '';
 const labels={waiting:'킥오프 대기',holding:d.pending?'현재 충족':'유지 중',missed:'목표 초과',met:'현재 충족',working:'진행 중'},esc=escapeText;
 return '<details class="live-objectives" aria-label="이번 경기 도전 진행 상황"><summary><span><small>MATCHDAY CHALLENGE</small><b>이번 경기 3칸 도전</b></span><strong>'+d.minute+'′ · '+(d.prep?'경기 준비':d.pending?'결과 확정 대기':'현재 '+d.met+' / 3')+'</strong></summary><ol>'+d.cards.map(card=>'<li class="objective-'+card.status+'"><div><b>'+esc(card.title)+'</b><span>'+labels[card.status]+'</span></div><p>'+esc(card.evidence)+'</p><small>'+esc(card.hint)+'</small></li>').join('')+'</ol><p class="live-objective-note">'+(d.prep?'선택 도전입니다. 경기 중 기록을 여기서 확인할 수 있습니다.':d.pending?'경기는 끝났지만 아직 휘장을 받지 않았습니다. 결과를 확정한 뒤 감독실에 반영합니다.':'실점 목표는 종료 전까지 바뀔 수 있습니다. 휘장은 경기 결과를 확정한 뒤 판정합니다.')+' 선수 능력치와 자금은 바뀌지 않습니다.</p></details>';
}
function renderMatchdayObjectives(){
 if(view!=='club')return;
 const host=$('matchday-objectives');if(!host)return;
 const model=MatchdayObjectives.read(season),esc=escapeText;
 const upcoming=model.upcoming;
 const cards=upcoming?.cards.map((goal,i)=>`<li><span class="objective-index" aria-hidden="true">${i+1}</span><strong>${esc(goal.title)}</strong><small>${esc(goal.hint)}</small></li>`).join('')||'';
 const last=model.last;
 const latest=last?`<div class="objective-last"><span>직전 경기 · ${esc(last.opponent)} ${last.score[0]}:${last.score[1]}</span><strong>${last.perfect?'3칸 완성 · 휘장 획득':last.completed+' / 3 달성'}</strong><ul class="objective-results" aria-label="직전 경기 목표 결과">${last.cards.map(goal=>`<li class="${goal.done?'done':'missed'}"><span aria-hidden="true">${goal.done?'✓':'○'}</span> ${esc(goal.title)} · ${esc(goal.evidence)}</li>`).join('')}</ul></div>`:'';
 host.innerHTML=`<section class="matchday-objectives-card" aria-labelledby="matchday-objectives-title"><div class="objective-heading"><div><span class="eyebrow">MATCHDAY CHALLENGE</span><h2 id="matchday-objectives-title">매치데이 3칸 도전</h2></div><span class="objective-badges">목표 ${model.completedGoals}개 · 완벽 ${model.perfectCount}회 · 연속 ${model.currentStreak}회 · 최고 ${model.bestStreak}회</span></div>${upcoming?`<p class="objective-opponent">${esc(upcoming.opponent)}전 · ${model.pending?'경기 결과 확정 후 판정':'이번 경기 목표'}</p><ol class="objective-goals">${cards}</ol>`:'<p class="objective-opponent">이번 시즌 일정 완료 · 다음 시즌에 새 도전이 열립니다.</p>'}${latest}<p class="objective-explainer">세 목표를 모두 이루면 휘장 1개. 확정된 경기 기록으로만 판정하며 선수 능력치나 자금은 바뀌지 않습니다.</p></section>`;
}
