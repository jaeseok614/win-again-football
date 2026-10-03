function renderDevelopment(p){
 const d=PlayerDevelopment.analyze(season,p.id);if(!d.valid)return '';
 const escape=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
 const x=d.experience,g=d.growth,r=d.recommendation,q=r.preview;
 const number=value=>Number(value.toFixed(2)).toLocaleString('ko-KR');
 const next=g.capped?'주요 능력 성장 한계 도달':'출전 '+x.nextPrimaryGrowthMinutes+'분 더하면 '+g.label+' +1';
 const effect=q?q.keyLabel+' '+number(q.before)+' → '+number(q.after)+' (+'+number(q.gain)+')':'';
 const energy=q&&q.focus!=='recovery'?'체력 '+number(q.energyBefore)+' → '+number(q.energyAfter)+' (−'+q.cost+')':'';
 return `<section class="development-card" aria-label="${escape(d.name)} 성장 목표와 훈련 추천">
  <div class="development-heading"><div><span class="eyebrow">성장 기록</span><h3>다음 성장 목표</h3></div><span class="development-current">${g.label} ${g.current} / ${g.cap}</span></div>
  <div class="development-progress"><strong>${next}</strong><div class="development-xp-track" role="progressbar" aria-label="다음 270분 경험까지 확정된 출전" aria-valuemin="0" aria-valuemax="270" aria-valuenow="${x.xpInStep}"><i style="width:${x.xpInStep/270*100}%"></i></div><p>이번 경험 구간 ${x.xpInStep} / 270분 · 완료한 270분 경험 ${x.completedSteps}회</p><small>확정된 총 출전 경험 ${x.confirmedMinutes}분. 진행 중인 경기의 출전 시간은 결과 확정 뒤 반영됩니다.</small></div>
  <div class="development-targets"><span>주요 능력 성장 여유 <b>${g.remaining}</b></span><span>개인 기술 훈련만으로 <b>${g.individualTechniqueSessions}회</b></span><small>기술 +2 기준의 단순 계산입니다. 전체 훈련·경기 출전 성장에 따라 횟수가 달라집니다.</small></div>
  <div class="development-recommendation"><div><span class="eyebrow">코치 추천</span><h4>${escape(r.label)}</h4><p>${escape(r.reason)}</p></div>${q?'<div class="development-recommend-preview"><strong>'+escape(effect)+'</strong>'+(energy?'<span>'+escape(energy)+'</span>':'')+'</div>':''}${r.available?'<button type="button" class="secondary" data-development-focus="'+r.focus+'" data-development-slot="'+escape(d.slot)+'" data-development-identity="'+escape(d.identity)+'">추천 프로그램 선택</button><small class="development-selection-note">프로그램을 선택한 뒤 집중 훈련 버튼으로 실행하세요.</small>':'<span class="development-unavailable">'+escape(r.label)+'</span>'}</div>
 </section>`;
}
