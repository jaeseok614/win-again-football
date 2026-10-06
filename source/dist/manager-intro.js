// Optional onboarding is a device preference, never part of simulation or saves.
var managerIntroBypass=false,managerGuideStep=0,managerGuideWaiting=null,managerGuideActive=false;
const managerGuideKey='win-again-manager-guide-v1';
const managerGuideSteps=[
 ['눈을 뜨니, 감독실이었다','새벽 두 시, 마지막 실점 장면을 보며 잠들었던 당신. 눈을 뜨니 비 내리는 런던의 감독실입니다. 책상에는 토투넘 핫스퍼의 계약서와 사직서가 함께 놓여 있습니다.\n\n“전임 감독은 떠났습니다. 오늘 훈련부터 당신 차례예요.” 문을 연 수석 코치가 말합니다. 복도 끝에는 강등된 구단의 빛바랜 우승 사진이 걸려 있습니다.','다음 이야기'],
 ['다섯 계단의 첫 시즌','“지원금은 무한하지 않습니다. 첫해 목표는 한 단계 승격이에요.” 구단주는 14경기가 적힌 일정표를 내밉니다. 파운데이션 리그 상위 2팀은 한 단계 올라갑니다. 네 번의 승격 끝에 1부에 도달하면 유럽 무대가 열립니다.\n\n훈련장에서는 손헝민이 먼저 다가옵니다. “팬들은 아직 우리를 기다립니다. 감독님, 어떤 축구를 할까요?” 충성심 강한 베테랑, 기회를 기다리는 유망주, 자신감을 잃은 선수에게 같은 말이 통하지는 않습니다.\n\n이 가상 세계의 토투넘에서 전술과 선수 대화로 첫 경기를 준비하세요. 승격 뒤에는 국내컵과 유럽 무대가 기다립니다.','감독실로'],
 ['1. 내 선수 알아보기','선수단에서 이름을 누르면 능력과 성격을 볼 수 있습니다. 기술·신체는 1–20으로 비교하고, 충성도와 압박 대처는 감독의 말에 대한 반응을 바꿉니다. 먼저 우리 선수를 살펴보고 상세 창을 닫아 보세요.','선수 보고서 열기'],
 ['2. 경기 전 전술 준비','전술 창에서 포메이션과 경기 지시를 고르고, 배치판의 유니폼을 끌어 놓아 위치를 정하세요. 위치에 따라 ST·윙·공격형 미드필더 등 배치 포지션이 바뀝니다. 경기 중계 화면의 선수는 클릭하거나 끌 수 없습니다. 준비가 되면 전술 창을 닫아 보세요.','전술 창 열기'],
 ['3. 선수에게 한마디','격려·칭찬·분발 요구·침착하게 중 하나를 고르세요. 선수마다 반응이 다릅니다. 한 구간에서 한 번만 말할 수 있으며 경기 전·하프타임·65분에 기회가 있습니다. 반응을 확인하고 창을 닫으세요.','선수 대화 열기'],
 ['4. 첫 경기 시작','경기는 자동으로 흐릅니다. 일시 정지를 누르면 시간을 멈추고, 5분 진행으로 짧게 관전할 수도 있습니다. 선수 교체 창에서 나갈 선발과 같은 포지션의 후보를 고르세요. 팝업을 닫아도 직접 이어가기 전까지 멈춰 있습니다. 경기 종료 후 결과 확정으로 다음 일정을 준비합니다.','직접 킥오프 준비']
];
function guideSeen(){try{return localStorage.getItem(managerGuideKey)==='done';}catch{return false;}}
function rememberGuide(){try{localStorage.setItem(managerGuideKey,'done');}catch{}}
function offerManagerIntro(){if(managerIntroBypass||restoredSave.payload||launchHasCampaign||guideSeen())return false;openManagerGuide(0);return true;}
function renderManagerGuide(){const [title,copy,label]=managerGuideSteps[managerGuideStep],text=copy.replaceAll('14경기',(typeof S!=='undefined'?S.roundCount(season):14)+'경기');$('manager-guide-title').textContent=title;$('manager-guide-copy').textContent=text;$('manager-guide-next').textContent=label;$('manager-guide-progress').textContent=(managerGuideStep+1)+' / '+managerGuideSteps.length;$('manager-guide-title').focus({preventScroll:true});}
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
const managerGuideDialog=document.createElement('dialog');managerGuideDialog.id='manager-guide';managerGuideDialog.setAttribute('aria-labelledby','manager-guide-title');managerGuideDialog.innerHTML='<p class="eyebrow">TOTTUNHAM / FIRST CHAPTER <span id="manager-guide-progress"></span></p><h2 id="manager-guide-title" tabindex="-1"></h2><p id="manager-guide-copy"></p><div class="manager-guide-actions"><button id="manager-guide-next" type="button" class="primary"></button><button id="manager-guide-skip" type="button" class="secondary">건너뛰기</button></div><small>가이드 버튼은 실제 선수 보고서와 전술·대화 창을 엽니다. 건너뛰어도 새 구단은 토투넘으로 시작합니다. 설정에서 처음 안내를 다시 볼 수 있습니다.</small>';document.body.append(managerGuideDialog);
$('manager-guide-next').onclick=nextManagerGuide;$('manager-guide-skip').onclick=finishManagerGuide;
managerGuideDialog.addEventListener('cancel',()=>{managerGuideActive=false;managerGuideWaiting=null;managerIntroBypass=true;});
$('player-detail-dialog').addEventListener('close',()=>{if(managerGuideWaiting==='player')continueManagerGuide();});$('match-popup').addEventListener('close',()=>{if(managerGuideWaiting==='match')continueManagerGuide();});
// Replay belongs to settings; ordinary first play offers the tour automatically.
const guideHelp=document.createElement('button');guideHelp.type='button';guideHelp.id='manager-help';guideHelp.textContent='처음 안내 다시 보기';guideHelp.onclick=()=>{closeMatchPopup();openManagerGuide(2);};$('match-popup-settings').append(guideHelp);
// Resume the tour once the existing loading state has completed its home render.
const originalShellRender=renderAppShell;renderAppShell=function(){originalShellRender();if(managerGuideActive&&managerGuideWaiting==='home'&&appSessionStarted&&!launchBusy){managerGuideWaiting=null;renderManagerGuide();managerGuideDialog.showModal();}};

