// These entry screens read confirmed campaign records and reuse the real editors.
let competitionTab='league',tacticsReturn=false;
function openTacticsEditor(kind,opener){
 if(!state)return;tacticsReturn=true;setView('match');openMatchPopup(kind,opener);
}
$('match-popup').addEventListener('close',()=>{
 if($('match-popup').open||!tacticsReturn)return;tacticsReturn=false;
 if(view==='match'){setView('tactics');$('tactics-pane').querySelector('button')?.focus({preventScroll:true});}
});
function renderTacticsCentre(){
 const host=$('tactics-pane');if(!state){host.innerHTML='<h2>전술 센터</h2><p>시즌 결산 후 다음 경기의 전술을 준비할 수 있습니다.</p>';return;}
 const roles=SetPieceRoom.read(state,{preferences:season.plan.setPieces}),esc=escapeText;
 host.innerHTML='<header class="centre-heading"><h2>전술 센터</h2><p>'+state.formation.split('').join('-')+' · '+esc(labels[state.tactic])+' · '+esc(F.attackFocuses[F.attackFocus(state)])+'</p></header><div class="tactics-centre-grid">'+[
 ['tactics','포메이션 · 경기 지시','선수 배치, 압박·역습, 공격 방향'],['lineup','선발 · 역할 적합도','코치 추천과 포메이션 비교'],['setpieces','세트피스 · 주 키커','코너킥, 프리킥, 문전 타깃'],['analysis','상대 대응 · 전술 분석','상대와 비교하고 전술 효과 확인']
 ].map(([kind,title,note])=>'<button type="button" data-tactics-editor="'+kind+'" '+(kind==='analysis'&&state.phase==='full'?'disabled':'')+'><strong>'+title+'</strong><span>'+note+'</span></button>').join('')+'</div><section class="tactics-takers"><h3>현재 세트피스 담당</h3>'+ (roles?roles.roles.map(r=>'<div><span>'+esc(r.label)+'</span><strong>'+esc(r.selected?.name||'미정')+'</strong><small>지표 '+(r.selected?.score??'—')+'</small></div>').join(''):'<p>다음 경기 준비 중</p>')+'</section><p class="centre-note">'+(state.phase==='prep'?'담당을 선택하면 다음 경기에도 우선 적용됩니다. 결장·교체 시 출전 선수로 대체합니다.':'경기는 일시 정지됩니다. 키커 변경은 킥오프 전에, 경기 지시는 진행 중에도 가능합니다.')+'</p>';
 host.querySelectorAll('[data-tactics-editor]').forEach(b=>b.onclick=()=>openTacticsEditor(b.dataset.tacticsEditor,b));
}
function competitionBracketMarkup(){
 const esc=escapeText,cup=season.cup;if(!cup.enabled)return '<p>이번 시즌 국내컵에 참가하지 않습니다.</p>';
 return '<div class="competition-bracket">'+P.stageNames.map((name,stage)=>{
 const fixtures=P.fixturesFor(season,stage);return '<section><h3>'+name+'</h3><div class="bracket-round">'+Array.from({length:[4,2,1][stage]},(_,index)=>{
 const fixture=fixtures[index],r=cup.results.find(r=>r.stage===stage&&r.index===index);
 return '<article class="bracket-pair" aria-label="'+name+' '+(index+1)+'경기">'+['home','away'].map((side,i)=>{const id=fixture?.[side];return '<div class="'+(id===S.own?'our-club ':'')+(r&&r.winner===id?'winner':'')+'"><span>'+(id?clubMark(S.club(id)):'<span class="crest-pending" aria-hidden="true">?</span>')+esc(id?S.club(id).short:P.stageNames[stage-1]+' '+(index*2+i+1)+' 승자')+'</span><b>'+(r?r.goals[i]:'—')+'</b></div>';}).join('')+(r?.penalties?'<small>승부차기 '+r.penalties.join(':')+'</small>':'')+'</article>';
 }).join('')+'</div></section>';
 }).join('')+'</div><p class="centre-note">굵은 글씨는 승자 · 점수는 확정 결과만 표시</p>';
}
var competitionEuropeMount=null,competitionEuropeStage=null;
function restoreCompetitionEurope(){if(!competitionEuropeMount)return;competitionEuropeMount.anchor.replaceWith(competitionEuropeMount.node);competitionEuropeMount=null;}
function renderCompetitionCentre(){
 restoreCompetitionEurope();
 const host=$('competition-centre'),model=LeagueCentre.read(season,{round:leagueCentreRound,clubId:leagueCentreClub}),me=model.table.find(c=>c.own),esc=escapeText,league=competitionTab==='league';
 host.innerHTML='<header class="centre-heading"><h2>대회 센터</h2><p>'+esc(model.league)+' · '+(model.throughRound?me.rank+'위':'개막 전')+' · '+me.points+'점 · '+me.played+'/'+model.rounds+'경기</p></header><nav class="competition-tabs" aria-label="대회 선택">'+[['league','리그 순위·일정'],['cup','컵 대진'],['europe','유럽 대회']].map(([key,label])=>'<button type="button" data-competition-tab="'+key+'" aria-pressed="'+(competitionTab===key)+'">'+label+'</button>').join('')+'</nav><div class="competition-surface">'+(league?leagueWorkspaceMarkup(model,'competition-league',false):competitionTab==='cup'?'<p class="centre-status">'+esc(cupStatus())+'</p>'+competitionBracketMarkup():'<section id="competition-europe-workspace"></section>')+'</div><footer class="competition-links">'+(league?leagueWorkspaceFooter(model,'competition-league'):'')+'<div class="competition-extra-actions"><button type="button" data-centre-report="season-calendar-panel">전체 일정</button><button type="button" data-centre-report="season-review-panel">시즌 성적</button></div></footer>';
 host.querySelectorAll('[data-competition-tab]').forEach(b=>b.onclick=()=>{competitionTab=b.dataset.competitionTab;renderCompetitionCentre();host.querySelector('[data-competition-tab="'+competitionTab+'"]').focus({preventScroll:true});});
 host.querySelectorAll('[data-centre-report]').forEach(b=>b.onclick=()=>openManagementPanel(b.dataset.centreReport,b));
 if(league)bindLeagueWorkspace(host,model,'competition-league',renderCompetitionCentre,()=>{setView('match');$('primary')?.focus({preventScroll:true});});
 else if(competitionTab==='europe'){const node=$('europe-panel'),anchor=document.createComment('competition-europe');node.before(anchor);competitionEuropeMount={node,anchor};$('competition-europe-workspace').append(node);node.hidden=false;const fixtures=node.querySelector('.europe-fixtures');if(fixtures){fixtures.open=true;const filter=document.createElement('label');filter.className='europe-stage-filter';filter.textContent='대회 단계';const select=document.createElement('select');select.setAttribute('aria-label','유럽 대회 단계');select.innerHTML=Europe.stageNames.map((n,i)=>'<option value="'+i+'">'+escapeText(n)+'</option>').join('');if(competitionEuropeStage===null)competitionEuropeStage=Math.min(season.europe.stage,Europe.stageNames.length-1);select.value=competitionEuropeStage;filter.append(select);fixtures.querySelector('summary').after(filter);const show=()=>{competitionEuropeStage=Number(select.value);fixtures.querySelectorAll('.europe-stage').forEach((n,i)=>n.hidden=i!==competitionEuropeStage);};select.onchange=show;show();}}
}

const competitionCentre=document.createElement('section');competitionCentre.id='competition-centre';$('cup-pane').prepend(competitionCentre);
const centresRender=render;render=function(){if(view!=='cup')restoreCompetitionEurope();centresRender();const back=$('match-popup').querySelector('.match-popup-footer button');if(back)back.textContent=tacticsReturn?'전술 센터로 돌아가기':'경기로 돌아가기';if(!appSessionStarted)return;if(view==='tactics'){document.body.classList.add('management-view');renderTacticsCentre();}if(view==='cup')renderCompetitionCentre();};
window.addEventListener('resize',()=>{if(appSessionStarted&&view==='cup')renderCompetitionCentre();});
