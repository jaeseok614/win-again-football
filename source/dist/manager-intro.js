// Optional onboarding is a device preference, never part of simulation or saves.
var managerIntroBypass=false,managerGuideStep=0,managerGuideWaiting=null,managerGuideActive=false;
const managerGuideKey='win-again-manager-guide-v1';
const managerGuideSteps=[
 ['눈을 뜨니, 감독실이었다','마지막 실점 장면을 보며 잠든 밤. 눈을 뜨니 낡은 감독실입니다. 책상에는 토투넘 핫스퍼의 계약서와 전임 감독의 사직서가 놓여 있습니다.\n\n수석 코치가 문을 엽니다. “구단주가 기다립니다. 오늘부터 이 팀은 감독님 팀입니다.”','구단주실로'],
 ['추락한 구단, 남아 있는 사람들','1부의 함성은 사라졌습니다. 토투넘은 이제 5부, 내셔널 리그에서 뛰어야 합니다.\n\n구단주가 46경기 일정표를 펼칩니다. “24팀 중 상위 두 팀이 승격합니다. 네 번 올라가야 집으로 돌아갈 수 있어요. 첫 시즌부터 함께 버텨 주시겠습니까?”','면담 시작'],
 ['1. 내 선수 알아보기','전체 선수단의 종합 능력·체력·컨디션을 비교하세요. 이름을 누르면 주발·세부 포지션·성격과 코치의 6축 리포트가 나옵니다. 기술·신체는 1–20으로 비교하고, 충성도와 압박 대처는 감독의 말에 대한 반응을 바꿉니다. 역할을 골라 어울리는 능력을 확인해 보세요. 선수단 명단을 닫으면 다음 안내로 넘어갑니다.','전체 선수단 보기'],
 ['2. 경기 전 전술 준비','12개 포메이션에서 경기 지시를 고르고, 배치판의 유니폼을 끌어 놓아 위치를 정하세요. 위치에 따라 ST·윙·공격형 미드필더 등 배치 포지션이 바뀝니다. 선발·후보의 코치 제안에서는 위치 적합도·능력·체력 안배를 비교한 뒤 직접 확정할 수 있습니다. 준비가 되면 전술 창을 닫아 보세요.','전술 창 열기'],
 ['3. 선수에게 한마디','격려·칭찬·분발 요구·침착하게 중 하나를 고르세요. 선수마다 반응이 다릅니다. 한 구간에서 한 번만 말할 수 있으며 경기 전·하프타임·65분에 기회가 있습니다. 반응을 확인하고 창을 닫으세요.','선수 대화 열기'],
 ['4. 첫 경기 시작','경기는 자동으로 흐릅니다. 일시 정지와 0.5·1·2·4배속으로 관전 속도를 고르세요. 교체·전술·선수 대화는 팝업에서 정하고, 닫은 뒤 직접 이어갑니다. 경기 기록에서는 실제 공격 장면을 다시 보고 크로스·침투 등 공격 경로를 비교할 수 있습니다. 상대 분석의 선수 이름을 누르면 우리 선수와 비교합니다. 종료 후 결과를 확정하면 다음 일정으로 넘어갑니다.','직접 킥오프 준비']
];
function guideSeen(){try{return localStorage.getItem(managerGuideKey)==='done';}catch{return false;}}
function rememberGuide(){try{localStorage.setItem(managerGuideKey,'done');}catch{}}
function offerManagerIntro(){if(managerIntroBypass)return false;const first=season.year===1&&season.round===0&&state?.phase==='prep',arrival=typeof ClubStory!=='undefined'?ClubStory.read(season).pending.some(e=>e.key==='arrival'):!restoredSave.payload&&!launchHasCampaign;if(!first||!arrival)return false;openManagerGuide(0);return true;}
function renderManagerGuide(){const [title,copy,label]=managerGuideSteps[managerGuideStep];$('manager-guide-title').textContent=title;$('manager-guide-copy').textContent=copy;$('manager-guide-next').textContent=label;$('manager-guide-skip').hidden=managerGuideStep<2;$('manager-guide-progress').textContent=managerGuideStep<2?'첫 출근 · '+(managerGuideStep+1)+' / 2':'조작 안내 · '+(managerGuideStep-1)+' / 4';$('manager-guide-title').focus({preventScroll:true});}
function openManagerGuide(step=2){pauseForPlanning();managerGuideStep=step;managerGuideWaiting=null;managerGuideActive=true;renderManagerGuide();if(!$('manager-guide').open)$('manager-guide').showModal();}
function finishManagerGuide(){if(managerGuideStep<2)return;managerGuideActive=false;managerGuideWaiting=null;managerIntroBypass=true;rememberGuide();$('manager-guide').close();if(!appSessionStarted)enterManagerHome();else $('primary')?.focus({preventScroll:true});}
function completeManagerArrival(){managerGuideWaiting=null;managerGuideStep=2;if(guideSeen())finishManagerGuide();else openManagerGuide(2);}
function nextManagerGuide(){
 if(managerGuideStep===0){managerGuideStep=1;renderManagerGuide();return;}
 if(managerGuideStep===1){managerIntroBypass=true;$('manager-guide').close();managerGuideWaiting='home';enterManagerHome();return;}
 if(managerGuideStep===5){finishManagerGuide();return;}
 const step=managerGuideStep;$('manager-guide').close();managerGuideWaiting=step===2?'squad':'match';
 if(step===2){openSquadOverview($('launch-continue'));}
 else{view='match';render();openMatchPopup(step===3?'tactics':'talk',$('primary'));}
}
function continueManagerGuide(){if(!managerGuideActive||!managerGuideWaiting||managerGuideWaiting==='home')return;if(managerGuideStep===4&&!state.decisions.some(d=>d.type==='talk'&&d.minute===state.minute)&&['prep','half','late'].includes(state.phase)){managerGuideWaiting=null;renderManagerGuide();$('manager-guide').showModal();return;}managerGuideWaiting=null;managerGuideStep++;renderManagerGuide();$('manager-guide').showModal();}
const managerGuideDialog=document.createElement('dialog');managerGuideDialog.id='manager-guide';managerGuideDialog.setAttribute('aria-labelledby','manager-guide-title');managerGuideDialog.innerHTML='<p class="eyebrow">토투넘 · 감독의 첫 출근 <span id="manager-guide-progress"></span></p><h2 id="manager-guide-title" tabindex="-1"></h2><p id="manager-guide-copy"></p><div class="manager-guide-actions"><button id="manager-guide-next" type="button" class="primary"></button><button id="manager-guide-skip" type="button" class="secondary">건너뛰기</button></div><small>취임 면담 뒤에는 조작 안내를 건너뛸 수 있습니다. 설정에서 조작 안내를 다시 볼 수 있습니다.</small>';document.body.append(managerGuideDialog);
$('manager-guide-next').onclick=nextManagerGuide;$('manager-guide-skip').onclick=finishManagerGuide;
managerGuideDialog.addEventListener('cancel',event=>{if(managerGuideStep<2){event.preventDefault();return;}managerGuideActive=false;managerGuideWaiting=null;managerIntroBypass=true;rememberGuide();});
$('squad-overview-dialog').addEventListener('close',()=>{if(managerGuideWaiting==='squad')continueManagerGuide();});$('match-popup').addEventListener('close',()=>{if(managerGuideWaiting==='match')continueManagerGuide();});
// Replay belongs to settings; ordinary first play offers the tour automatically.
const guideHelp=document.createElement('button');guideHelp.type='button';guideHelp.id='manager-help';guideHelp.textContent='처음 안내 다시 보기';guideHelp.onclick=()=>{closeMatchPopup();openManagerGuide(2);};$('match-popup-settings').append(guideHelp);
// Resume the tour once the existing loading state has completed its home render.
const originalShellRender=renderAppShell;renderAppShell=function(){originalShellRender();if(managerGuideActive&&managerGuideWaiting==='home'&&appSessionStarted&&!launchBusy){managerGuideWaiting='arrival';const arrival=typeof ClubStory!=='undefined'?ClubStory.read(season).pending.find(e=>e.key==='arrival'):null;if(arrival&&typeof openClubStory==='function')openClubStory(arrival.id,$('launch-continue'),true);else completeManagerArrival();}};

