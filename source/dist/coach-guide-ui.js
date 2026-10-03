function coachGuideText(value){return String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));}
function coachGuideMarkup(d){
 if(!d?.valid)return '';
 const action=d.action?'<button type="button" class="coach-guide-primary" data-guide-action="'+d.action.id+'">'+coachGuideText(d.action.label)+' <span aria-hidden="true">→</span></button>':'';
 const steps=d.steps.length?'<ol class="coach-guide-steps" aria-label="경기의 세 단계">'+d.steps.map((step,index)=>'<li class="'+step.status+'"'+(step.status==='current'?' aria-current="step"':'')+'><span aria-hidden="true">'+(step.status==='done'?'✓':index+1)+'</span>'+step.label+'</li>').join('')+'</ol>':'';
 const readiness=d.readiness,readinessMarkup=readiness?'<div class="coach-readiness" aria-label="경기 준비 체크"><div class="coach-readiness-heading"><strong>'+coachGuideText(readiness.label)+'</strong><span>'+readiness.score+' / '+readiness.total+' 확인</span></div><ul>'+readiness.checks.map(item=>'<li class="'+(item.ready?'ready':item.optional?'optional':'pending')+'"><span aria-hidden="true">'+(item.ready?'✓':item.optional?'○':'!')+'</span><button type="button" data-guide-action="'+item.action+'" aria-label="'+coachGuideText(item.label)+' · '+coachGuideText(item.detail)+(item.optional?' · 선택 사항':'')+'"><b>'+coachGuideText(item.label)+(item.optional?' <em>선택</em>':'')+'</b><small>'+coachGuideText(item.detail)+'</small></button></li>').join('')+'</ul></div>':'';
 const p=d.focus,person=p&&season.squad[p.slot],growth=p?(p.capped?p.primaryLabel+' 성장 한계 도달':'출전 '+p.minutesToGrowth+'분 더하면 '+p.primaryLabel+' +1'):'';
 const focus=p&&person?'<button type="button" class="coach-focus-player" data-player-detail="'+coachGuideText(p.identity)+'" aria-label="'+coachGuideText(p.name)+' 선수 상세 보기">'+Portraits.html(person,{size:'large'})+'<span class="coach-focus-copy"><span class="coach-focus-kicker">주요 선수 <span aria-hidden="true">↗</span></span><strong>'+coachGuideText(p.name)+'</strong><span class="coach-focus-growth">'+coachGuideText(growth)+'</span><span class="coach-focus-track"'+(!p.capped?' role="progressbar" aria-label="다음 270분 출전 경험까지 확정된 경험" aria-valuemin="0" aria-valuemax="270" aria-valuenow="'+p.xpInStep+'"':'')+'><i style="width:'+(p.capped?100:p.xpInStep/270*100)+'%"></i></span><small>확정 출전 경험 '+p.xp.toLocaleString('ko-KR')+'분'+(!p.capped?' · 이번 구간 '+p.xpInStep+' / 270':' · '+p.primaryLabel+' '+p.primary+' / '+p.cap)+'</small></span></button>':'';
 return '<section class="coach-guide-card" aria-label="'+coachGuideText(d.eyebrow)+'"><div class="coach-guide-main"><div class="coach-guide-topline"><span class="coach-guide-eyebrow">'+coachGuideText(d.eyebrow)+'</span>'+steps+'</div><h2>'+coachGuideText(d.title)+'</h2><p>'+coachGuideText(d.text)+'</p>'+readinessMarkup+'<div class="coach-guide-actions">'+action+'<button type="button" class="coach-guide-practice" data-guide-action="practice">전술 연습 <span aria-hidden="true">↗</span></button></div></div>'+focus+'</section>';
}
function renderCoachGuide(){
 const host=document.getElementById('coach-guide'),dock=document.getElementById('coach-next-action');if(!host)return;
 const d=CoachGuide.read(season),visible=view==='club'&&d.valid;
 host.hidden=!visible;
 if(visible){const html=coachGuideMarkup(d);if(host.dataset.coachMarkup!==html){host.innerHTML=html;host.dataset.coachMarkup=html;}}
 if(dock){const show=typeof appSessionStarted==='undefined'&&visible&&!!state&&d.action?.id==='match';dock.hidden=!show;if(show){const html='<button type="button" data-guide-action="match"><span><small>'+coachGuideText(d.eyebrow)+'</small><strong>'+coachGuideText(d.action.label)+'</strong></span><span aria-hidden="true">→</span></button>';if(dock.dataset.coachMarkup!==html){dock.innerHTML=html;dock.dataset.coachMarkup=html;}}document.body.classList.toggle('coach-dock-active',show);}
}
document.addEventListener('click',event=>{
 const button=event.target.closest('[data-guide-action]');if(!button||!button.closest('#coach-guide,#coach-next-action'))return;
 if(button.dataset.guideAction==='match'){if(state)setView('match');}
 else if(button.dataset.guideAction==='squad'){squadTab='health';setView('squad');}
 else if(button.dataset.guideAction==='training'){squadTab='training';setView('squad');}
 else if(button.dataset.guideAction==='analysis'){if(state){setView('match');if(typeof setMatchdayTab==='function')setMatchdayTab('analysis');}}
 else if(button.dataset.guideAction==='practice'){if(typeof openPractice==='function')openPractice('comeback');}
 else if(button.dataset.guideAction==='season'){const target=document.getElementById('next-season');target?.scrollIntoView({block:'center',behavior:'instant'});target?.focus({preventScroll:true});}
});
