// The title menu is presentation state only. Keep it out of campaign exports.
var appSessionStarted=false,launchBusy=false,launchError='',launchHasCampaign=false;
function renderAppShell(){
 const menu=$('launch-screen');if(!menu)return;
 menu.hidden=appSessionStarted;document.querySelector('.app').hidden=!appSessionStarted;
 document.body.classList.toggle('launch-mode',!appSessionStarted);
 const hasSavedCampaign=!!(restoredSave.payload||launchHasCampaign),legacyCampaign=hasSavedCampaign&&season.startingClub!=='tottunham';
 const info=$('launch-campaign');
 if(info)info.textContent=saveRecovery.isBlocked()?'이전 저장 원본을 보호 중입니다. 저장 불러오기에서 확인하세요.':legacyCampaign?'옛 선수단은 직전 구단으로 보관됩니다. 새 감독 생활은 토투넘 선수들과 5부에서 시작합니다.':season.year+'시즌 · '+S.divisionInfo(season).name+' · '+(S.ready(season)?'시즌 종료':season.competition==='cup'?'국내컵':season.competition==='europe'?'챔피언스리그':(season.round+1)+'라운드')+(state?.minute?' · '+state.minute+'분에서 이어서':'');
 const button=$('launch-continue');if(button){button.disabled=launchBusy;button.textContent=launchBusy?'감독실 준비 중…':legacyCampaign?'토투넘으로 새로 시작하기':hasSavedCampaign?'내 토투넘 구단 이어서 하기':'토투넘 감독 생활 시작하기';}
 const progress=$('launch-progress');if(progress)progress.hidden=!launchBusy;
 const error=$('launch-error');if(error){error.hidden=!launchError;error.textContent=launchError;}
}
function handleLaunchContinue(){
 if(launchBusy||appSessionStarted)return;
 if((restoredSave.payload||launchHasCampaign)&&season.startingClub!=='tottunham'){
  if(typeof startFiveTierCampaign==='function'&&startFiveTierCampaign()){renderAppShell();enterManagerHome();}
  return;
 }
 enterManagerHome();
}
function enterManagerHome(){
 if(launchBusy||appSessionStarted)return;if(typeof offerManagerIntro==='function'&&offerManagerIntro())return;launchBusy=true;launchError='';renderAppShell();
 // Let the loading state paint before rendering the management screens.
 requestAnimationFrame(()=>setTimeout(()=>{
  try{appSessionStarted=true;view='club';pauseForPlanning();save();render();launchHasCampaign=true;window.scrollTo({top:0,behavior:'instant'});$('mobile-match-action')?.focus({preventScroll:true});}
  catch(error){appSessionStarted=false;launchError='감독실을 열지 못했습니다. '+error.message+' 다시 시도해 주세요.';}
  finally{launchBusy=false;renderAppShell();}
 },0));
}
function returnToTitle(){
 if(typeof closeMatchPopup==='function')closeMatchPopup();
 pauseForPlanning();cancelMovementPreview();save();appSessionStarted=false;launchBusy=false;renderAppShell();$('launch-continue')?.focus({preventScroll:true});
}
document.getElementById('launch-continue').onclick=handleLaunchContinue;
document.getElementById('launch-import').onclick=()=>openPortability();
document.querySelector('.brand').onclick=event=>{event.preventDefault();returnToTitle();};
