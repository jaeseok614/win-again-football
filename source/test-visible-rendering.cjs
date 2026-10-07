'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const F=require('./dist/engine.js'),S=require('./dist/season.js'),P=require('./dist/cup.js'),E=require('./dist/economy.js'),H=require('./dist/health.js'),B=require('./dist/tactics-board.js'),Portraits=require('./dist/portraits.js'),PlayerTraits=require('./dist/player-traits.js');
const app=fs.readFileSync(__dirname+'/dist/app.js','utf8');let groups=0;
function test(name,run){run();groups++;console.log('PASS '+name);}
function section(name,next){const start=app.indexOf('function '+name+'('),end=app.indexOf('function '+next+'(',start);assert.ok(start>=0&&end>start);return app.slice(start,end);}
function harness(){
 const nodes=new Map(),calls=[],writes=[];
 function node(id){if(!nodes.has(id)){const n={hidden:false,disabled:false,style:{},dataset:{},open:false,classList:{toggle(){}},setAttribute(){},addEventListener(){},focus(){},querySelector:sel=>node(id+' '+sel),querySelectorAll:()=>[]};for(const key of ['innerHTML','textContent']){let value='';Object.defineProperty(n,key,{get:()=>value,set:v=>{value=v;writes.push(id);}});}nodes.set(id,n);}return nodes.get(id);}
 const nav=['club','match','squad','market','academy','cup'].map(v=>({...node('nav-'+v),dataset:{view:v}}));
 const ctx=vm.createContext({season:S.create(8821,{suspensions:true}),state:null,view:'club',squadTab:'health',matchdayTab:'live',selected:null,canSave:true,appSessionStarted:true,F,S,P,E,H,Football:F,Season:S,Economy:E,Cup:P,Health:H,$:node,document:{body:node('body'),getElementById:node,querySelector:node,querySelectorAll:q=>q==='[data-view]'?nav:[],addEventListener(){}},saveRecovery:{isBlocked:()=>false},labels:{balanced:'균형',press:'압박',counter:'역습'},moneyLabel:n=>'£'+n,signedMoney:n=>'£'+n,playerUiText:String,escapeText:String,Portraits:{html:p=>'<span>'+p.identity+'</span>'},fitnessBadge:()=>'',clubMark:c=>c.short,leagueTargetLabel:()=>'',seasonHeadline:()=>'',leagueZone:()=>null,movementText:()=>'',cupOutcome:()=>null,editable:()=>true,metric:p=>p.pos,matchLogText:e=>e.text});ctx.state=ctx.season.match;
 const names=['renderAppShell','renderManagerJourney','renderOwnerBoard','renderSuspensions','renderSeasonReview','renderSeasonCalendar','renderSquadPlans','renderClubLife','renderTeamTalk','renderEurope','renderStaff','renderCoachGuide','renderVisuals','renderFeedbackControls','renderMovementControls','renderMatchControls','renderTacticsBoard','renderPitch','renderBench','renderReport','renderResults','renderDivision','renderMobileCommandCenter','renderLatestMatchReview','renderFinance','renderMarket','renderCareer','renderCup','renderHealth','renderIndividualTraining','renderRecords','refreshPlayerDetails'];
 for(const name of names)ctx[name]=()=>calls.push(name);
 ctx.renderMatchday=()=>{calls.push('renderMatchday');if(ctx.state&&F.running(ctx.state)&&!ctx.state.paused||ctx.state?.phase==='full')ctx.matchdayTab='live';};
 vm.runInContext(fs.readFileSync(__dirname+'/dist/division-ui.js','utf8').split('function seasonHeadline')[0],ctx);
 vm.runInContext(section('renderSeason','save')+section('render','renderReport'),ctx);
 return {ctx,node,nodes,nav,calls,writes,clear(){calls.length=0;writes.length=0;},load(file){vm.runInContext(fs.readFileSync(__dirname+'/dist/'+file,'utf8'),ctx);}};
}
test('every non-match view refreshes only its own large panels without changing the campaign',()=>{
 const h=harness(),before=JSON.stringify(h.ctx.season),heavy=['renderFeedbackControls','renderMovementControls','renderMatchControls','renderTacticsBoard','renderPitch','renderBench','renderReport','renderResults','renderMatchday'];
 const cases=[['club','health',['renderFinance','renderCareer','renderCup','renderHealth'],['club-overview','league-table','season-fixtures']],['market','health',['renderFinance','renderMarket'],[]],['academy','health',['renderCareer'],[]],['cup','health',['renderCup'],[]],['squad','health',['renderRecords','renderHealth'],['squad-overview']],['squad','training',['renderRecords','renderIndividualTraining'],[]],['squad','records',['renderRecords'],[]]];
 const routed=['renderFinance','renderCareer','renderCup','renderHealth','renderMarket','renderRecords','renderIndividualTraining'];
 for(const [view,tab,expected,panels] of cases){h.clear();h.ctx.view=view;h.ctx.squadTab=tab;h.ctx.render();assert.deepEqual(h.calls.filter(n=>routed.includes(n)),expected,view+'/'+tab);for(const n of heavy)assert.ok(!h.calls.includes(n),view+' must skip '+n);for(const id of ['club-overview','league-table','season-fixtures','squad-overview'])assert.equal(h.writes.includes(id),panels.includes(id),view+'/'+tab+' '+id);assert.ok(!h.writes.includes('own-name'));for(const v of ['club','match','squad','market','academy','cup'])assert.equal(h.node(v+'-pane').hidden,v!==view);assert.equal(JSON.stringify(h.ctx.season),before);}
});
test('entering the match draws fresh headers and score, while repeated live ticks never rebuild standings or a hidden tactics board',()=>{
 const h=harness();h.ctx.view='match';h.ctx.render();assert.equal(h.node('own-name').textContent,S.club(S.own).name);assert.equal(h.node('opp-name').textContent,S.opponentFor(h.ctx.season).name);assert.equal(h.node('home-score').textContent,0);assert.ok(h.calls.includes('renderPitch'));
 F.begin(h.ctx.state);for(let i=0;i<10;i++){F.tick(h.ctx.state);h.clear();const before=JSON.stringify(h.ctx.season);h.ctx.render();for(const id of ['club-overview','league-table','season-fixtures','squad-overview'])assert.ok(!h.writes.includes(id));for(const n of ['renderDivision','renderFinance','renderMarket','renderCareer','renderCup','renderTacticsBoard'])assert.ok(!h.calls.includes(n),n);assert.equal(h.node('clock').textContent,h.ctx.state.minute+'′');assert.equal(JSON.stringify(h.ctx.season),before);}
 h.ctx.state.paused=true;h.ctx.matchdayTab='analysis';h.clear();h.ctx.render();assert.ok(h.calls.includes('renderTacticsBoard'));assert.ok(h.calls.indexOf('renderTacticsBoard')>h.calls.indexOf('renderMatchday'));
 h.ctx.state.paused=false;h.clear();h.ctx.render();assert.ok(!h.calls.includes('renderTacticsBoard'));assert.equal(h.ctx.matchdayTab,'live');
});
test('the actual live pitch renders a unique portrait face for every fictional starting player',()=>{
 const season=S.create(8821,{startingClub:true}),state=season.match,players={classList:{toggle(){}},innerHTML:''},nodes=new Map([['players',players]]),context=vm.createContext({F,PlayerTraits,Portraits,season,state,selected:null,editable:()=>true,Discipline:{dismissed:()=>[]},escapeText:String,metric:p=>p.pos,positions(){const counts={GK:0,DEF:0,MID:0,FW:0};return state.lineup.map(id=>{const p=state.players[id],base=p.pos==='GK'?[50,88]:F.formationPositions[state.formation][p.pos][counts[p.pos]++];return {id,p,x:base[0],y:base[1]};});},$:id=>nodes.get(id)||{},renderMobileTacticsDock(){},renderPitchPlayerTools(){},drawField(){}});
 vm.runInContext(section('renderPitch','renderBench'),context);context.renderPitch();const faces=[...players.innerHTML.matchAll(/data-portrait-index="(\d+)"/g)].map(match=>Number(match[1]));
 assert.equal(faces.length,11);assert.equal(new Set(faces).size,11);assert.equal((players.innerHTML.match(/class="player-face-marker"/g)||[]).length,11);assert.match(players.innerHTML,/class="player-portrait portrait-small"/);
});
test('returning home after settlement refreshes the next fixture and standings rather than reusing stale markup',()=>{
 const h=harness();h.ctx.render();const old=h.node('season-fixtures').innerHTML;while(h.ctx.state.phase!=='full'){if(!F.running(h.ctx.state))F.begin(h.ctx.state);F.finishSegment(h.ctx.state);}h.ctx.season=S.settle(h.ctx.season);h.ctx.state=h.ctx.season.match;h.clear();const before=JSON.stringify(h.ctx.season);h.ctx.render();assert.notEqual(h.node('season-fixtures').innerHTML,old);assert.match(h.node('dashboard-context').textContent,/2R/);assert.ok(h.calls.includes('renderLatestMatchReview'));assert.equal(JSON.stringify(h.ctx.season),before);
 h.ctx.view='squad';h.ctx.squadTab='health';h.ctx.render();assert.match(h.node('squad-overview').innerHTML,/270분/);assert.ok(h.node('squad-overview').innerHTML.includes(h.ctx.season.squad.f1.identity));
});
test('home identity and league rules follow the actual current full pyramid in all five tiers',()=>{
 const h=harness(),expected={1:'18~20위 강등',2:'22~24위 강등',3:'21~24위 강등',4:'23~24위 강등',5:'강등 없음'};for(const division of [1,2,3,4,5]){h.ctx.season.league.division=division;h.ctx.season.league.clubIds=[S.own,...S.fiveTierPools[division].filter(c=>c.id!==S.own).map(c=>c.id)].slice(0,division===1?20:24);h.ctx.render();assert.match(h.node('club-overview').innerHTML,/토투넘/);assert.doesNotMatch(h.node('club-overview').innerHTML,/BLACKBORNE|ROVERS|1998/);assert.ok(h.node('league-table').innerHTML.includes(expected[division]));assert.doesNotMatch(h.node('league-table').innerHTML,/7~8위/);}
});

