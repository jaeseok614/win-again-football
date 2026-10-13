// These entry screens read confirmed campaign records and reuse the real editors.
let competitionTab='league',competitionPage=0,tacticsReturn=false;
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
function competitionTableMarkup(model,page,size){
 const rows=model.table.slice(page*size,(page+1)*size),esc=escapeText;
 return '<table class="competition-table"><caption>'+esc(model.league)+' · '+model.throughRound+'라운드 확정 기록</caption><colgroup><col class="rank"><col class="club">'+Array(8).fill('<col>').join('')+'</colgroup><thead><tr>'+['위','구단','경기','승','무','패','득','실','차','점'].map(x=>'<th scope="col">'+x+'</th>').join('')+'</tr></thead><tbody>'+rows.map(c=>'<tr class="'+(c.own?'our-club ':'')+(c.zone||'')+'"><td>'+(model.throughRound?c.rank:'—')+'</td><th scope="row">'+esc(c.short)+'</th>'+[c.played,c.won,c.drawn,c.lost,c.gf,c.ga,c.gd,c.points].map(n=>'<td>'+n+'</td>').join('')+'</tr>').join('')+'</tbody></table>';
}
function competitionBracketMarkup(){
 const esc=escapeText,cup=season.cup;if(!cup.enabled)return '<p>이번 시즌 국내컵에 참가하지 않습니다.</p>';
 return '<div class="competition-bracket">'+P.stageNames.map((name,stage)=>{
 const fixtures=P.fixturesFor(season,stage);return '<section><h3>'+name+'</h3><div class="bracket-round">'+Array.from({length:[4,2,1][stage]},(_,index)=>{
 const fixture=fixtures[index],r=cup.results.find(r=>r.stage===stage&&r.index===index);
 return '<article class="bracket-pair" aria-label="'+name+' '+(index+1)+'경기">'+['home','away'].map((side,i)=>{const id=fixture?.[side];return '<div class="'+(id===S.own?'our-club ':'')+(r&&r.winner===id?'winner':'')+'"><span>'+esc(id?S.club(id).short:P.stageNames[stage-1]+' '+(index*2+i+1)+' 승자')+'</span><b>'+(r?r.goals[i]:'—')+'</b></div>';}).join('')+(r?.penalties?'<small>승부차기 '+r.penalties.join(':')+'</small>':'')+'</article>';
 }).join('')+'</div></section>';
 }).join('')+'</div><p class="centre-note">굵은 글씨는 승자 · 점수는 확정 결과만 표시</p>';
}
function renderCompetitionCentre(){
 const host=$('competition-centre'),model=LeagueCentre.read(season),me=model.table.find(c=>c.own),esc=escapeText;
 // Three rows on very short landscape; six on phones. All clubs are page-accessible.
 const size=innerHeight<=450?3:6,pages=Math.ceil(model.table.length/size);competitionPage=Math.min(competitionPage,pages-1);
 host.innerHTML='<header class="centre-heading"><h2>대회 센터</h2><p>'+esc(model.league)+' · '+(model.throughRound?me.rank+'위':'개막 전')+' · '+me.points+'점 · '+me.played+'/'+model.rounds+'경기 · '+me.won+'승 '+me.drawn+'무 '+me.lost+'패</p></header><nav class="competition-tabs" aria-label="대회 선택">'+[['league','리그 순위'],['cup','컵 대진'],['europe','유럽 대회']].map(([key,label])=>'<button type="button" data-competition-tab="'+key+'" aria-pressed="'+(competitionTab===key)+'">'+label+'</button>').join('')+'</nav><div class="competition-surface">'+(competitionTab==='league'?competitionTableMarkup(model,competitionPage,size)+'<div class="competition-paging"><button type="button" data-competition-page="-1" '+(!competitionPage?'disabled':'')+'>이전</button><span>'+(competitionPage+1)+' / '+pages+'</span><button type="button" data-competition-page="1" '+(competitionPage===pages-1?'disabled':'')+'>다음</button></div><p class="centre-note">득: 득점 · 실: 실점 · 차: 득실차 · 점: 승점<br>초록: 우리 팀 / 승격권 · 붉은색: 강등권</p>':competitionTab==='cup'?'<p class="centre-status">'+esc(cupStatus())+'</p>'+competitionBracketMarkup():'<section class="competition-europe"><h3>챔피언스리그</h3><p>'+esc(europeStatus())+'</p><p>조별리그 → 준결승 → 결승</p><button type="button" data-centre-report="europe-panel">조별 순위 · 대진 · 결과</button></section>')+'</div><div class="competition-links"><button type="button" data-centre-rounds>리그 전 경기</button><button type="button" data-centre-report="season-calendar-panel">전체 일정</button><button type="button" data-centre-report="season-review-panel">시즌 성적</button></div>';
 host.querySelectorAll('[data-competition-tab]').forEach(b=>b.onclick=()=>{competitionTab=b.dataset.competitionTab;renderCompetitionCentre();host.querySelector('[data-competition-tab="'+competitionTab+'"]').focus({preventScroll:true});});
 host.querySelectorAll('[data-competition-page]').forEach(b=>b.onclick=()=>{competitionPage+=Number(b.dataset.competitionPage);renderCompetitionCentre();});
 host.querySelectorAll('[data-centre-report]').forEach(b=>b.onclick=()=>openManagementPanel(b.dataset.centreReport,b));host.querySelector('[data-centre-rounds]').onclick=()=>openLeagueCentre();
}
const competitionCentre=document.createElement('section');competitionCentre.id='competition-centre';$('cup-pane').prepend(competitionCentre);
const centresRender=render;render=function(){centresRender();const back=$('match-popup').querySelector('.match-popup-footer button');if(back)back.textContent=tacticsReturn?'전술 센터로 돌아가기':'경기로 돌아가기';if(!appSessionStarted)return;if(view==='tactics'){document.body.classList.add('management-view');renderTacticsCentre();}if(view==='cup')renderCompetitionCentre();};
window.addEventListener('resize',()=>{if(appSessionStarted&&view==='cup')renderCompetitionCentre();});
