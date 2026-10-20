'use strict';
const assert=require('node:assert/strict'),F=require('./dist/engine'),S=require('./dist/season'),R=require('./dist/rebirth'),O=require('./dist/opposition'),CF=require('./dist/campaign-file');
const copy=x=>JSON.parse(JSON.stringify(x));
function freeze(x){if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x);}return x;}
const season=S.create(53741,{startingClub:true,suspensions:true,rebirth:true});
const opponent=O.preview(season);F.enableStoppage(season.match);F.enableContinuous(season.match,{ruleVersion:14,opponentFormation:opponent.teams[1].formation,opponentPlayers:opponent.teams[1].players});F.begin(season.match);season.match.paused=false;for(let i=0;i<7;i++)F.tick(season.match);
const before=JSON.stringify(season),file=CF.stringify({season}),expected=CF.read(file).summary;freeze(season);
const original=S.restore;let calls=0;S.restore=()=>{calls++;throw Error('strict restore gate');};
try{
 for(let i=0;i<10;i++){const result=CF.summary(season);assert.deepEqual(result,expected);assert.equal(result.minute,season.match.minute);assert.equal(result.playerCount,18);assert.equal(result.balance,season.finance.balance);assert.equal(result.rebirth.status,'active');result.balance=-1;result.rebirth.attempt=999;}
 assert.equal(calls,0);assert.equal(JSON.stringify(season),before);console.log('PASS live rule14 summary stays read-only without replaying a running match or retaining caller mutations');
 assert.throws(()=>CF.read(file),/strict restore gate/);assert.throws(()=>CF.stringify({season:copy(season)}),/strict restore gate/);assert.equal(calls,2);console.log('PASS file reading and export still require the full strict season restore, independently of the display summary');
}finally{S.restore=original;}
assert.equal(JSON.stringify(CF.read(file).payload.season),JSON.stringify(S.restore(JSON.parse(before))));
assert.throws(()=>CF.read(JSON.stringify({...JSON.parse(file),format:'another-game'})),/이 게임의 구단 백업 파일/);
console.log('PASS unchanged backup format, complete validated round trip and current Korean title error');
