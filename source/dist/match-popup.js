// Match presentation only. Move existing controls rather than cloning handlers.
var matchPopupActive=null,matchPopupOpener=null;
const matchPopupNames={roster:'선수 교체',tactics:'전술 지시',opponent:'상대 보고서',analysis:'전술 분석',stats:'경기 기록',talk:'선수 대화',settings:'경기 설정'};
function syncMatchScreenMode(){document.body.classList.toggle('match-view',appSessionStarted&&view==='match'&&!!state);if(view!=='match')closeMatchPopup();}
function openMatchPopup(kind,opener=document.activeElement){
 if(!Object.hasOwn(matchPopupNames,kind)||view!=='match'||!state)return;
 const dialog=$('match-popup');if(!dialog)return;
 if(!dialog.open)matchPopupOpener=opener;
 pauseForPlanning();matchPopupActive=kind;save();render();
 if(!dialog.open)dialog.showModal();
 $('match-popup-title').focus({preventScroll:true});
}
function closeMatchPopup(){const dialog=$('match-popup');if(dialog?.open)dialog.close();}
function finishMatchPopupClose(){matchPopupActive=null;matchdayTab='live';render();const opener=matchPopupOpener;matchPopupOpener=null;if(opener?.isConnected&&!opener.closest('dialog'))opener.focus({preventScroll:true});else $('matchday-roster')?.focus({preventScroll:true});}
function showMatchPopupError(text){const error=$('match-popup-error');if($('match-popup')?.open){error.textContent=text;error.hidden=false;error.focus({preventScroll:true});}}
function renderMatchPopup(){
 const dialog=$('match-popup');if(!dialog)return;
 if($('notice').hidden)$('match-popup-error').hidden=true;
 if(view!=='match'||!state){closeMatchPopup();return;}
 // The pitch always stays visible behind a dialog. Hidden popup sections stay cheap.
 $('matchday-live').hidden=false;
 $('match-popup-title').textContent=matchPopupNames[matchPopupActive]||'경기 메뉴';
 $('match-popup-status').textContent=state.minute+'′ · '+(F.running(state)?'경기 일시 정지 · 닫은 뒤 직접 이어가세요.':{prep:'킥오프 전',half:'하프타임',late:'작전 시간',full:'경기 종료'}[state.phase]||'');
 for(const [kind] of Object.entries(matchPopupNames)){
  const section=$('match-popup-'+kind);section.hidden=matchPopupActive!==kind;
  const button=dialog.querySelector('[data-match-popup="'+kind+'"]');button?.setAttribute('aria-pressed',String(matchPopupActive===kind));
  if(button)button.disabled=kind==='analysis'&&state.phase==='full';
 }
 $('opposition-report').hidden=matchPopupActive!=='opponent';
 $('tactics-board').hidden=matchPopupActive!=='analysis';
 matchdayTab=matchPopupActive==='analysis'?'analysis':matchPopupActive==='opponent'?'opponent':'live';
 if(matchPopupActive==='opponent')renderOpponentReport();
 if(matchPopupActive==='tactics'&&typeof renderTacticalEditor==='function')renderTacticalEditor();
 if(matchPopupActive==='analysis'){tacticsBoardOpen=true;renderTacticsBoard();}
 $('matchday-roster').textContent='선수 교체';
 $('primary').textContent={prep:'킥오프',half:'후반 시작',late:'마지막 25분 시작',full:'결과 확정'}[state.phase]||(state.paused?'경기 이어가기':'5분 진행');
 const detail=$('match-open-details');if(detail)detail.textContent=state.phase==='full'?'경기 결과':'경기 기록';
 const talkNote=$('match-talk-unavailable');if(talkNote)talkNote.hidden=!$('team-talk-panel').hidden;
}
function initMatchPopup(){
 const pane=$('match-pane'),dialog=document.createElement('dialog');dialog.id='match-popup';dialog.setAttribute('aria-labelledby','match-popup-title');
 dialog.innerHTML='<header class="match-popup-header"><div><h2 id="match-popup-title" tabindex="-1">경기 메뉴</h2><p id="match-popup-status"></p></div><button type="button" data-match-popup-close aria-label="경기 메뉴 닫기">닫기</button></header><nav class="match-popup-nav" aria-label="경기 상세 메뉴">'+Object.entries(matchPopupNames).map(([kind,label])=>'<button type="button" data-match-popup="'+kind+'" aria-pressed="false">'+label+'</button>').join('')+'</nav><p id="match-popup-error" role="alert" tabindex="-1" hidden></p><div class="match-popup-body">'+Object.keys(matchPopupNames).map(kind=>'<section id="match-popup-'+kind+'" hidden></section>').join('')+'</div><footer class="match-popup-footer"><button type="button" data-match-popup-close>경기로 돌아가기</button></footer>';
 pane.append(dialog);
 const move=(node,kind)=>{if(node)$('match-popup-'+kind).append(node);};
 move($('matchday-selection'),'roster');move(document.querySelector('.bench-heading'),'roster');move($('selection-hint'),'roster');move($('bench'),'roster');move($('pitch-swap-options'),'roster');move($('error'),'roster');
 move(document.querySelector('.manager-panel>.tactics'),'tactics');move($('mobile-tactics-dock'),'tactics');move($('pitch-player-tools'),'tactics');move(document.querySelector('.field-toolbar'),'tactics');
 move($('opposition-report'),'opponent');move($('tactics-board'),'analysis');move($('matchday-summary'),'stats');move($('timeline'),'stats');move($('results'),'stats');move($('team-talk-panel'),'talk');move($('matchday-controls'),'settings');$('matchday-controls').open=true;
 const talkNote=document.createElement('p');talkNote.id='match-talk-unavailable';talkNote.textContent='선수 대화는 경기 전, 하프타임, 65분 작전 시간에 할 수 있습니다.';$('match-popup-talk').append(talkNote);
 const commands=document.createElement('div');commands.id='match-live-actions';commands.append(document.querySelector('.main-action'));
 const quick=document.createElement('div');quick.className='match-quick-menu';quick.innerHTML='<button type="button" data-match-popup="tactics">전술 지시</button><button id="match-open-details" type="button" data-match-popup="stats">경기 기록</button><button type="button" data-match-popup="talk">선수 대화</button><button type="button" data-match-popup="settings">설정</button>';commands.append(quick);pane.append(commands);
 pane.addEventListener('click',event=>{const open=event.target.closest('[data-match-popup]'),close=event.target.closest('[data-match-popup-close]');if(open)openMatchPopup(open.dataset.matchPopup,open);else if(close)closeMatchPopup();});
 dialog.addEventListener('click',event=>{if(event.target===dialog){const rect=dialog.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)closeMatchPopup();}});
 dialog.addEventListener('close',finishMatchPopupClose);
 document.body.classList.add('match-popup-ready');
 const pause=$('pause');quick.prepend(pause);
}
initMatchPopup();
