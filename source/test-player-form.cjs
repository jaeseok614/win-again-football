'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),F=require('./dist/engine.js'),S=require('./dist/season.js'),PlayerForm=require('./dist/player-form.js');
let groups=0;function test(name,fn){fn();groups++;console.log('PASS '+name);}function copy(value){return JSON.parse(JSON.stringify(value));}
function finish(match){while(match.phase!=='full'){if(!F.running(match))F.begin(match);F.finishSegment(match);}return match;}
function play(season){finish(season.match);return S.settle(season);}

test('new and newly registered players have no fabricated appearance form',()=>{
 const season=S.create(91301),before=JSON.stringify(season),report=PlayerForm.read(season,'sp_f3');assert.equal(report.valid,true);assert.equal(report.appearances,0);assert.equal(report.form,'');assert.deepEqual(report.matches,[]);assert.equal(JSON.stringify(season),before);
 const recruited=S.recruit(season,'t_f2','f3');assert.equal(PlayerForm.read(recruited,'t_f2').appearances,0);assert.equal(PlayerForm.read(recruited,'sp_f3').valid,false);assert.equal(PlayerForm.read(season,'not-a-player').valid,false);
});

test('last five appearances follow confirmed match order and mirror actual minutes, team result and contributions',()=>{
 let season=S.create(91302);const identity=season.squad.f1.identity;for(let i=0;i<7;i++)season=play(season);const before=JSON.stringify(season),report=PlayerForm.read(season,identity),records=season.statistics.records.filter(record=>record.players.find(player=>player.identity===identity)?.minutes>0).slice(-5).reverse();assert.equal(report.valid,true);assert.equal(report.appearances,5);assert.equal(report.matches.length,5);assert.equal(report.form.length,5);
 assert.deepEqual(report.matches,records.map(record=>{const player=record.players.find(player=>player.identity===identity),competition=record.competition==='league'?'리그 '+record.round+'R':record.competition==='cup'?'국내컵 '+(record.stage+1)+'단계':'유럽 '+(record.stage+1)+'단계';return {year:record.year,competition,opponent:S.club(record.home==='brynwell'?record.away:record.home).short,score:[...record.score],outcome:record.score[0]>record.score[1]?'win':record.score[0]<record.score[1]?'loss':'draw',minutes:player.minutes,goals:player.goals,assists:player.assists,started:player.started};}));
 assert.equal(report.wins+report.draws+report.losses,5);assert.equal(report.minutes,report.matches.reduce((sum,match)=>sum+match.minutes,0));assert.equal(report.goals,report.matches.reduce((sum,match)=>sum+match.goals,0));assert.equal(report.assists,report.matches.reduce((sum,match)=>sum+match.assists,0));assert.equal(JSON.stringify(season),before);
 report.matches[0].score[0]=999;assert.notEqual(PlayerForm.read(season,identity).matches[0].score[0],999);
});

test('squad form computes one detached recent report per current identity and accepts frozen campaigns',()=>{
 let season=S.create(91303);for(let i=0;i<3;i++)season=play(season);const before=copy(season),frozen=value=>{if(value&&typeof value==='object'){for(const child of Object.values(value))frozen(child);Object.freeze(value);}return value;},reports=PlayerForm.squad(frozen(season));assert.equal(Object.keys(reports).length,18);for(const player of Object.values(season.squad)){const expected=season.statistics.records.filter(record=>record.players.find(row=>row.identity===player.identity)?.minutes>0).length;assert.equal(reports[player.identity].identity,player.identity);assert.equal(reports[player.identity].appearances,Math.min(expected,5));}reports[season.squad.f1.identity].form='changed';assert.deepEqual(season,before);assert.equal(PlayerForm.read(season,'sp_f3',0).limit,5);
});

test('the player form module works in a browser without CommonJS globals',()=>{
 let season=S.create(91304);season=play(season);const context=vm.createContext({Football:F,Season:S});vm.runInContext(fs.readFileSync(path.join(__dirname,'dist/player-form.js'),'utf8'),context);assert(context.PlayerForm);assert.deepEqual(JSON.parse(JSON.stringify(context.PlayerForm.read(season,'sp_f3'))),PlayerForm.read(season,'sp_f3'));
});

console.log('Validated '+groups+' player form groups.');
