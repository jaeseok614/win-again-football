(function(root){
 'use strict';
 // League-linked original illustrations, not a simulated facility or attendance.
 const asset='assets/club-growth-v2.webp?v=2',labels=['동네 구장','늘어나는 관중석','프로 구단의 홈','대형 홈 경기장','1부의 불빛'];
 if(root.document?.createElement&&root.document?.head?.appendChild){const style=root.document.createElement('style');style.id='club-growth-atlas';style.textContent='.club-growth-picture{background-image:url("'+asset+'")}';root.document.head.appendChild(style);}
 const division=value=>Number.isInteger(value)&&value>=1&&value<=5?value:5;
 function html(value){const d=division(value),i=5-d;return '<figure class="club-growth" data-club-growth="'+d+'"><div class="club-growth-picture" role="img" aria-label="'+d+'부 구단 규모 일러스트 · '+labels[i]+'" style="--growth-x:'+(i%3)*50+'%;--growth-y:'+Math.floor(i/3)*100+'%"></div><figcaption><strong>'+d+'부 · '+labels[i]+'</strong><span>구단 규모 일러스트</span></figcaption></figure>';}
 function scale(value){const d=division(value);return '<ol class="club-growth-scale" aria-label="1부 귀환까지 · 현재 '+d+'부">'+[5,4,3,2,1].map(n=>'<li'+(n===d?' aria-current="step"':'')+'>'+n+'부</li>').join('')+'</ol>';}
 function review(m){const changed=m.final&&Number.isInteger(m.nextDivision)&&m.nextDivision>=1&&m.nextDivision<=5&&m.nextDivision!==m.division;return '<section class="club-growth-review" aria-label="시즌별 구단 규모"><div><span>'+ (m.current?'이번 시즌':'당시 시즌')+'</span>'+html(m.division)+'</div>'+(changed?'<div><span>'+(m.current?'확정된 다음 리그':'당시 다음 리그')+'</span>'+html(m.nextDivision)+'</div>':'')+'</section>';}
 function campus(){return '<figure class="club-growth club-growth-campus"><div class="club-growth-picture" role="img" aria-label="1부 훈련 캠퍼스 일러스트" style="--growth-x:100%;--growth-y:100%"></div><figcaption><strong>1부 · 훈련 캠퍼스</strong><span>구단 규모 일러스트</span></figcaption></figure>';}
 const api={asset,html,scale,review,campus};root.ClubGrowth=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
