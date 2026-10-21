
// Primary management tasks use real control nodes in a landscape page.
var operationsSection=null,operationsStaffChoice='';
const operationsEntries=[['training-card','팀 훈련'],['individual-training','개인 훈련'],['squad-health','몸 상태'],['staff-panel','코치 계약'],['squad-plans-panel','선발 계획'],['owner-board-panel','구단주·약속'],['finance-detail','재정 장부'],['finance-plan-panel','자금 계획'],['club-overview','구단 현황'],['suspensions-panel','징계 현황']];
function operationsGroup(id){return Object.keys(managementGroups).find(g=>managementGroups[g].some(e=>e[0]===id));}
function closeOperationsPage(){
 operationsSection=null;document.body.classList.remove('operations-page');
 if(managementDialog.dataset.operationsSection){managementDialog.close();restoreManagementPanel();managementActive=null;delete managementDialog.dataset.operationsSection;delete managementDialog.dataset.inlineWorkspace;managementDialog.querySelector('.operations-nav')?.remove();managementDialog.setAttribute('role','dialog');managementDialog.removeAttribute('aria-modal');document.body.append(managementDialog);}
}
function renderOperationsNav(){
 let nav=managementDialog.querySelector('.operations-nav');if(!nav){nav=document.createElement('aside');nav.className='operations-nav';nav.setAttribute('aria-label','훈련과 구단 운영');managementDialog.prepend(nav);}
 nav.innerHTML='<h2>운영 센터</h2><div class="operations-context">'+ClubArt.voice('manager')+'<span>'+season.year+'시즌 · '+season.league.division+'부<br>'+(S.ready(season)?'시즌 종료':season.competition==='cup'?'국내컵 준비':season.competition==='europe'?'유럽 대회 준비':Math.min(season.round+1,S.roundCount(season))+'R · '+(state?.phase==='prep'?'준비':state?.phase==='full'?'결과 대기':'경기 중'))+'</span></div><nav>'+operationsEntries.map(([id,label])=>'<button type="button" data-operations-section="'+id+'" aria-pressed="'+(operationsSection===id)+'">'+label+'</button>').join('')+'</nav><div class="operations-return"><button type="button" data-operations-view="squad">전체 선수단</button><button type="button" data-operations-view="club">홈으로</button></div>';
 nav.onclick=e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.operationsSection)openManagementPanel(b.dataset.operationsSection,b);else if(b.dataset.operationsView){closeOperationsPage();setView(b.dataset.operationsView);}};
}
function operationsPrepareTeam(){
 let host=$('team-training-preview');if(!host&&S.ready(season)){$('training-card').innerHTML='<div class="training-card"><div class="panel-heading"><h2>팀 전체 훈련</h2><span>이번 시즌 훈련 종료</span></div><div class="training-actions"><select id="training-focus" aria-label="시즌 종료 훈련" disabled><option>시즌 종료 · 현재 능력 유지</option></select><button id="train" type="button" disabled>훈련 종료</button></div><div id="team-training-preview"><p class="team-training-reason">시즌을 마쳤습니다. 현재 선수 상태와 이번 시즌 기록을 유지합니다.</p></div><p>다음 시즌은 홈에서 직접 시작하세요. 이 화면은 시즌을 넘기지 않습니다.</p></div>';host=$('team-training-preview');}if(!host)return;
 host.querySelectorAll('.team-training-preview details').forEach(d=>{const list=d.querySelector('ul');if(list)d.before(list);d.remove();});
 if(!host.querySelector('.team-training-preview')&&!host.querySelector('.operations-team-current')){
  const model=TrainingCentre.read(season);const box=document.createElement('section');box.className='operations-team-current';box.innerHTML='<h3>현재 선수단 · '+model.summary.total+'명</h3><ul>'+model.players.map(p=>'<li><strong>'+escapeText(p.name)+'</strong><span>'+p.pos+' · 주요 능력 '+p.primary+' / '+p.cap+'</span><b>체력 '+Math.round(p.energy)+'</b></li>').join('')+'</ul>';host.append(box);
 }
}
function prepareOperationsPage(){
 if(!operationsSection||!managementDialog.open||!managementDialog.dataset.operationsSection)return;
 renderOperationsNav();
 const panel=$(operationsSection);panel.classList.add('operations-panel');
 if(operationsSection==='training-card')operationsPrepareTeam();
 if(operationsSection==='squad-plans-panel')operationsPreparePlans();
 if(operationsSection==='squad-health'){const note=panel.querySelector('.squad-depth>.health-footnote');if(note)note.textContent='현재 포메이션·부상·정지·실시간 체력 기준. 추천은 선수단을 자동 변경하지 않습니다.';const preview=panel.querySelector('.rotation-preview'),apply=$('rotate-squad');if(preview&&rotationPreview?.changes.length&&apply&&!preview.contains(apply)){const actions=document.createElement('div');actions.className='operations-rotation-actions';actions.append(apply,preview.querySelector('[data-rotation-cancel]'));preview.append(actions);}}
 if(operationsSection==='finance-detail'&&!panel.querySelector('.operations-finance-kpis')){const last=matchCashflow(season.finance.ledger.filter(e=>['match','cup','europe'].includes(e.type)).at(-1));panel.querySelector('.finance-detail').insertAdjacentHTML('afterbegin','<dl class="operations-finance-kpis"><div><dt>현재 자금</dt><dd>'+(season.finance.balance<0?'−':'')+moneyLabel(season.finance.balance)+'</dd></div><div><dt>주간 전체 급여</dt><dd>'+moneyLabel(clubWeeklyWages())+'</dd></div><div><dt>최근 경기 순수익</dt><dd>'+(last?signedMoney(last.amount):'첫 경기 대기')+'</dd></div></dl>');}
 if(operationsSection==='owner-board-panel'){const details=panel.querySelector('details');details.open=true;if(!details.querySelector('.operations-owner-meeting')){const box=document.createElement('div');box.className='operations-owner-meeting';[...details.children].filter(e=>e.tagName!=='SUMMARY').forEach(e=>box.append(e));details.append(box);}if(!panel.querySelector('.operations-owner-face')){const h=panel.querySelector('.owner-board-heading');h.insertAdjacentHTML('afterbegin','<div class="operations-owner-face">'+ClubArt.voice('board')+'</div>');}}
 if(operationsSection==='club-overview'){const hero=panel.querySelector('.club-hero'),metrics=panel.querySelector('.season-metrics');if(hero&&!hero.querySelector('.club-growth'))hero.querySelector('.club-identity').insertAdjacentHTML('beforebegin',ClubGrowth.html(season.league.division));if(metrics&&!metrics.querySelector('[data-ops-club-fact]'))metrics.insertAdjacentHTML('beforeend','<div data-ops-club-fact><span>현재 구단 자금</span><strong>'+(season.finance.balance<0?'−':'')+moneyLabel(season.finance.balance)+'</strong></div><div data-ops-club-fact><span>출전 가능한 선수</span><strong>'+Object.values(season.squad).filter(p=>F.isAvailable(state?.players[p.id]||p)).length+' / 18</strong></div>');}
 if(operationsSection==='finance-plan-panel')panel.querySelector('.finance-plan-collapse').open=true;
 if(operationsSection==='suspensions-panel')panel.querySelectorAll('details').forEach(d=>d.open=true);
 ClubArt.fitDrama?.(panel);
}
const operationsOpenOriginal=openManagementPanel;
openManagementPanel=function(id,opener=document.activeElement,options={}){
 if(!operationsEntries.some(e=>e[0]===id)||managerGuideActive||options.modal===true){closeOperationsPage();return operationsOpenOriginal(id,opener,options);}
 closeOperationsPage();operationsSection=id;workspaceRouting=true;renderOperationsNav();
 try{if(squadOverviewDialog.open)squadOverviewDialog.close();operationsOpenOriginal(id,null,{...options,inline:true});managementDialog.dataset.operationsSection=id;}finally{workspaceRouting=false;}
 document.body.classList.add('operations-page','dense-workspace-view');prepareOperationsPage();managementDialog.querySelector('button[data-operations-section="'+id+'"]')?.focus({preventScroll:true});
};
const operationsRenderOriginal=render;render=function(){
 if(operationsSection&&operationsGroup(operationsSection)!==view)closeOperationsPage();
 document.body.classList.toggle('operations-page',Boolean(operationsSection));
 operationsRenderOriginal();
 if(operationsSection&&managementDialog.open){managementDialog.dataset.operationsSection=operationsSection;document.body.classList.add('operations-page','dense-workspace-view');prepareOperationsPage();}
};
document.addEventListener('click',e=>{
 const depth=e.target.closest('[data-depth-action=training]');if(depth&&operationsSection){e.preventDefault();e.stopPropagation();openManagementPanel('individual-training',depth);return;}
 const button=e.target.closest('.view-nav [data-view]');if(button&&operationsSection){closeOperationsPage();return;}
 const b=e.target.closest('[data-management-open]');if(b&&operationsEntries.some(r=>r[0]===b.dataset.managementOpen)&&!managerGuideActive){e.preventDefault();e.stopPropagation();openManagementPanel(b.dataset.managementOpen,b);}
},true);
managementDialog.addEventListener('close',()=>{if(managementDialog.open)return;operationsSection=null;delete managementDialog.dataset.operationsSection;managementDialog.querySelector('.operations-nav')?.remove();document.body.classList.remove('operations-page');});
window.addEventListener('resize',()=>{if(operationsSection&&!managementDialog.contains(document.activeElement?.closest('input,textarea')))render();});
const operationsTrainingOriginal=renderIndividualTraining;
renderIndividualTraining=function(){
 operationsTrainingOriginal();
 if(operationsSection==='individual-training'){const panel=$('individual-training'),row=TrainingCentre.read(season).players.find(p=>p.slot===individualTrainingSlot);if(row){const h=panel.querySelector('.training-selected-heading small');if(h)h.textContent=(row.capped?'성장 한계 도달':'다음 성장 '+row.minutesToGrowth+'분')+' · '+row.recommendation.label;}if(row&&innerHeight<=450){const form=panel.querySelector('.training-form-report>p');if(form&&row.form.appearances)form.textContent='최근 '+row.form.appearances+'회 · '+row.form.minutes+'분 · '+row.form.goals+'골 '+row.form.assists+'도움';}const note=panel.querySelector('.individual-training-note');panel.classList.toggle('operations-training-completed',Boolean(note));operationsTrainingBands();}
};
const operationsStaffOriginal=renderStaff;
renderStaff=function(){
 operationsStaffOriginal();if(operationsSection!=='staff-panel'||view!=='squad'||squadTab!=='health')return;
 const panel=$('staff-panel'),candidates=Staff.candidates(season),active=Staff.roles.map(role=>Staff.active(season,role)).filter(Boolean),choices=[...candidates.map(p=>({key:p.id,p,current:false})),...active.map(p=>({key:'active:'+p.role,p,current:true}))];
 let chosen=choices.find(p=>p.key===operationsStaffChoice)||choices[0];if(!chosen)return;operationsStaffChoice=chosen.key;
 const p=chosen.p,esc=staffUiText,role=Staff.roleLabels[p.role],quotes=chosen.current?[['renew','7경기 연장',p.role],['release','계약 해지',p.role]]:[['hire','이 코치 영입',p.id]];
 const deals=quotes.map(([action,label,key])=>{const q=Staff.quote(season,action,key);return '<div class="operations-staff-deal"><button type="button" class="'+(action==='hire'?'primary':'secondary')+'" data-staff-action="'+action+'" data-staff-choice="'+key+'" '+(!q.available?'disabled':'')+'>'+label+' · '+staffMoney(q.cost)+'</button><small>'+esc(q.reason||(action==='hire'?'계약금 즉시 차감 · 다음 주부터 훈련 효과':'현재 계약 조건 확인'))+'</small></div>';}).join('');
 panel.innerHTML='<section class="operations-staff"><header><h2>코치 계약</h2><span>'+active.length+' / 5명 계약 · 자금 '+staffMoney(season.finance.balance)+' · 코치 주급 '+staffMoney(Staff.wages(season))+'</span></header><div class="operations-staff-layout"><section class="operations-staff-list"><h3>현재 담당 코치</h3><div class="operations-staff-contracts">'+Staff.roles.map(role=>{const who=Staff.active(season,role);return who?'<button type="button" data-ops-staff-choice="active:'+role+'">'+staffFace(who)+'<strong>'+esc(Staff.roleLabels[role])+' · '+esc(who.name)+'</strong><span>'+who.remaining+'경기 · '+staffMoney(who.wage)+'</span></button>':'<div><b>'+esc(Staff.roleLabels[role])+'</b><span>공석</span></div>';}).join('')+'</div><h3>영입 후보 · '+candidates.length+'명</h3><div class="operations-staff-candidates">'+candidates.map(person=>'<button type="button" data-ops-staff-choice="'+person.id+'" aria-pressed="'+(person.id===operationsStaffChoice)+'">'+staffFace(person)+'<strong>'+esc(person.name)+'</strong><span>'+esc(Staff.roleLabels[person.role])+' · '+staffMoney(person.fee)+'</span></button>').join('')+'</div></section><section class="operations-staff-profile"><header>'+staffFace(p)+'<div><h3>'+esc(p.name)+'</h3><span>'+esc(role)+' · '+(chosen.current?'현재 계약':'7경기 계약 후보')+'</span></div></header><p class="operations-staff-effect">'+staffEffect(p)+'</p><dl><div><dt>리그 주급</dt><dd>'+staffMoney(p.wage)+'</dd></div><div><dt>'+(chosen.current?'남은 계약':'7경기 총 비용')+'</dt><dd>'+(chosen.current?p.remaining+'경기':staffMoney(p.fee+p.wage*7))+'</dd></div><div><dt>의무 코치</dt><dd>현재 부상 확률 '+Math.round((1-Staff.medicalModifier(season))*100)+'% 감소</dd></div></dl><p class="operations-staff-rules">컵·유럽 경기에는 주급과 계약 기간을 소모하지 않습니다. 선수 성장 한계와 부상 휴식 기간은 유지합니다.</p><div class="operations-staff-actions">'+deals+'</div><p class="staff-note" role="status">'+esc(staffNote||'코치 선택은 계약하지 않습니다. 조건을 확인한 뒤 영입하세요.')+'</p></section></div></section>';
 panel.querySelectorAll('[data-ops-staff-choice]').forEach(button=>button.onclick=e=>{e.stopPropagation();operationsStaffChoice=button.dataset.opsStaffChoice;renderStaff();panel.querySelector('[data-ops-staff-choice="'+operationsStaffChoice+'"]')?.focus({preventScroll:true});});
};

