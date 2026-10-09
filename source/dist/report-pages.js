// Presentation-only pages: move original controls without changing campaign data.
const reportPagesState={player:'기본 능력',opponent:'능력 비교',tactics:'배치',analysis:'전개 보기'};
function reportDeck(host,entries,key,before){
 const control=document.createElement('select');control.className='report-page-select';control.setAttribute('aria-label','보고서 항목 선택');
 const body=document.createElement('div');body.className='report-page-body';
 const pages=entries.filter(e=>e[1].filter(Boolean).length).map(([label,nodes])=>{const page=document.createElement('section');page.className='report-page';page.setAttribute('aria-label',label);for(const n of nodes.filter(Boolean))page.append(n);body.append(page);const option=document.createElement('option');option.textContent=label;option.value=label;control.append(option);return {label,page};});
 host.insertBefore(control,before||null);host.insertBefore(body,before||null);
 const show=()=>{reportPagesState[key]=control.value;for(const p of pages)p.page.hidden=p.label!==control.value;body.scrollTop=0;};
 control.value=pages.some(p=>p.label===reportPagesState[key])?reportPagesState[key]:pages[0].label;control.onchange=show;show();return body;
}
function playerReportPages(){
 const host=$('player-detail-dialog').querySelector('.player-detail-content');if(!host)return;
 host.classList.add('report-screen');const q=s=>host.querySelector(s),all=s=>[...host.querySelectorAll(s)],entries=[];
 entries.push(['기본 능력',[q('.detail-skills'),q('.detail-condition')]],['선수 소개',[q('.detail-intro'),q('.detail-quote'),q('.detail-summary')]],['주발 · 컨디션',[q('.player-traits-top')]]);
 for(const group of all('.player-position-groups>div'))entries.push(['포지션 · '+group.querySelector('h4').textContent,[group]]);
 for(const group of all('.fm-attribute-groups>section')){const title=group.querySelector('h4').textContent,rows=[...group.querySelectorAll(':scope>div')];for(let i=0;i<rows.length;i+=6){const part=document.createElement('section');part.className='report-attributes';const heading=document.createElement('h3');heading.textContent=title+' · 1–20'+(rows.length>6?' · '+(i/6+1)+'/2':'');part.append(heading,...rows.slice(i,i+6));entries.push([title+(rows.length>6?' '+(i/6+1):''),[part]]);}}
 entries.push(['플레이 유형',[q('.scouting-profile>header'),q('.scouting-radar')]],['역할 평가',[q('.scouting-role-selector'),q('.scouting-role-note'),q('.scouting-use')]],['시즌 기록',[q('.detail-records')]],['성장 · 훈련',[q('.detail-growth')]],['평가 기준',[q('.scouting-disclosure'),q('.fm-attributes>p:last-child'),q('.player-traits-report>p')]]);
 const basis=entries.find(e=>e[0]==='평가 기준');basis[1].push(q('.detail-skills>p'),q('.detail-records>p'));
 const nav=q('.detail-navigation');reportDeck(host,entries,'player',nav);
 for(const node of all(':scope>.scouting-profile,:scope>.player-traits-report,:scope>.fm-attributes,:scope>.detail-columns'))node.remove();
}
const pagedPlayerRender=renderPlayerDetails;renderPlayerDetails=function(d){pagedPlayerRender(d);playerReportPages();};
const pagedPlayerRoute=routePlayerDetails;routePlayerDetails=function(){const d=PlayerDetails.read(season,playerDetailIdentity);pagedPlayerRoute();if(d.valid&&typeof openManagementPanel==='function')openManagementPanel(d.owned?'individual-training':d.source==='academy'?'academy-overview':'transfer-search-panel');};
function opponentReportPages(){
 const host=$('opponent-detail-dialog').querySelector('.opponent-detail-content');if(!host||host.classList.contains('report-screen'))return;host.classList.add('report-screen');
 const q=s=>host.querySelector(s);reportDeck(host,[['능력 비교',[q('.opponent-detail-compare')]],['현재 상태',[q('.opponent-detail-summary')]],['활용 유형',[q('.opponent-role-report')]],['보고서 기준',[q('.opponent-detail-source'),q('.opponent-detail-compare>p')]]],'opponent',q('footer'));q('.opponent-detail-source').open=true;
}
const pagedOpponentRender=renderOpponentDetails;renderOpponentDetails=function(d){pagedOpponentRender(d);opponentReportPages();};
function applyTacticsPage(){
 const section=$('match-popup-tactics'),host=$('tactical-editor');if(!host)return;const page=reportPagesState.tactics;section.dataset.reportPage=page;
 for(const node of host.children){const visible=page==='배치'?node.matches('.tactical-pitch,#tactical-position-status'):page==='선수 특징'?node.matches('.tactical-selected-profile'):page==='연결 요약'?node.matches('.support-map-toggle,.tactical-team-strip,.support-summary'):page==='세트피스'?node.matches('.set-piece-plan'):page.startsWith('코치 ')?node.matches('.touchline-briefing'):page==='도움말'?node.matches('h3,h3+p,.tactical-note'):false;node.classList.toggle('report-page-off',!visible);}
 for(const node of section.children){if(node===host||node.classList.contains('tactics-page-controls'))continue;const visible=node.matches('.field-toolbar')?page==='배치':node.id==='mobile-tactics-dock'?page==='팀 지시':node.id==='pitch-player-tools'?page==='선수 역할':false;node.classList.toggle('report-page-off',!visible);}
 const briefing=host.querySelector('.touchline-briefing');if(briefing){briefing.open=true;const advice=briefing.querySelector('.touchline-advice');for(const child of briefing.children)child.classList.toggle('report-page-off',child.tagName!=='SUMMARY'&&(page==='코치 브리핑'?child===advice:child!==advice));for(const [i,article] of [...advice.children].entries())article.hidden=page!=='코치 조언 '+(i+1);}
 const person=$('tactics-page-player');person.hidden=!['선수 역할','선수 특징','연결 요약'].includes(page);person.innerHTML='<option value="">선수 선택</option>'+state.lineup.map(id=>'<option value="'+id+'"'+(id===selected?' selected':'')+'>'+escapeText(state.players[id].name)+'</option>').join('');$('tactics-page-empty').hidden=!['선수 역할','선수 특징'].includes(page)||!!selected;
}
function prepareTacticsPages(){
 const dialog=$('match-popup');dialog.classList.toggle('focused-tactics',['tactics','analysis'].includes(matchPopupActive));if(matchPopupActive!=='tactics')return;const section=$('match-popup-tactics');
 if(!$('tactics-page-select')){const controls=document.createElement('div');controls.className='tactics-page-controls';controls.innerHTML='<select id="tactics-page-select" aria-label="전술 항목 선택">'+['배치','팀 지시','선수 역할','선수 특징','연결 요약','세트피스','도움말'].map(label=>'<option>'+label+'</option>').join('')+'</select><select id="tactics-page-player" aria-label="전술을 확인할 선수"></select><p id="tactics-page-empty">선수를 선택하면 역할과 특징을 확인할 수 있습니다.</p>';section.prepend(controls);$('tactics-page-select').onchange=e=>{reportPagesState.tactics=e.target.value;applyTacticsPage();};$('tactics-page-player').onchange=e=>{selected=e.target.value||null;render();$('tactics-page-player').focus({preventScroll:true});};}
 const chooser=$('tactics-page-select');for(const option of [...chooser.options])if(option.value.startsWith('코치 '))option.remove();{for(const label of ['코치 브리핑',...[...section.querySelectorAll('.touchline-advice article')].map((_,i)=>'코치 조언 '+(i+1))]){const option=document.createElement('option');option.textContent=label;chooser.append(option);}}if(![...chooser.options].some(o=>o.value===reportPagesState.tactics))reportPagesState.tactics='코치 브리핑';chooser.value=reportPagesState.tactics;applyTacticsPage();
}
const pagedTacticalRender=renderTacticalEditor;renderTacticalEditor=function(){pagedTacticalRender();if($('tactics-page-select'))applyTacticsPage();};
const pagedMatchPopupRender=renderMatchPopup;renderMatchPopup=function(){pagedMatchPopupRender();prepareTacticsPages();};
function analysisReportPages(){
 const host=$('tactics-board'),body=host?.querySelector('.tactics-board-body');if(!body||body.querySelector('.report-page-select'))return;const q=s=>body.querySelector(s);
 const entries=[['전개 보기',[q('.tactics-visualizer')]],['선발 · 상대 비교',[q('.tactics-matchups')]],['전술 비교',[q('.tactics-window-label'),q('.tactics-choice-grid')]],['지시 확인 · 적용',[q('.tactics-effect')]],['코치 추천',[q('.tactics-coach'),q('.tactics-energy-check')]],['분석 기준',[q('.tactics-assumption')]]];
 entries.at(-1)[1].push(q('.visualizer-spacing'),q('.tactics-diagram figcaption>small'));reportDeck(body,entries,'analysis');q('.tactics-board-top')?.remove();host.querySelector('details').open=true;
}
const pagedAnalysisRender=renderTacticsBoard;renderTacticsBoard=function(){pagedAnalysisRender();analysisReportPages();};
const pagedAnalysisPreview=previewTactics;previewTactics=function(t){pagedAnalysisPreview(t);analysisReportPages();};
const pagedDiagramPreview=previewTacticsDiagram;previewTacticsDiagram=function(...args){pagedDiagramPreview(...args);analysisReportPages();};
