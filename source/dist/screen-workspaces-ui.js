
// Existing controls are page workspaces; large detail reports remain modal.
var workspaceRouting=false,workspaceSquadKey='',workspaceSquadSeason=null;
const tacticalMainSection=$('match-popup-tactics'),tacticalMainAnchor=document.createComment('tactics-workspace');
tacticalMainSection.before(tacticalMainAnchor);
function restoreTacticsWorkspace(){
 if(!tacticalMainSection.dataset.inlineWorkspace)return;
 delete tacticalMainSection.dataset.inlineWorkspace;tacticalMainAnchor.after(tacticalMainSection);tacticalMainSection.hidden=true;
}
function releaseInlineScreens(next){
 for(const dialog of [managementDialog,squadOverviewDialog]){
  if(dialog.dataset.inlineWorkspace&&dialog.dataset.inlineWorkspace!==next){
   dialog.close();if(dialog===managementDialog){restoreManagementPanel();managementActive=null;}
   delete dialog.dataset.inlineWorkspace;dialog.setAttribute('role','dialog');dialog.removeAttribute('aria-modal');document.body.append(dialog);
  }
 }
 if(next!=='tactics')restoreTacticsWorkspace();
}
function formationChoiceMarkup(){
 return '<h2>포메이션</h2><div class="workspace-formations">'+[...$('formation').options].map(o=>'<button type="button" data-workspace-formation="'+o.value+'" aria-pressed="'+(o.value===state.formation)+'" '+(!editable()?'disabled':'')+'>'+o.value.split('').join('-')+'</button>').join('')+'</div><section class="workspace-orders"><h3>공격 방식</h3>'+Object.entries(F.attackFocuses).map(([id,label])=>'<button type="button" data-workspace-attack="'+id+'" aria-pressed="'+(id===F.attackFocus(state))+'" '+(!editable()?'disabled':'')+'>'+escapeText(label)+'</button>').join('')+'<h3>수비 운영</h3>'+Object.entries(defenceNames).map(([id,label])=>'<button type="button" data-workspace-defence="'+id+'" aria-pressed="'+(id===state.tactic)+'" '+(!editable()?'disabled':'')+'>'+escapeText(label)+'</button>').join('')+'</section>';
}
function positionChoiceMarkup(){
 const row=positions().find(r=>r.id===selected);if(!row)return '';
 if(row.p.pos==='GK')return '<section class="workspace-position-picker"><b>GK · 골키퍼 위치 고정</b></section>';
 const current=tacticalPosition(row.x,row.y,row.p.pos).code;
 return '<section class="workspace-position-picker" aria-label="선택한 선수 배치 위치"><h3>배치 위치 · '+current+'</h3><div>'+tacticalSlots.map(s=>'<button type="button" data-workspace-position="'+s.code+'" aria-label="'+escapeText(s.code+' · '+s.label)+'" aria-pressed="'+(s.code===current)+'" '+(!editable()?'disabled':'')+'>'+s.code+'</button>').join('')+'</div><small>동료 자리 → 교환 · 등록 포지션 유지</small></section>';
}
renderTacticsCentre=function(){
 const pane=$('tactics-pane');if(!state){restoreTacticsWorkspace();pane.innerHTML='<h2>전술 센터</h2><p>시즌 결산 뒤 다음 경기의 전술을 준비하세요.</p>';return;}
 if(!pane.querySelector('.workspace-formation-rail')){
  pane.innerHTML='<aside class="workspace-formation-rail" aria-label="포메이션과 팀 지시"></aside><section class="workspace-tactical-field"></section>';
 }
 tacticalMainSection.dataset.inlineWorkspace='tactics';pane.querySelector('.workspace-tactical-field').append(tacticalMainSection);tacticalMainSection.hidden=false;
 pane.querySelector('.workspace-formation-rail').innerHTML=formationChoiceMarkup();
 if(selected&&(!state.lineup.includes(selected)||Discipline.dismissed(state).includes(selected)))selected=null;
 const previous=matchPopupActive;try{matchPopupActive='tactics';renderTacticalEditor();renderPitchPlayerTools();renderMobileTacticsDock();renderFormationInstructions();}finally{matchPopupActive=previous;}
 const editor=$('tactical-editor');
 tacticalMainSection.querySelectorAll('.report-page-off').forEach(e=>e.classList.remove('report-page-off'));
 const profile=editor.querySelector('.tactical-selected-profile');if(profile)profile.insertAdjacentHTML('beforeend',positionChoiceMarkup());
 const picker=profile?.querySelector('.workspace-position-picker');if(picker)picker.onclick=e=>{
  const b=e.target.closest('[data-workspace-position]');if(!b||b.disabled)return;
  const slot=tacticalSlots.find(s=>s.code===b.dataset.workspacePosition),row=positions().find(r=>r.id===selected);if(!slot||!row||row.p.pos==='GK')return;
  const occupant=positions().find(r=>r.id!==selected&&r.p.pos!=='GK'&&tacticalPosition(r.x,r.y,r.p.pos).code===slot.code);
  commitTacticalPosition(selected,occupant?[occupant.x,occupant.y]:[slot.x,slot.y]);
 };
 pane.querySelector('.workspace-formation-rail').onclick=e=>{
  const b=e.target.closest('button');if(!b||b.disabled)return;
  if(b.dataset.workspaceFormation){$('formation').value=b.dataset.workspaceFormation;$('formation').dispatchEvent(new Event('change',{bubbles:true}));}
  else action(()=>{pauseForPlanning();if(b.dataset.workspaceAttack)F.setAttackFocus(state,b.dataset.workspaceAttack);if(b.dataset.workspaceDefence)F.setTactic(state,b.dataset.workspaceDefence);});
 };
 const plan=editor.querySelector('.set-piece-plan');if(plan)plan.classList.add('workspace-takers');
};
function renderMarketFinance(){
 if(view!=='market')return;const host=$('market-overview');let bar=host.querySelector('.workspace-market-finance');if(!bar){bar=document.createElement('div');bar.className='workspace-market-finance';host.append(bar);}bar.innerHTML='<span>자금 '+(season.finance.balance<0?'−':'')+moneyLabel(season.finance.balance)+' · 주급 '+moneyLabel(clubWeeklyWages())+'</span><button type="button" data-workspace-finance="finance-plan-panel">자금 계획</button><button type="button" data-workspace-finance="finance-detail">장부</button>';bar.onclick=e=>{const b=e.target.closest('[data-workspace-finance]');if(b)openManagementPanel(b.dataset.workspaceFinance,b);};
}
function renderPositionFilters(){
 const select=$('transfer-position');if(view!=='market'||!select)return;
 const label=select.closest('label');let group=label.querySelector('.workspace-position-filters');
 if(!group){group=document.createElement('div');group.className='workspace-position-filters';group.setAttribute('role','group');group.setAttribute('aria-label','영입 포지션');label.append(group);}
 group.innerHTML=[['all','전체'],['GK','GK'],['DEF','수비'],['MID','중원'],['FW','공격']].map(([id,name])=>'<button type="button" data-workspace-filter="'+id+'" aria-pressed="'+(select.value===id)+'">'+name+'</button>').join('');
 group.onclick=e=>{const b=e.target.closest('[data-workspace-filter]');if(!b)return;select.value=b.dataset.workspaceFilter;select.dispatchEvent(new Event('change',{bubbles:true}));renderPositionFilters();document.querySelector('[data-workspace-filter="'+b.dataset.workspaceFilter+'"]')?.focus({preventScroll:true});};
}
const workspaceTransferSearch=transferCandidates;transferCandidates=function(){const result=workspaceTransferSearch();renderPositionFilters();return result;};
const workspaceMarketRender=renderMarket;renderMarket=function(){const result=workspaceMarketRender();renderMarketFinance();return result;};
function renderHomeFacts(){
 if(view!=='club')return;
 const board=OwnerBoard.read(season),inbox=ClubStory.read(season),rows=Object.values(season.squad);
 const facts={'owner-board-panel':'신임 '+board.confidence.score+' · 신뢰 '+board.trust,'club-story-panel':'수첩 · '+StoryNotebook.chapter(season).attempt+'번째 삶','training-card':(season.trained?'훈련 완료':'훈련 대기')+' · 체력 '+Math.round(rows.reduce((n,p)=>n+p.energy,0)/Math.max(1,rows.length))};
 for(const [id,text] of Object.entries(facts)){const button=$('management-hub-club').querySelector('[data-management-open="'+id+'"]');if(!button)continue;let small=button.querySelector('.workspace-home-fact');if(!small){small=document.createElement('small');small.className='workspace-home-fact';button.append(small);}small.textContent=text;}
}
function renderInlineScreens(){
 if(workspaceRouting||!appSessionStarted||managerGuideActive||managementActive&&!managementDialog.open)return;
 if(view==='squad'&&!managementDialog.open&&(!squadOverviewDialog.open||Boolean(squadOverviewDialog.dataset.inlineWorkspace))){
  const key=JSON.stringify([season.year,season.round,season.squad,state?.phase,state?.lineup]);
  if(workspaceSquadSeason!==season||workspaceSquadKey!==key||!squadOverviewDialog.open){workspaceSquadSeason=season;workspaceSquadKey=key;openSquadOverview(null,{inline:true});}
  if(squadOverviewDialog.dataset.inlineWorkspace){const footer=squadOverviewDialog.querySelector('footer');if(!footer.querySelector('[data-workspace-report]')){for(const [id,label] of [['squad-health','휴식·컨디션'],['individual-training','훈련'],['staff-panel','코치 계약'],['player-records','시즌 기록']]){const b=document.createElement('button');b.type='button';b.className='secondary';b.dataset.workspaceReport=id;b.textContent=label;b.onclick=()=>openManagementPanel(id,b);footer.append(b);}}}
 }else if(view==='market'&&(!managementDialog.open||Boolean(managementDialog.dataset.inlineWorkspace))){
  if(!managementDialog.open||managementActive!=='market'){
   workspaceRouting=true;try{openManagementPanel('transfer-search-panel',null,{inline:true});}finally{workspaceRouting=false;}
  }
  renderPositionFilters();renderMarketFinance();
 }
 renderHomeFacts();
}
const screensRender=render;render=function(){
 releaseInlineScreens(view);document.body.classList.toggle('dense-workspace-view',appSessionStarted&&['tactics','squad','market'].includes(view));document.body.classList.toggle('inline-tactics-view',appSessionStarted&&view==='tactics');screensRender();renderInlineScreens();
};
for(const b of document.querySelectorAll('.view-nav [data-view]'))if(['squad','market'].includes(b.dataset.view))b.onclick=()=>setView(b.dataset.view);
document.addEventListener('click',e=>{
 const b=e.target.closest('[data-match-popup="tactics"]');if(!b||managerGuideActive||typeof practiceSession!=='undefined'&&practiceSession)return;
 e.preventDefault();e.stopPropagation();if($('match-popup').open)closeMatchPopup();setView('tactics');
},true);
const pageTacticsOpen=openTacticsEditor;openTacticsEditor=function(kind,opener){if(kind==='tactics'&&!managerGuideActive){setView('tactics');return;}pageTacticsOpen(kind,opener);};
window.addEventListener('resize',()=>{if(appSessionStarted&&['tactics','squad','market'].includes(view))render();});

for(const dialog of [managementDialog,squadOverviewDialog])dialog.addEventListener('close',()=>{if(!dialog.open&&appSessionStarted&&!managerGuideActive&&['squad','market'].includes(view)&&!workspaceRouting){render();document.querySelector('.view-nav [data-view="'+view+'"]')?.focus({preventScroll:true});}});