// Fictional chapter prose follows confirmed season progress, never adds receipts.
function managerStoryChapter(s){
 const rounds=S.roundCountForYear(s,s.year);
 if(s.final){const moved=s.rules==='five-tier'&&s.division>1&&s.rank<=2;return [moved?'승격을 확정한 밤':'마지막 휘슬 뒤의 감독실',moved?'최종 '+s.rank+'위로 한 단계 승격을 확정했습니다. 라커룸의 환호가 끝나면 더 강한 상대와 새 예산을 맞을 준비가 시작됩니다. 다음 시즌 이동은 감독이 결산에서 직접 결정합니다.':s.rules==='five-tier'&&s.division<5&&s.rank>=7?'최종 '+s.rank+'위 · 재건의 시간':'시즌 일정표의 마지막 칸이 채워졌습니다. 최종 '+s.rank+'위의 이유를 전술·체력·선수 성장 기록에서 되짚고, 다음 시즌의 답을 찾아보세요.'];}
 if(s.rules==='five-tier'&&s.division===1)return ['네 번의 승격 끝에, 다시 1부','터널 밖의 함성이 전보다 커졌습니다. 5부에서 출발한 토투넘이 네 계단을 올라 1부 일정표를 받아 들었습니다. “우리를 올려 보낸 축구를 잊지 맙시다.” 이제 목표는 잔류를 넘어 1부에서 우리 자리를 만드는 것입니다.'];
 if(s.rules==='five-tier'&&s.division===5&&s.played===0&&s.previous?.nextDivision===5&&s.previous.division===4)return ['강등 후 재건 · 내셔널 리그','지난 시즌 '+s.previous.rank+'위로 한 단계 내려왔습니다. 선수들의 자신감과 구단 재정을 추슬러야 합니다. 이번 목표는 상위 두 팀에 들어 곧바로 되돌아가는 것입니다. 46경기 동안 다시 증명하세요.'];
 if(s.rules==='five-tier'&&s.division===5&&s.played===0&&s.previous?.division===5)return ['다시 쓰는 내셔널 리그','지난 시즌 승격을 이루지 못했습니다. 같은 리그에서 다시 시작하지만 선수단은 한 시즌 더 경험을 쌓았습니다. 이번에는 46경기 끝에 상위 두 팀 안에 들어 한 계단 올라가야 합니다.'];
 if(s.rules==='five-tier'&&s.division<5){const tier=S.divisionInfo({division:s.division,rules:s.rules}).name,prior=s.previous;let title=tier+' · 다음 계단의 시험',opening;
  if(s.played===0&&prior?.nextDivision===s.division&&prior.nextDivision<prior.division){title='승격의 대가 · '+tier;opening='지난 시즌 '+prior.rank+'위로 승격했습니다. 축하는 끝났고 상대의 수준과 기대도 함께 올라갔습니다. 남은 자원으로 선수단을 지키며 상위 두 팀에 다시 들어야 합니다.';}
  else if(s.played===0&&prior?.nextDivision===s.division&&prior.nextDivision===prior.division){title='재도전 · '+tier+'에서 다시';opening='지난 시즌 '+prior.rank+'위로 승격 문턱을 넘지 못했습니다. 익숙한 리그에서 다시 시작하지만, 같은 방식이 통한다는 보장은 없습니다. 선수단을 점검하고 부족했던 승점을 되찾으세요.';}
  else if(s.played===0&&prior?.nextDivision===s.division&&prior.nextDivision>prior.division){title='강등 후 재건 · '+tier;opening='지난 시즌 '+prior.rank+'위로 한 단계 내려왔습니다. 잃은 자신감과 자원을 추슬러야 합니다. 첫 과제는 승격보다 구단의 균형을 되찾는 일입니다.';}
  else opening=s.played===0?'지난 시즌의 결과를 다음 단계의 출발점으로 삼습니다. 더 강한 상대와 긴 '+rounds+'경기 일정 속에서 상위 두 팀에 들어야 승격할 수 있습니다.':'이제 '+tier+'의 순위표가 여정의 다음 장을 쓰고 있습니다. 상대 전력과 선수 컨디션을 살피며 상위 두 팀을 추격하세요.';
  return [title,opening];}
 if(s.division===1)return ['다시 만난 큰 무대','터널 밖의 함성이 전보다 커졌습니다. 토투넘은 이제 1부의 일정표를 받아 들었습니다. “우리를 올려 보낸 축구를 잊지 맙시다.” 코치가 다음 상대 보고서를 책상에 놓습니다.'];
 if(s.played>=10)return ['끝이 보이는 승격 레이스','훈련장 게시판에서 남은 일정이 손에 꼽히기 시작합니다. 구단주는 순위표를, 의무 코치는 선수들의 체력을 바라봅니다. 지금의 한 번의 교체와 한마디가 남은 경기에 이어집니다.'];
 if(s.played>=5)return ['감독의 말에 무게가 생겼다','처음에는 당신을 낯설게 바라보던 선수들이 이제 전술판 앞에 먼저 모입니다. 하지만 모든 선수가 같은 표정은 아닙니다. 선수 보고서와 최근 경기 기록을 확인하고, 지금 필요한 말을 골라보세요.'];
 if(s.played>0)return ['첫 휘슬 이후','결과표가 감독실 벽에 붙었습니다. 수석 코치는 다음 경기의 준비를 묻습니다. “한 경기로 우리의 이야기가 끝나진 않습니다.” 출전 기록과 회복 상태를 살펴보고 다음 선발을 결정하세요.'];
 return [s.rules==='five-tier'?'첫 장 · 5부에서 시작하는 귀환':'첫 장 · 강등된 명문에 도착하다',s.rules==='five-tier'?'비 내리는 훈련장에서 손헝민이 공을 내려놓습니다. “감독님, 다시 올라갈 수 있겠죠?” 토투넘은 5부 내셔널 리그, 24개 구단과 46경기의 긴 시즌에서 시작합니다. 목표는 단순한 우승이 아닙니다. 상위 2팀 안에 들어 한 계단씩 올라가고, 네 번의 승격으로 1부에 돌아가는 것입니다. 선수단과 체력을 살피고 전술을 정해 첫 원정에 나서세요.':'비 내리는 훈련장에서 손헝민이 공을 내려놓습니다. “감독님, 다시 올라갈 수 있겠죠?” 선수단을 살펴보고 전술과 첫 팀 대화로 당신의 답을 들려주세요.'];
}