const operationsTeamOriginal=renderTeamTrainingPreview;renderTeamTrainingPreview=function(){operationsTeamOriginal();if(operationsSection==="training-card")operationsPrepareTeam();};
const operationsOwnerOriginal=renderOwnerBoard;renderOwnerBoard=function(){operationsOwnerOriginal();if(operationsSection==="owner-board-panel")prepareOperationsPage();};
function operationsTrainingBands(){if(operationsSection!=="individual-training")return;for(const n of document.querySelectorAll("#individual-training .training-selected-stats strong,#individual-training .training-player-metrics>span:first-child b")){const value=Number(n.textContent);n.dataset.abilityBand=value>=80?"elite":value>=65?"strong":value>=50?"steady":"developing";}}
const operationsRosterOriginal=renderTrainingRoster;renderTrainingRoster=function(){operationsRosterOriginal();operationsTrainingBands();};

function operationsPreparePlans(){const panel=$("squad-plans-panel"),card=panel.querySelector(".squad-plans-card");if(!card||card.querySelector(".squad-plan-preview")||!state)return;const rows=state.lineup.map(id=>season.squad[id]).filter(Boolean);card.insertAdjacentHTML("beforeend","<section class=\"squad-plan-preview operations-current-eleven\"><h3>현재 경기 선발 · "+rows.length+"명</h3><p>"+state.formation.split("").join("-")+" · 저장 버튼을 누르면 이 선발과 경기 지시를 기록합니다.</p><ul class=\"squad-plan-eleven\">"+rows.map(p=>"<li><span>"+p.pos+"</span><strong>"+escapeText(p.name)+"</strong><small>체력 "+Math.round(loadEnergy(p))+" · 주요 능력 "+p[S.primaryKey(p)]+"</small></li>").join("")+"</ul><p>다른 계획을 불러오려면 먼저 적용 전 미리보기를 확인하세요.</p></section>");}
const operationsPlansOriginal=renderSquadPlans;renderSquadPlans=function(){operationsPlansOriginal();if(operationsSection==="squad-plans-panel")operationsPreparePlans();};

