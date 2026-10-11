// Formation defaults are a starting point; subsequent drags and instructions stay manual.
const formationDefaults={442:['balanced','cross'],433:['press','dribble'],352:['balanced','combination'],4231:['balanced','combination'],4141:['counter','cross'],451:['lowBlock','cross'],4411:['counter','combination'],343:['press','cross'],532:['counter','cross'],541:['lowBlock','cross'],41212:['balanced','combination'],4312:['press','combination']};
const instructionNotes={balanced:'상황에 따라 다양한 공격을 선택합니다.',cross:'측면 크로스와 컷백을 늘립니다. 크로스는 차단 위험이 있습니다.',dribble:'공을 몰고 수비를 돌파하는 공격을 늘립니다. 돌파 실패 위험도 있습니다.',combination:'짧은 패스 연계로 기회를 만듭니다. 측면 크로스는 줄어듭니다.'};
const defenceNames={balanced:'균형 유지',press:'전방 압박',counter:'역습 위주',lowBlock:'수비 위주'};
let formationRecommendationCache=null;
function applyFormationDefaults(shape){
 const defaults=formationDefaults[shape];if(!defaults)throw Error('포메이션을 다시 선택하세요.');
 F.setFormation(state,shape);F.setTactic(state,defaults[0]);F.setAttackFocus(state,defaults[1]);customPositions={};selected=null;
}
function instructionSelect(kind){const values=kind==='attack'?F.attackFocuses:defenceNames,current=kind==='attack'?F.attackFocus(state):state.tactic;return '<select data-instruction-select="'+kind+'" aria-label="'+(kind==='attack'?'공격 방식':'수비 운영')+'"'+(!editable()?' disabled':'')+'>'+Object.entries(values).map(([id,label])=>'<option value="'+id+'"'+(id===current?' selected':'')+'>'+label+'</option>').join('')+'</select>';}
function bindInstructionSelects(host){host.querySelectorAll('[data-instruction-select]').forEach(select=>select.onchange=()=>{const kind=select.dataset.instructionSelect;action(()=>{pauseForPlanning();if(kind==='attack')F.setAttackFocus(state,select.value);else F.setTactic(state,select.value);});host.querySelector('[data-instruction-select="'+kind+'"]')?.focus({preventScroll:true});});}
function renderFormationInstructions(){
 if(matchPopupActive!=='tactics')return;const toolbar=$('match-popup-tactics').querySelector('.field-toolbar');if(!toolbar)return;
 let row=toolbar.querySelector('.formation-actions');if(!row){row=document.createElement('div');row.className='formation-actions';toolbar.append(row);}
 const allowed=state===season.match&&CoachLineup.canEdit(season)&&!(typeof practiceSession!=='undefined'&&practiceSession);let model=null;
 if(allowed){const key=CoachLineup.key(season);if(formationRecommendationCache?.key!==key)formationRecommendationCache={key,model:CoachLineup.read(season)};model=formationRecommendationCache.model;}
 const best=model?.options.slice(0,3)||[];
 for(const option of $('formation').options){const rank=best.findIndex(p=>p.formation===option.value);option.textContent=option.value.split('').join('-')+(rank>=0?' · 추천 '+(rank+1):'');}
 row.innerHTML='<button type="button" data-formation-reset'+(state.phase!=='prep'?' disabled':'')+'>기본값 복원</button><button type="button" data-formation-recommend'+(!best.length?' disabled':'')+'>추천 '+(best[0]?.formation.split('').join('-')||'선발')+'</button><div class="formation-quick-orders">'+instructionSelect('attack')+instructionSelect('defence')+'</div>';
 row.querySelector('[data-formation-reset]').onclick=()=>action(()=>applyFormationDefaults(state.formation));
 row.querySelector('[data-formation-recommend]').onclick=()=>{coachLineupPriority='fit';coachLineupShape=model.recommended;coachLineupReview=null;openMatchPopup('lineup');};
 row.querySelector('.formation-quick-orders').append(row.querySelector('[data-formation-reset]'));bindInstructionSelects(row);const count=$('lineup-count');if(count)count.hidden=true;
 row.querySelector('[data-formation-reset]').title='선택한 포메이션의 기본 위치·공격 방식·수비 운영으로 되돌립니다.';
 row.querySelector('[data-formation-recommend]').title='출전 가능 선수의 위치 적합도·주 능력·체력으로 비교한 추천. 선발은 검토 후 적용합니다.';
}
const instructionDockRender=renderMobileTacticsDock;renderMobileTacticsDock=function(){
 instructionDockRender();if(typeof matchPopupActive==='undefined'||matchPopupActive!=='tactics')return;const host=$('mobile-tactics-dock');
 const focus=F.attackFocus(state);host.innerHTML='<div class="instruction-panel"><section><h3>공격할 때</h3><div class="instruction-buttons">'+Object.entries(F.attackFocuses).map(([id,label])=>'<button type="button" data-attack-focus="'+id+'" aria-pressed="'+(id===focus)+'"'+(!editable()?' disabled':'')+'>'+label+'</button>').join('')+'</div><p>'+instructionNotes[focus]+'</p></section><section><h3>팀 운영</h3><div class="instruction-buttons">'+Object.entries(defenceNames).map(([id,label])=>'<button type="button" data-mobile-tactic="'+id+'" aria-pressed="'+(id===state.tactic)+'"'+(!editable()?' disabled':'')+'>'+label+'</button>').join('')+'</div><p>'+({balanced:'공격과 수비의 균형을 유지합니다.',press:'공격 기회를 늘리지만 상대에게 공간을 내줍니다.',counter:'빠른 공격수로 뒷공간을 노립니다.',lowBlock:'상대 기회를 줄이는 대신 우리 공격 기회도 줄어듭니다.'}[state.tactic])+'</p></section></div>';
 host.querySelectorAll('[data-attack-focus]').forEach(button=>button.onclick=()=>{action(()=>{pauseForPlanning();F.setAttackFocus(state,button.dataset.attackFocus);});host.querySelector('[data-attack-focus="'+button.dataset.attackFocus+'"]')?.focus({preventScroll:true});});
};
const instructionPopupRender=renderMatchPopup;renderMatchPopup=function(){instructionPopupRender();if(matchPopupActive==='tactics'){renderMobileTacticsDock();renderFormationInstructions();}};
