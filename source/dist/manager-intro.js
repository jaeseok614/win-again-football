// Optional onboarding is a device preference, never part of simulation or saves.
var managerIntroBypass=false,managerGuideStep=0,managerGuideWaiting=null,managerGuideActive=false;
const managerGuideKey='win-again-manager-guide-v1';
const managerGuideSteps=[
 ['눈을 뜨니, 감독실이었다','밤새 축구를 보다가 잠든 당신. 눈을 뜨자 책상 위에는 토투넘 핫스퍼의 감독 계약서가 놓여 있습니다. 강등으로 자신감을 잃은 선수들, 비어 있는 우승 진열장. 이제 당신이 새 이야기를 씁니다.','다음 이야기'],
 ['다시 올라갈 시간','이곳은 현실과 다른 가상 축구 세계입니다. 토투넘은 2부에서 출발합니다. 리그 14경기에서 상위 2위에 들면 1부로 승격합니다. 선수들을 성장시키고, 구단 자금을 지키며, 리그·국내컵·유럽 우승에 도전하세요.','감독실로'],
 ['1. 내 선수 알아보기','선수단에서 이름을 누르면 능력과 성격을 볼 수 있습니다. 기술·신체는 1–20으로 비교하고, 충성도와 압박 대처는 감독의 말에 대한 반응을 바꿉니다. 먼저 우리 선수를 살펴보고 상세 창을 닫아 보세요.','선수 보고서 열기'],
 ['2. 경기 전 전술 준비','전술 창에서 포메이션과 경기 지시를 고르고, 배치판의 선수를 선택해 위치·역할을 조정하세요. 경기 중계 화면의 선수는 클릭하거나 끌 수 없습니다. 준비가 되면 전술 창을 닫아 보세요.','전술 창 열기'],
 ['3. 선수에게 한마디','격려·칭찬·분발 요구·침착하게 중 하나를 고르세요. 선수마다 반응이 다릅니다. 한 구간에서 한 번만 말할 수 있으며 경기 전·하프타임·65분에 기회가 있습니다. 반응을 확인하고 창을 닫으세요.','선수 대화 열기'],
 ['4. 첫 경기 시작','경기는 자동으로 흐릅니다. 일시 정지를 누르면 시간을 멈추고, 5분 진행으로 짧게 관전할 수도 있습니다. 선수 교체 창에서 나갈 선발과 같은 포지션의 후보를 고르세요. 팝업을 닫아도 직접 이어가기 전까지 멈춰 있습니다. 경기 종료 후 결과 확정으로 다음 일정을 준비합니다.','직접 킥오프 준비']
];
function guideSeen(){try{return localStorage.getItem(managerGuideKey)==='done';}catch{return false;}}
function rememberGuide(){try{localStorage.setItem(managerGuideKey,'done');}catch{}}
function offerManagerIntro(){if(managerIntroBypass||restoredSave.payload||launchHasCampaign||guideSeen())return false;openManagerGuide(0);return true;}
function renderManagerGuide(){const [title,text,label]=managerGuideSteps[managerGuideStep];$('manager-guide-title').textContent=title;$('manager-guide-copy').textContent=text;$('manager-guide-next').textContent=label;$('manager-guide-progress').textContent=(managerGuideStep+1)+' / '+managerGuideSteps.length;$('manager-guide-title').focus({preventScroll:true});}
function openManagerGuide(step=2){pauseForPlanning();managerGuideStep=step;managerGuideWaiting=null;managerGuideActive=true;renderManagerGuide();if(!$('manager-guide').open)$('manager-guide').showModal();}
function finishManagerGuide(){managerGuideActive=false;managerGuideWaiting=null;managerIntroBypass=true;rememberGuide();$('manager-guide').close();if(!appSessionStarted)enterManagerHome();else $('primary')?.focus({preventScroll:true});}
function nextManagerGuide(){
 if(managerGuideStep===0){managerGuideStep=1;renderManagerGuide();return;}
 if(managerGuideStep===1){managerIntroBypass=true;$('manager-guide').close();enterManagerHome();managerGuideStep=2;managerGuideWaiting='home';return;}
 if(managerGuideStep===5){finishManagerGuide();return;}
 const step=managerGuideStep;$('manager-guide').close();managerGuideWaiting=step===2?'player':'match';
 if(step===2){const p=Object.values(season.squad).find(p=>p.id==='f1');openPlayerDetails(p.identity,$('launch-continue'));}
 else{view='match';render();openMatchPopup(step===3?'tactics':'talk',$('primary'));}
}
function continueManagerGuide(){if(!managerGuideActive||!managerGuideWaiting||managerGuideWaiting==='home')return;if(managerGuideStep===4&&!state.decisions.some(d=>d.type==='talk'&&d.minute===state.minute)&&['prep','half','late'].includes(state.phase)){managerGuideWaiting=null;renderManagerGuide();$('manager-guide').showModal();return;}managerGuideWaiting=null;managerGuideStep++;renderManagerGuide();$('manager-guide').showModal();}
const managerGuideDialog=document.createElement('dialog');managerGuideDialog.id='manager-guide';managerGuideDialog.setAttribute('aria-labelledby','manager-guide-title');managerGuideDialog.innerHTML='<p class="eyebrow">TOTTUNHAM / FIRST CHAPTER <span id="manager-guide-progress"></span></p><h2 id="manager-guide-title" tabindex="-1"></h2><p id="manager-guide-copy"></p><div class="manager-guide-actions"><button id="manager-guide-next" type="button" class="primary"></button><button id="manager-guide-skip" type="button" class="secondary">가이드는 나중에</button></div><small>가이드 버튼은 실제 선수 보고서와 전술·대화 창을 엽니다. 언제든 시작 메뉴의 초보 가이드로 다시 볼 수 있습니다.</small>';document.body.append(managerGuideDialog);
$('manager-guide-next').onclick=nextManagerGuide;$('manager-guide-skip').onclick=finishManagerGuide;
managerGuideDialog.addEventListener('cancel',()=>{managerGuideActive=false;managerGuideWaiting=null;managerIntroBypass=true;});
$('player-detail-dialog').addEventListener('close',()=>{if(managerGuideWaiting==='player')continueManagerGuide();});$('match-popup').addEventListener('close',()=>{if(managerGuideWaiting==='match')continueManagerGuide();});
const guideButton=document.createElement('button');guideButton.type='button';guideButton.id='launch-guide';guideButton.textContent='스토리 · 초보 가이드';guideButton.onclick=()=>openManagerGuide(appSessionStarted?2:0);$('launch-import').after(guideButton);
const newStoryButton=document.createElement('button');newStoryButton.type='button';newStoryButton.id='launch-new-story';newStoryButton.textContent='새 토투넘 이야기 준비';newStoryButton.onclick=()=>{openPortability();previewCampaignText(CampaignFile.stringify({season:S.create(undefined,{suspensions:true,startingClub:true})}));portabilityStatus='새 토투넘 구단입니다. 적용 전에 현재 구단을 저장 파일로 내보낼 수 있습니다. 적용하면 교체 직전 구단도 이 기기에 보관됩니다.';updateImportPreview();};guideButton.after(newStoryButton);
const guideHelp=guideButton.cloneNode(true);guideHelp.id='manager-help';guideHelp.textContent='초보 가이드';guideHelp.onclick=()=>openManagerGuide(2);document.querySelector('.header-actions').append(guideHelp);
// Resume the tour once the existing loading state has completed its home render.
const originalShellRender=renderAppShell;renderAppShell=function(){originalShellRender();if(managerGuideActive&&managerGuideWaiting==='home'&&appSessionStarted&&!launchBusy){managerGuideWaiting=null;renderManagerGuide();managerGuideDialog.showModal();}};
