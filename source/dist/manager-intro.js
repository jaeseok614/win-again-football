// Optional onboarding is a device preference, never part of simulation or saves.
var managerIntroBypass=false,managerGuideStep=0,managerGuideWaiting=null,managerGuideActive=false;
const managerGuideKey='win-again-manager-guide-v1';
const managerGuideSteps=[
 ['눈을 뜨니, 감독실이었다','낯선 감독실. 책상 위 계약서에 내 이름이 적혀 있다.\n\n‘경기를 보다가 눈을 감았는데… 내가 감독이라고?’\n\n수석 코치: “감독님, 구단주가 기다립니다.”','구단주실로'],
 ['추락한 구단, 남아 있는 사람들','복도에는 빛바랜 토투넘의 우승 사진. 그 아래는 5부 일정표다.\n\n코치: “24팀, 46경기. 상위 두 팀이 올라갑니다.”\n\n‘네 번의 승격. 이번에는 내 결정으로.’','면담 시작'],
 ['1. 내 선수 알아보기','수석 코치: “먼저 함께 뛸 선수부터 만나시죠.”\n\n종합은 선수의 능력, 체력은 남은 힘, 컨디션은 현재 상태입니다. 이름을 눌러 세부 능력과 성격을 살펴보세요.\n\n화면 아래 ‘다음: 전술’로 이어갑니다.','전체 선수단 보기'],
 ['2. 경기 전 전술 준비','수석 코치: “처음부터 전부 바꿀 필요는 없습니다.”\n\n포메이션의 기본 배치를 살펴보고, 공격 방식에서 크로스·돌파·패스 연계를 고를 수 있습니다. 유니폼은 표시된 9구역 안에서 옮깁니다.\n\n확인만 해도 괜찮습니다. 아래 ‘다음: 대화’를 누르세요.','전술 창 열기'],
 ['3. 선수에게 한마디','수석 코치: “같은 말도 선수마다 다르게 받아들입니다.”\n\n격려·칭찬·분발 요구·침착하게 중 하나를 선택하면 실제 반응이 공개됩니다. 경기 전·하프타임·65분에 한 번씩 말할 수 있습니다.\n\n지금 말하지 않아도 ‘다음: 경기’로 넘어갈 수 있습니다.','선수 대화 열기'],
 ['4. 첫 경기 준비 완료','킥오프를 누르면 양 팀 선발과 핵심 선수를 먼저 확인합니다. 상대 확인 뒤에 경기가 시작됩니다.\n\n0.5·1·2·4배속으로 관전하고, 전술·교체를 열면 잠시 멈춥니다. 전반 종료에는 라커룸에서 다시 판단하세요.\n\n종료 후 ‘결과 확정’으로 다음 일정에 도전합니다.','안내 완료 · 경기 화면으로']
];
function guideSeen(){try{return localStorage.getItem(managerGuideKey)==='done';}catch{return false;}}
function rememberGuide(){try{localStorage.setItem(managerGuideKey,'done');}catch{}}
function offerManagerIntro(){if(managerIntroBypass)return false;const first=season.year===1&&season.round===0&&state?.phase==='prep',arrival=typeof ClubStory!=='undefined'?ClubStory.read(season).pending.some(e=>e.key==='arrival'):!restoredSave.payload&&!launchHasCampaign;if(!first||!arrival)return false;openManagerGuide(0);return true;}
function renderManagerGuide(){const [title,copy,label]=managerGuideSteps[managerGuideStep];$('manager-guide-art').hidden=managerGuideStep>=2;if(managerGuideStep<2&&typeof ClubArt!=='undefined')$('manager-guide-art').innerHTML=(managerGuideStep===1?ClubArt.memory('arrival'):season.rebirth?.attempt>1?ClubArt.memory('rebirth'):ClubArt.manager())+'<div class="arrival-caption"><b>'+(season.rebirth?.attempt>1?season.rebirth.attempt+'번째 삶':'나의 첫 번째 시즌')+'</b><span>5부 · 토투넘 · 네 번의 승격</span></div>';$('manager-guide-title').textContent=title;$('manager-guide-copy').textContent=copy;$('manager-guide-next').textContent=label;$('manager-guide-skip').hidden=managerGuideStep<2;$('manager-guide-back').hidden=managerGuideStep<3;$('manager-guide-progress').textContent=managerGuideStep<2?'첫 출근 · '+(managerGuideStep+1)+' / 2':'조작 안내 · '+(managerGuideStep-1)+' / 4';$('manager-guide-title').focus({preventScroll:true});}
function openManagerGuide(step=2){pauseForPlanning();managerGuideStep=step;managerGuideWaiting=null;managerGuideActive=true;renderManagerGuide();if(!$('manager-guide').open)$('manager-guide').showModal();$('manager-guide-title').focus({preventScroll:true});}
function clearManagerGuideControls(){for(const id of ['squad-overview-dialog','match-popup']){const host=$(id);host.classList.remove('manager-guided');host.querySelector('.manager-guide-rail')?.remove();}}
function closeManagerGuideReport(){const id=managerGuideWaiting==='squad'?'squad-overview-dialog':managerGuideWaiting==='match'?'match-popup':null;managerGuideWaiting=null;clearManagerGuideControls();if(id&&$(id).open)$(id).close();}
function finishManagerGuide(){if(managerGuideStep<2)return;managerGuideActive=false;closeManagerGuideReport();managerIntroBypass=true;rememberGuide();$('manager-guide').close();if(!appSessionStarted)enterManagerHome();else{if(managerGuideStep===5){view='match';render();}$('primary')?.focus({preventScroll:true});}}
function backManagerGuide(){if(!managerGuideActive||managerGuideStep<2)return;const step=Math.max(2,managerGuideStep-1);closeManagerGuideReport();openManagerGuide(step);}
function advanceManagerGuideReport(){if(!managerGuideActive||!['squad','match'].includes(managerGuideWaiting))return;const step=managerGuideStep;closeManagerGuideReport();openManagerGuide(Math.min(5,step+1));}
function mountManagerGuideControls(){
 const host=$(managerGuideWaiting==='squad'?'squad-overview-dialog':'match-popup'),footer=host.querySelector('footer');if(!footer)return;
 clearManagerGuideControls();host.classList.add('manager-guided');const rail=document.createElement('div');rail.className='manager-guide-rail';rail.setAttribute('aria-label','조작 안내 진행');
 const prompts={2:'이름을 누르면 능력과 성격을 볼 수 있어요.',3:'기본 배치를 확인하세요. 변경은 선택입니다.',4:'선택 후 반응 공개 · 말하지 않아도 다음으로'};
 rail.innerHTML='<p>안내 '+(managerGuideStep-1)+'/4 · '+prompts[managerGuideStep]+'</p><div><button type="button" data-guide-back>이전</button><button type="button" class="primary" data-guide-forward>다음: '+({2:'전술',3:'대화',4:'경기'}[managerGuideStep])+' →</button><button type="button" data-guide-skip>건너뛰기</button></div>';
 footer.append(rail);rail.querySelector('[data-guide-back]').onclick=backManagerGuide;rail.querySelector('[data-guide-forward]').onclick=advanceManagerGuideReport;rail.querySelector('[data-guide-skip]').onclick=finishManagerGuide;
}
function completeManagerArrival(){managerGuideWaiting=null;managerGuideStep=2;if(guideSeen())finishManagerGuide();else openManagerGuide(2);}
function nextManagerGuide(){
 if(managerGuideStep===0){managerGuideStep=1;renderManagerGuide();return;}
 if(managerGuideStep===1){managerIntroBypass=true;$('manager-guide').close();managerGuideWaiting='home';enterManagerHome();return;}
 if(managerGuideStep===5){finishManagerGuide();return;}
 const step=managerGuideStep;$('manager-guide').close();managerGuideWaiting=step===2?'squad':'match';
 if(step===2){openSquadOverview($('launch-continue'));}
 else{view='match';render();openMatchPopup(step===3?'tactics':'talk',$('primary'));}
 mountManagerGuideControls();
}
function continueManagerGuide(){if(!managerGuideActive||!['squad','match'].includes(managerGuideWaiting))return;const host=$(managerGuideWaiting==='squad'?'squad-overview-dialog':'match-popup');if(host.open)return;managerGuideWaiting=null;clearManagerGuideControls();renderManagerGuide();$('manager-guide').showModal();}
const managerGuideDialog=document.createElement('dialog');managerGuideDialog.id='manager-guide';managerGuideDialog.setAttribute('aria-labelledby','manager-guide-title');managerGuideDialog.innerHTML='<p class="eyebrow">토투넘 · 감독의 첫 출근 <span id="manager-guide-progress"></span></p><div id="manager-guide-art">'+(typeof ClubArt!=='undefined'?ClubArt.manager():'')+'<div class="arrival-caption"><b>나의 첫 번째 시즌</b><span>5부 · 토투넘 · 네 번의 승격</span></div></div><h2 id="manager-guide-title" tabindex="-1"></h2><p id="manager-guide-copy"></p><div class="manager-guide-actions"><button id="manager-guide-back" type="button" class="secondary">이전 단계</button><button id="manager-guide-next" type="button" class="primary"></button><button id="manager-guide-skip" type="button" class="secondary">건너뛰기</button></div><small>취임 면담 뒤에는 조작 안내를 건너뛸 수 있습니다. 설정에서 조작 안내를 다시 볼 수 있습니다.</small>';document.body.append(managerGuideDialog);
$('manager-guide-back').onclick=backManagerGuide;$('manager-guide-next').onclick=nextManagerGuide;$('manager-guide-skip').onclick=finishManagerGuide;
managerGuideDialog.addEventListener('cancel',event=>{event.preventDefault();if(managerGuideStep>=2)finishManagerGuide();});
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
