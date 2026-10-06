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
