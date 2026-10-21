// Reuse the existing controls and delegated handlers; never change the practice/campaign.
function arrangePracticeWorkspace(){
 const d=$('practice-dialog'),shell=d?.querySelector('.practice-shell');if(!d?.open||!shell||!practiceSession)return;shell.classList.add('practice-workspace');shell.dataset.done=String(practiceSession.match.phase==='full');
 const header=shell.querySelector('.practice-header'),tabs=shell.querySelector('.practice-scenarios'),intro=shell.querySelector('.practice-story'),footer=$('practice-run-controls'),feel=shell.querySelector('.practice-feel'),exit=$('practice-exit'),side=shell.querySelector('.practice-decisions');
 if(!header||!side||!footer)return;if(tabs?.parentElement!==header)header.append(tabs);if(intro&&intro.parentElement!==header.firstElementChild)header.firstElementChild.append(intro);
 if(feel?.parentElement!==footer)footer.append(feel);const leave=exit?.querySelector('[data-practice=close]');if(leave)footer.append(leave);
 let pane=$('practice-workspace-pane');if(!pane){pane=document.createElement('select');pane.id='practice-workspace-pane';pane.setAttribute('aria-label','연습 전술 또는 선수 교체');side.prepend(pane);pane.onchange=()=>{side.dataset.pane=pane.value;drawPractice();pane.focus({preventScroll:true});};side.dataset.pane='tactics';}
 const current=side.dataset.pane||'tactics';const markup='<option value="tactics">전술 지시</option><option value="subs">교체 · '+practiceSession.match.subs+'/5명</option>';if(pane._markup!==markup){pane.innerHTML=markup;pane._markup=markup;}if(pane.value!==current)pane.value=current;side.dataset.pane=current;
 const roster=side.querySelector('.practice-roster-options');if(roster)roster.open=true;
 const note=$('practice-coach');if(note){note.title=practiceSession.id==='comeback'?'75분부터15분간 전술 변경과 교체를 연습합니다.':'80분부터10분간 체력을 확인하며 리드를 지키세요.';note.textContent=practiceSession.startMinute+'분 시작 · '+(practiceSession.id==='comeback'?'한 골 차를 따라잡기':'한 골 차를 지키기');}
 const result=$('practice-result')?.querySelector('.practice-result-note');if(result){result.title=result.textContent;result.textContent='실제 경기 기록 · 같은 조건으로 재도전합니다.';}
 drawPractice();
}
const practiceWorkspaceRender=renderPractice;renderPractice=function(){practiceWorkspaceRender();arrangePracticeWorkspace();};