var operationsDisciplineFilter=null;
const operationsSuspensionsOriginal=renderSuspensions;renderSuspensions=function(){
 operationsSuspensionsOriginal();if(operationsSection!=='suspensions-panel'||view!=='club')return;const model=Suspensions.read(season);if(!model.enabled)return;
 const names={league:'리그',cup:'국내컵',europe:'유럽 대회'},competition=Object.hasOwn(names,operationsDisciplineFilter)?operationsDisciplineFilter:season.competition,rows=model.rows.filter(p=>p.competition===competition).sort((a,b)=>Number(b.blocked)-Number(a.blocked)||b.pending-a.pending||b.yellows-a.yellows||a.id.localeCompare(b.id));
 const panel=$('suspensions-panel');panel.innerHTML='<section class="operations-discipline"><header><h2>경고와 출전 정지</h2><span>이번 경기 정지 '+model.blocked.length+'명'+(model.deferred.length?' · 집행 연기 '+model.deferred.length+'명':'')+'</span></header><nav aria-label="징계 대회">'+Object.entries(names).map(([id,name])=>'<button type="button" data-operations-discipline="'+id+'" aria-pressed="'+(id===competition)+'">'+name+'</button>').join('')+'</nav><p>같은 대회 경고 3회·퇴장 → 1경기 정지 · '+names[competition]+' 누적 '+rows.length+'명</p><ul>'+rows.map(p=>'<li><strong>'+escapeText(p.name)+' · '+p.pos+'</strong><span>경고 '+p.yellows+'/3'+(p.pending?' · 정지 '+p.pending+'경기':'')+'</span><small>'+(p.blocked?'이번 경기 출전 불가':p.deferred?'필수 인원 부족 · 집행 연기':p.pending?'다음 해당 대회에서 집행':p.yellows===2?'경고 한 번 더 받으면 정지':'누적 경고')+(p.pending?' · '+escapeText(p.reason):'')+'</small></li>').join('')+'</ul><p class="operations-discipline-rule">'+(rows.length?'':'아직 누적 기록이 없습니다. ')+'확정 경기만 집계 · 대회별 분리 · 부상 휴식에도 정지 집행 · 새 시즌 초기화</p></section>';
 panel.querySelectorAll('[data-operations-discipline]').forEach(b=>b.onclick=()=>{operationsDisciplineFilter=b.dataset.operationsDiscipline;renderSuspensions();panel.querySelector('[data-operations-discipline="'+operationsDisciplineFilter+'"]')?.focus({preventScroll:true});});
};
