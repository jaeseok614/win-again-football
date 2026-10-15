
var articleReturn=null,articleSnapshot=null;
const articleDialog=document.createElement('dialog');articleDialog.id='news-article-dialog';articleDialog.setAttribute('aria-labelledby','news-article-title');document.body.append(articleDialog);
function newsroomArt(art){return art.type==='memory'?ClubArt.memory(art.key):ClubArt.story(art.key);}
function openNewsArticle(key,opener=document.activeElement){
 const item=Newsroom.get(season,key);if(!item)return false;
 pauseForPlanning();articleReturn=opener;articleSnapshot=item;
 articleDialog.innerHTML='<header><div><small>'+escapeText(item.outlet+' · '+item.tag)+'</small><h2 id="news-article-title">'+escapeText(item.headline)+'</h2></div><button type="button" id="news-article-close">닫기</button></header><figure>'+newsroomArt(item.art)+'<figcaption>구단 현장 일러스트 · '+item.year+'시즌</figcaption></figure><section class="news-article-copy" aria-label="기사 전문"><p class="news-article-fact">'+escapeText(item.fact)+'</p>'+item.paragraphs.map(p=>'<p>'+escapeText(p)+'</p>').join('')+'<small>게임 속 가상 언론 · 기록을 바탕으로 작성한 기사</small></section><footer><span>전체 기사 '+item.paragraphs.length+'문단</span><button type="button" id="news-article-return">요약으로 돌아가기</button></footer>';
 const close=()=>articleDialog.close();$('news-article-close').onclick=close;$('news-article-return').onclick=close;
 if(!articleDialog.open)articleDialog.showModal();ClubArt.fitDrama?.(articleDialog);$('news-article-close').focus({preventScroll:true});return true;
}
articleDialog.addEventListener('close',()=>{articleSnapshot=null;if(articleReturn?.isConnected)articleReturn.focus({preventScroll:true});articleReturn=null;});
voiceArticleMarkup=function(item,brief=false){
 const art=Newsroom.art(item.style),key='review:'+item.style;
 return '<article class="voice-article newsroom-summary" role="button" tabindex="0" data-news-article="'+escapeText(key)+'" aria-label="'+escapeText(item.headline)+' · 기사 전문"><header><b>'+escapeText(item.outlet)+'</b><span>'+escapeText(item.verdict)+'</span></header><div class="newsroom-thumb">'+newsroomArt(art)+'</div><h3>'+escapeText(item.headline)+'</h3><p>'+escapeText(Newsroom.summary(item.body))+'</p><small>'+escapeText(item.fact)+'</small></article>';
};
const newsroomCentreRender=renderVoicePressCentre;renderVoicePressCentre=function(panel,press,news){
 newsroomCentreRender(panel,press,news);
 const record=panel.querySelector('.voice-news-record>div'),item=news.find(n=>String(n.id)===voiceNewsId);
 if(record&&item)record.innerHTML='<button type="button" class="newsroom-record" data-news-article="'+escapeText('news:'+item.id)+'"><strong>'+escapeText(item.headline)+'</strong><span>'+escapeText(Newsroom.summary(item.body))+'</span><small>기사 전문 읽기 →</small></button>';
};
document.addEventListener('click',e=>{const card=e.target.closest('[data-news-article]');if(card){e.preventDefault();openNewsArticle(card.dataset.newsArticle,card);}});
document.addEventListener('keydown',e=>{const card=e.target.closest('.newsroom-summary[data-news-article]');if(card&&['Enter',' '].includes(e.key)){e.preventDefault();openNewsArticle(card.dataset.newsArticle,card);}});

window.addEventListener('resize',()=>{if(articleDialog.open)ClubArt.fitDrama?.(articleDialog);});
