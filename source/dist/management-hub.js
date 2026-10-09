// Management screens show a compact entry surface; existing controls live in
// one bounded dialog. Move the real nodes so their handlers and state survive.
const managementGroups={
 club:[['owner-board-panel','구단주 면담'],['club-story-panel','도착한 대화'],['club-life-panel','구단 소식'],['training-card','이번 주 훈련'],['manager-journey','감독의 여정'],['matchday-objectives','경기 목표'],['finance-summary','자금 현황'],['health-summary','몸 상태'],['suspensions-panel','징계 현황'],['club-overview','구단 정보'],['next-fixture','다음 상대'],['league-table','순위표'],['league-journey','승격 여정'],['last-round','지난 라운드'],['cup-summary','컵 현황'],['board-tasks','이사회 과제'],['season-fixtures','리그 일정']],
 squad:[['squad-overview','전체 선수'],['squad-health','몸 상태 · 휴식'],['individual-training','개인 훈련'],['staff-panel','코치진'],['squad-plans-panel','선수단 운영'],['player-records','시즌 기록']],
 market:[['transfer-search-panel','선수 찾기 · 영입'],['finance-plan-panel','영입 예산'],['finance-detail','재정 장부']],
 academy:[['academy-overview','유소년 발굴'],['academy-reports','스카우트 보고서'],['academy-tasks','육성 과제']],
 cup:[['season-calendar-panel','전체 일정'],['cup-overview','국내컵'],['cup-bracket','컵 대진표'],['europe-panel','챔피언스리그'],['trophy-room','우승 기록'],['season-review-panel','시즌 결산']]
};
const managementNames={club:'감독실',squad:'선수단',market:'영입 센터',academy:'유소년 센터',cup:'대회 센터'};
var managementActive=null,managementReturn=null,managementMount=null;
const managementDialog=document.createElement('dialog');managementDialog.id='management-dialog';managementDialog.setAttribute('aria-labelledby','management-title');
managementDialog.innerHTML='<header><div><small>감독의 업무</small><h2 id="management-title" tabindex="-1"></h2></div><button type="button" id="management-close" aria-label="관리 창 닫기">닫기</button></header><label class="management-switch" for="management-section">업무 선택<select id="management-section"></select></label><div id="management-content"></div>';
document.body.append(managementDialog);
function restoreManagementPanel(){if(managementMount){for(const item of managementMount)item.anchor.replaceWith(item.node);managementMount=null;}}
function showManagementSection(id){
 const choices=managementGroups[managementActive],entry=choices?.find(row=>row[0]===id);if(!entry||!$(id))return false;
 restoreManagementPanel();if(managementActive==='squad'){squadTab=id==='individual-training'?'training':id==='player-records'?'records':'health';}
 render();managementMount=[];for(const key of id==='transfer-search-panel'?[id,'market-overview']:[id]){const node=$(key),anchor=document.createComment('management-panel');node.before(anchor);managementMount.push({node,anchor});$('management-content').append(node);node.hidden=false;}if(id==='owner-board-panel')$(id).querySelector('details').open=true;
 $('management-title').textContent=entry[1];$('management-section').value=id;$('management-content').scrollTop=0;$('management-title').focus({preventScroll:true});return true;
}
function openManagementPanel(id,opener=document.activeElement){
 const group=Object.keys(managementGroups).find(key=>managementGroups[key].some(row=>row[0]===id));if(!group)return;
 if(managementDialog.open)managementDialog.close();if(view!==group)setView(group);pauseForPlanning();managementActive=group;managementReturn=opener;
 $('management-section').innerHTML=managementGroups[group].filter(row=>$(row[0])).map(([key,label])=>'<option value="'+key+'">'+label+'</option>').join('');
 if(showManagementSection(id)){managementDialog.showModal();$('management-title').focus({preventScroll:true});}
}
managementDialog.addEventListener('close',()=>{if(managementDialog.open)return;restoreManagementPanel();managementActive=null;const target=managementReturn;managementReturn=null;if(target?.isConnected&&!target.closest('[hidden]'))target.focus({preventScroll:true});});
$('management-close').onclick=()=>managementDialog.close();$('management-section').onchange=e=>showManagementSection(e.target.value);
for(const [group,entries] of Object.entries(managementGroups)){
 if(group==='club')entries.push(['coach-guide','연습 · 도움말']);
 for(const [id] of entries){const node=$(id);if(node)node.dataset.managedPanel='true';}
 const hub=document.createElement('section');hub.id='management-hub-'+group;hub.className='management-hub';hub.setAttribute('aria-label',managementNames[group]+' 업무');
 hub.innerHTML='<header><h2>'+managementNames[group]+'</h2><p>필요한 업무를 열어 확인하세요.</p></header><div class="management-entries">'+entries.slice(0,group==='club'?4:entries.length).map(([id,label])=>'<button type="button" data-management-open="'+id+'"><strong>'+label+'</strong><span>열기 →</span></button>').join('')+'</div>'+(group==='cup'?'<button type="button" data-management-league>리그 순위 · 전 경기</button>':'');
 hub.onclick=e=>{const b=e.target.closest('[data-management-open]');if(b)openManagementPanel(b.dataset.managementOpen,b);if(e.target.closest('[data-management-league]'))openLeagueCentre();};$(group+'-pane').append(hub);
}
document.body.classList.add('management-hub-ready');
$('market-overview').dataset.managedPanel='true';
const managementOriginalRender=render;render=function(){
 if(managementActive&&managementActive!==view)managementDialog.close();managementOriginalRender();
 document.body.classList.toggle('management-view',appSessionStarted&&Object.hasOwn(managementGroups,view));
 if(view==='club'&&appSessionStarted){const toggle=$('mobile-dashboard-toggle');if(toggle){toggle.textContent='구단 상세';toggle.setAttribute('aria-expanded','false');toggle.onclick=()=>openManagementPanel('manager-journey',toggle);}const primary=$('mobile-match-action');if(primary&&S.ready(season))primary.onclick=()=>openManagementPanel('season-review-panel',primary);const news=$('management-hub-club').querySelector('[data-management-open="club-life-panel"] span'),headline=ClubLife.news(season)[0]?.headline;if(news){news.textContent=headline||'첫 소식을 기다립니다';news.className='management-headline';}}
};
// Newly arrived dialogue appears once when returning home after a league round.
// Reading does not select an answer or mutate the campaign.
let managementMeetingKey='',managementMeetingQueued=false;
const managementShellRender=renderAppShell;renderAppShell=function(){managementShellRender();
 if(!appSessionStarted)document.body.classList.remove('management-view');
 if(!appSessionStarted||launchBusy||view!=='club'||managerGuideActive||season.round===0||managementMeetingQueued||document.querySelector('dialog[open]'))return;
 const key=season.seed+':'+season.year+':'+season.round;if(key===managementMeetingKey)return;
 const next=storyInboxPriority(ClubStory.read(season).pending).find(e=>e.round===season.round&&e.key!=='arrival');if(!next)return;
 managementMeetingQueued=true;requestAnimationFrame(()=>{managementMeetingQueued=false;if(view!=='club'||!appSessionStarted||document.querySelector('dialog[open]'))return;managementMeetingKey=key;openClubStory(next.id,$('mobile-match-action'));});
};