test('a restored title menu stops before all campaign screen work',()=>{const h=harness();h.ctx.appSessionStarted=false;h.ctx.render();assert.deepEqual(h.calls,['renderAppShell']);assert.equal(h.writes.length,0);});
test('hidden coach and tactical analysis panels never call expensive read models and refresh when opened',()=>{
 const h=harness();let guideReads=0,analysisReads=0;h.ctx.CoachGuide={read(){guideReads++;return {valid:false};}};h.ctx.TacticsBoard={...B,read(...args){analysisReads++;return B.read(...args);}};h.ctx.playbackPrefs={coachPause65:false};h.load('coach-guide-ui.js');h.load('tactics-board-ui.js');
 for(const view of ['market','academy','cup','squad','match']){h.ctx.view=view;h.ctx.renderCoachGuide();assert.equal(h.node('coach-guide').hidden,true);}
 assert.equal(guideReads,0);h.ctx.view='club';h.ctx.renderCoachGuide();assert.equal(guideReads,1);
 for(const view of ['club','squad','market','match']){h.ctx.view=view;h.ctx.matchdayTab='live';h.ctx.renderTacticsBoard();}assert.equal(analysisReads,0);
 h.ctx.view='match';h.ctx.matchdayTab='analysis';const before=JSON.stringify(h.ctx.season);h.ctx.renderTacticsBoard();assert.equal(analysisReads,1);assert.match(h.node('tactics-board').innerHTML,/다음 45분/);assert.equal(JSON.stringify(h.ctx.season),before);
});
test('home cup summary does not compute tournament history and tournament details do not rewrite the hidden home summary',()=>{
 const h=harness();h.load('cup-ui.js');let reads=0;h.ctx.cupRecords=()=>{reads++;return [];};h.ctx.view='club';h.ctx.renderCup();assert.equal(reads,0);assert.match(h.node('cup-summary').innerHTML,/대진과 우승 기록/);assert.equal(h.node('cup-bracket').innerHTML,'');h.clear();h.ctx.view='cup';h.ctx.renderCup();assert.equal(reads,1);assert.ok(!h.writes.includes('cup-summary'));assert.match(h.node('cup-bracket').innerHTML,/8강/);assert.match(h.node('trophy-room').innerHTML,/우승 기록/);
});
test('health summaries are written only to their visible home, squad or match location',()=>{
 const h=harness();h.load('health-ui.js');h.ctx.playerCharacterMarkup=()=>'';h.ctx.Discipline=require('./dist/discipline.js');
 for(const [view,tab,target] of [['club','health','health-summary'],['match','health','match-health'],['squad','health','squad-health'],['squad','records',null],['market','health',null]]){h.ctx.view=view;h.ctx.squadTab=tab;h.clear();const before=JSON.stringify(h.ctx.season);h.ctx.renderHealth();for(const id of ['health-summary','match-health','squad-health'])assert.equal(h.writes.includes(id),id===target);assert.equal(JSON.stringify(h.ctx.season),before);}
});
test('home season progress uses the active league length and rejects compact schedules',()=>{
 const home=section('renderClubDashboard','renderSquadOverview');assert.match(home,/\$\{season\.round\}<small> \/ \$\{S\.roundCount\(season\)\}<\/small>/);
 for(const division of [1,2,3,4,5]){const season={round:7,league:{division,rules:'five-tier',clubIds:S.fiveTierPools[division].map(c=>c.id)}},html=vm.runInNewContext('`${season.round}<small> / ${S.roundCount(season)}</small>`',{season,S});assert.equal(html,'7<small> / '+(division===1?38:46)+'</small>');}
 const compact={round:7,league:{division:2,rules:'legacy',clubIds:S.clubs.slice(0,8).map(c=>c.id)}};assert.throws(()=>S.roundCount(compact));
});
console.log('Validated '+groups+' visible rendering groups against real campaign state.');
