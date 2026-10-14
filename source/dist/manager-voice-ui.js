function fitVoiceArticles(){
 for(const article of document.querySelectorAll('.voice-article')){if(!article.checkVisibility())continue;let size=article.closest('#club-press-desk')?8:9;article.style.setProperty('--voice-prose-size',size+'px');while(size>6.5&&article.scrollHeight>article.clientHeight+1){size-=.5;article.style.setProperty('--voice-prose-size',size+'px');}}
}
// Articles are available on the home screen; the same real interview actions are reused.
var voicePressPhase=null,voiceNewsId=null,voiceHomeKey='',voiceHomeSeason=null;
const voiceDesk=document.createElement('section');voiceDesk.id='club-press-desk';voiceDesk.setAttribute('aria-label','기사와 기자의 질문');$('club-pane').append(voiceDesk);
function voiceArticleMarkup(item,brief=false){
 const esc=lifeText,body=brief?item.body.split(/(?<=[.!?。])\s+/)[0]:item.body;
 return '<article class="voice-article"><header><b>'+esc(item.outlet)+'</b><span>'+esc(item.verdict)+'</span></header><h3>'+esc(item.headline)+'</h3><p>'+esc(body)+'</p><small>'+esc(item.fact)+'</small></article>';
}
function voiceInterviewMarkup(raw,compact=false){
 const q=ManagerVoice.press(season,raw),esc=lifeText;if(!q)return '<article class="voice-interview voice-empty"><h3>다음 공식 인터뷰를 기다립니다.</h3><p>킥오프 전이나 결과를 확정한 뒤 기자의 질문이 도착합니다.</p></article>';
 return '<article class="voice-interview" data-voice-phase="'+q.phase+'"><header><b>'+esc(q.reporter)+'</b><span>'+esc(compact?(q.phase==='before'?'경기 전':'경기 후'):q.outlet+' · '+(q.phase==='before'?'경기 전':'경기 후'))+'</span></header><h3>'+esc(compact&&innerHeight<300?(q.phase==='before'?q.opponent+'전. 기대가 부담인가요, 결과로 답할 건가요?':q.score.join(' : ')+'. 선수와 팬들에게 뭐라고 하실 건가요?'):q.question)+'</h3><p class="voice-inner"><b>(속마음)</b> '+esc(q.thought)+'</p>'+(q.answered?'<div class="voice-saved"><p><b>감독</b> “'+esc(q.spoken)+'”</p><p><b>기자</b> '+esc(q.reaction)+'</p></div>':'<div class="voice-answers">'+ClubLife.pressChoices.map((c,i)=>'<button type="button" data-life-press="'+q.phase+'" data-life-answer="'+c.id+'" '+(lifePressBusy?'disabled':'')+' aria-label="'+esc(q.answers[i])+'"><strong>'+esc(['한 경기부터','이길 생각으로','책임은 내 몫'][i])+'</strong>'+(!compact?'<span>'+esc(q.answers[i])+'</span>':'')+'</button>').join('')+'</div>')+'</article>';
}
function voiceCurrentQuestion(status){return status.after&&!status.after.answered?status.after:status.before||status.after;}
function renderVoiceHome(){
 if(!appSessionStarted||view!=='club'){if(!voiceDesk.hidden)voiceDesk.hidden=true;return;}
 if(voiceDesk.hidden)voiceDesk.hidden=false;const press=ClubLife.pressStatus(season),news=ClubLife.news(season),key=JSON.stringify([season.year,season.round,season.competition,state?.phase,season.clubLife.press,news[0]?.id,season.statistics?.records?.length,season.finance?.ledger?.length,Object.values(season.squad).map(p=>p.identity)]);
 if(voiceHomeSeason===season&&voiceHomeKey===key)return;voiceHomeSeason=season;voiceHomeKey=key;
 voiceDesk.innerHTML='<header class="voice-desk-heading"><b>기사가 보는 우리 · 기자의 질문</b><span>가상 언론 · 기록 기반</span></header><div class="voice-reviews">'+MediaRoom.read(season).map(a=>voiceArticleMarkup(a,true)).join('')+'</div>'+voiceInterviewMarkup(voiceCurrentQuestion(press),true);requestAnimationFrame(fitVoiceArticles);
}
function renderVoicePressCentre(panel,press,news){
 const questions=[press.before,press.after].filter(Boolean);if(!questions.some(q=>q.phase===voicePressPhase))voicePressPhase=voiceCurrentQuestion(press)?.phase||'before';
 const selected=questions.find(q=>q.phase===voicePressPhase);if(!news.some(n=>String(n.id)===voiceNewsId))voiceNewsId=news[0]?String(news[0].id):null;const item=news.find(n=>String(n.id)===voiceNewsId),esc=lifeText;
 panel.innerHTML='<section class="voice-press-centre"><header><b id="life-club-heading" role="heading" aria-level="2">기자실 · 언론 평판 '+esc(press.reputation)+'</b><span class="life-note" role="status" tabindex="-1">'+esc(lifePressNote?'기자가 답변을 받아 적었다.':'가상 언론 · 실제 확정 기록')+'</span></header><div class="voice-reviews">'+MediaRoom.read(season).map(a=>voiceArticleMarkup(a)).join('')+'</div><section class="voice-press-side"><label>인터뷰 시점<select id="voice-press-phase" aria-label="인터뷰 시점" '+(!questions.length?'disabled':'')+'>'+(!questions.length?'<option value="">다음 인터뷰 대기</option>':'')+questions.map(q=>'<option value="'+q.phase+'" '+(q.phase===voicePressPhase?'selected':'')+'>'+(q.phase==='before'?'경기 전':'경기 후')+' · '+esc(q.opponent)+(q.answered?' · 답변 완료':' · 답변 대기')+'</option>').join('')+'</select></label>'+voiceInterviewMarkup(selected)+'</section><section class="voice-news-record"><label>구단 기사<select id="voice-news-id" aria-label="구단 기사 기록"><option value="">'+(news.length?'기사 선택':'아직 구단 기사 없음')+'</option>'+news.map(n=>'<option value="'+esc(n.id)+'" '+(String(n.id)===voiceNewsId?'selected':'')+'>'+esc(n.headline)+'</option>').join('')+'</select></label><div><b>'+esc(item?.headline||'다음 소식을 기다립니다.')+'</b><p>'+esc(item?.body||'경기·계약·기자 답변 뒤에 실제 구단 소식이 기록됩니다.')+'</p></div></section>'+'</section>';
 requestAnimationFrame(fitVoiceArticles);
 const phase=panel.querySelector('#voice-press-phase');if(phase)phase.onchange=e=>{voicePressPhase=e.target.value;renderVoicePressCentre(panel,press,news);panel.querySelector('#voice-press-phase').focus({preventScroll:true});};
 panel.querySelector('#voice-news-id').onchange=e=>{voiceNewsId=e.target.value;renderVoicePressCentre(panel,press,news);panel.querySelector('#voice-news-id').focus({preventScroll:true});};
 panel.onclick=event=>{const b=event.target.closest('[data-life-press]');if(b&&!b.disabled)lifeAnswerPress(b.dataset.lifePress,b.dataset.lifeAnswer,b);};
}
voiceDesk.onclick=event=>{const b=event.target.closest('[data-life-press]');if(b&&!b.disabled)lifeAnswerPress(b.dataset.lifePress,b.dataset.lifeAnswer,b);};
const voiceOriginalRender=render;render=function(){voiceOriginalRender();renderVoiceHome();};
window.addEventListener('resize',()=>{if($('club-story-dialog').open)renderClubStoryDialog();requestAnimationFrame(fitVoiceArticles);});
