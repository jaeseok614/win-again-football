'use strict';
const F=require('./dist/engine.js'),S=require('./dist/season.js'),copy=x=>JSON.parse(JSON.stringify(x));
function finish(m){while(m.phase!=='full'){if(!F.running(m))F.begin(m);m.paused=false;F.finishSegment(m);}return m;}
function play(s){finish(s.match);return S.settle(s);}
function complete(s){while(s.match)s=play(s);return s;}
let qualified=null;
function qualify(){if(!qualified){const fs=require('fs'),path=require('path'),crypto=require('crypto'),key=crypto.createHash('sha256');for(const f of fs.readdirSync(path.join(__dirname,'dist')).filter(f=>f.endsWith('.js')&&!f.endsWith('-ui.js')))key.update(fs.readFileSync(path.join(__dirname,'dist',f)));const cache=path.join(__dirname,'../work/qualified-'+key.digest('hex')+'.json');try{qualified=S.restore(JSON.parse(fs.readFileSync(cache,'utf8')));}catch{}
 if(!qualified){let s=S.create(12);for(const p of Object.values(s.squad)){for(const key of ['attack','defense','passing','speed','endurance','keeping'])p[key]=s.match.players[p.id][key]=99;p.potential=s.match.players[p.id].potential=99;s.career.baselines[p.identity]=99;}F.setFormation(s.match,'433');F.setTactic(s.match,'press');for(let year=0;year<10&&!s.europe.enabled;year++)s=S.nextSeason(complete(s));if(!s.europe.enabled)throw Error('Current campaign failed to qualify');qualified=copy(s);fs.mkdirSync(path.dirname(cache),{recursive:true});fs.writeFileSync(cache,JSON.stringify(qualified));}}
 return copy(qualified);}
module.exports={finish,play,complete,qualify};
