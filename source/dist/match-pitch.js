(function(root){
 'use strict';
 // Presentation only. Physical frames use unpadded 0..100 metre-normalized coordinates;
 // legacy reconstruction already includes its field margin. Neither input is mutated.
 function point(p,physical=false){return {...p,x:physical?6+(100-p.y)*.88:100-p.y,y:physical?6+p.x*.88:p.x};}
 function frame(v){if(!v)return v;const physical=v.continuous===true,move=p=>point(p,physical),q={...v,own:v.own.map(move),opponent:v.opponent.map(move),ball:move(v.ball),trail:(v.trail||[]).map(move)};if(v.phase==='goal'){if(q.ball.x>=94)q.ball.x=94.7;else if(q.ball.x<=6)q.ball.x=5.3;}if(v.deadBall?.spot)q.deadBall={...v.deadBall,spot:move(v.deadBall.spot)};return q;}
 const api={point,frame};root.MatchPitch=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