// Fictional chapter prose follows confirmed season progress, never adds receipts.
function managerStoryChapter(s){
 const rounds=S.roundCountForYear(s,s.year);
 if(s.final)return ['마지막 휘슬 뒤의 감독실',s.rank&&s.rank<=2?'구단주가 최종 순위표를 펼칩니다. “여기까지 왔군요.” 선수들의 다음 계약과 새 시즌을 준비할 시간입니다.':'시즌 일정표의 마지막 칸이 채워졌습니다. 수석 코치는 결과를 함께 되짚자고 합니다. 전술과 선수 성장 기록을 살펴보고 다음 시즌의 답을 찾아보세요.'];
 if(s.division===1)return ['다시 만난 큰 무대','터널 밖의 함성이 전보다 커졌습니다. 토투넘은 이제 1부의 일정표를 받아 들었습니다. “우리를 올려 보낸 축구를 잊지 맙시다.” 코치가 다음 상대 보고서를 책상에 놓습니다.'];
 if(s.rules==='five-tier'&&s.division<5)return [S.divisionInfo({division:s.division,rules:s.rules}).name+'의 두 번째 장',s.played===0?'지난 시즌의 승격 축하가 아직 라커룸에 남아 있습니다. 이제 '+S.divisionInfo({division:s.division,rules:s.rules}).name+'에서 새 경쟁이 시작됩니다. 상위 두 팀만 다음 단계로 올라갑니다.':'지난 단계에서 통했던 방식이 여기서도 답일까요? '+S.divisionInfo({division:s.division,rules:s.rules}).name+'의 상대 분석과 선수 컨디션을 다시 살펴보세요.'];
 if(s.played>=10)return ['끝이 보이는 승격 레이스','훈련장 게시판에서 남은 일정이 손에 꼽히기 시작합니다. 구단주는 순위표를, 의무 코치는 선수들의 체력을 바라봅니다. 지금의 한 번의 교체와 한마디가 남은 경기에 이어집니다.'];
 if(s.played>=5)return ['감독의 말에 무게가 생겼다','처음에는 당신을 낯설게 바라보던 선수들이 이제 전술판 앞에 먼저 모입니다. 하지만 모든 선수가 같은 표정은 아닙니다. 선수 보고서와 최근 경기 기록을 확인하고, 지금 필요한 말을 골라보세요.'];
 if(s.played>0)return ['첫 휘슬 이후','결과표가 감독실 벽에 붙었습니다. 수석 코치는 다음 경기의 준비를 묻습니다. “한 경기로 우리의 이야기가 끝나진 않습니다.” 출전 기록과 회복 상태를 살펴보고 다음 선발을 결정하세요.'];
 return [s.rules==='five-tier'?'첫 장 · 다섯 단계의 여정':'첫 장 · 강등된 명문에 도착하다',s.rules==='five-tier'?'비 내리는 훈련장에서 손헝민이 공을 내려놓습니다. “감독님, 다시 올라갈 수 있겠죠?” 토투넘은 5부 파운데이션 리그에서 출발합니다. 해마다 '+rounds+'경기를 치르고 네 번 승격해야 1부와 유럽 무대가 열립니다. 선수단을 살펴보고 전술과 첫 팀 대화로 당신의 답을 들려주세요.':'비 내리는 훈련장에서 손헝민이 공을 내려놓습니다. “감독님, 다시 올라갈 수 있겠죠?” 선수단을 살펴보고 전술과 첫 팀 대화로 당신의 답을 들려주세요.'];
}
