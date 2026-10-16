(function(root){
 'use strict';
 // Rule11 runtime boundary: one micrometre / millionth-unit state precision.
 // IEEE arithmetic alone is insufficient: V8 versions differ in transcendental ulps.
 const round=n=>Number.isFinite(n)?Math.round(n*1e6)/1e6:n;
 const playerKeys=['x','y','prevX','prevY','vx','vy','energy','distance','burst','focus'],ballKeys=['x','y','z','vx','vy','vz'];
 function fields(p,keys){if(!p)return;for(const k of keys)if(typeof p[k]==='number')p[k]=round(p[k]);}
 function finish(w,events){for(const p of w.players)fields(p,playerKeys);fields(w.ball,ballKeys);fields(w.restart,['x','y']);for(const p of w.ai?.targets||[])fields(p,['x','y']);for(const k of ['pendingShot','reboundShot'])fields(w[k],['xg']);if(w.stats?.xg)for(let i=0;i<w.stats.xg.length;i++)w.stats.xg[i]=round(w.stats.xg[i]);for(const e of events){fields(e,['x','y','xg']);fields(e.shotPosition,['x','y']);}return events;}
 const api={finish};root.ContinuousNumbers=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
