'use strict';
const assert=require('node:assert/strict'),F=require('./dist/engine.js'),S=require('./dist/season.js'),Life=require('./dist/club-life.js'),Staff=require('./dist/staff.js');
const copy=value=>JSON.parse(JSON.stringify(value));let groups=0;
function test(name,fn){fn();groups++;console.log('PASS '+name);}
function advance(m,minute,{talks=false}={}){while(m.minute<minute){if(!F.running(m)){if(talks&&['prep','half','late'].includes(m.phase)&&!m.decisions.some(d=>d.type==='talk'&&d.minute===m.minute))F.teamTalk(m,'encourage');F.begin(m);}m.paused=false;F.tick(m);}return m;}
function finish(m,{talks=false}={}){advance(m,90,{talks});return m;}
function play(s){finish(s.match);return S.settle(s);}
function complete(s){while(s.match)s=play(s);return s;}
function boost(s){for(const p of Object.values(s.squad)){for(const key of ['attack','defense','passing','speed','endurance','keeping'])p[key]=s.match.players[p.id][key]=99;p.potential=s.match.players[p.id].potential=99;s.career.baselines[p.identity]=99;}return s;}
function atomic(s,fn){const before=JSON.stringify(s);assert.throws(()=>fn());assert.equal(JSON.stringify(s),before);}

test('team talks consume no RNG, energy, skill, shots or goals and change actual ratings within three percent',()=>{
 const s=S.create(121),m=s.match,before=copy(m),rating=F.ratings(m);assert.equal(Object.hasOwn(m,'morale'),false);Life.talk(s,'encourage');assert.equal(m.rng,before.rng);for(const key of ['players','score','shots','chances','xg','lineup'])assert.deepEqual(m[key],before[key]);
 const after=F.ratings(m);assert.ok(after.attack>rating.attack);for(const key of ['attack','defense','middle','pace'])assert.ok(after[key]<=rating[key]*1.03+1e-8&&after[key]>=rating[key]*.97-1e-8);assert.equal(m.decisions.length,1);assert.equal(m.logs[0].type,'talk');assert.deepEqual(S.restore(copy(s)),s);
});

test('personality, score and fatigue make different deterministic player reactions without random draws',()=>{
 const s=S.create(55),m=s.match,before=JSON.stringify(s),preview=Life.previewTalk(s,'demand');assert.equal(JSON.stringify(s),before);assert.ok(preview.some(p=>p.delta<0));assert.ok(preview.some(p=>p.delta>0));assert.deepEqual(preview,Life.previewTalk(s,'demand'));
 const behind=copy(m);behind.score=[0,2];assert.ok(F.talkReactions(behind,'praise').every(p=>p.delta===-1));const ahead=copy(m);ahead.score=[3,0];assert.ok(F.talkReactions(ahead,'praise').some(p=>p.delta===2));
 advance(m,65);const tired=m.lineup.find(id=>m.players[id].energy<60);assert.ok(tired);const calm=Life.previewTalk(s,'calm').find(p=>p.id===tired);assert.equal(calm.delta,2);
});

test('each of the three pauses accepts one talk and confidence saturates at plus or minus three',()=>{
 const s=S.create(37);for(const minute of [0,45,65]){advance(s.match,minute);Life.talk(s,'demand');atomic(s,()=>Life.talk(s,'calm'));assert.ok(Object.values(s.match.morale).every(value=>value>=-3&&value<=3));}
 assert.equal(s.match.decisions.filter(d=>d.type==='talk').length,3);assert.ok(Object.values(s.match.morale).some(value=>value===-3));assert.ok(Object.values(s.match.morale).some(value=>value===3));finish(s.match);assert.deepEqual(S.restore(copy(s)),s);
});

test('talks reject invalid choices and live or full-time actions without partially mutating the campaign',()=>{
 const s=S.create(15);atomic(s,()=>Life.talk(s,'invalid'));F.begin(s.match);atomic(s,()=>Life.talk(s,'encourage'));advance(s.match,17);atomic(s,()=>Life.talk(s,'calm'));finish(s.match);atomic(s,()=>Life.talk(s,'praise'));
});

test('halftime and late talks preserve earlier play, RNG and completed segment snapshots',()=>{
 const s=S.create(20260930);for(const minute of [45,65]){advance(s.match,minute);const before=copy(s.match);Life.talk(s,'calm');for(const key of ['segments','score','shots','chances','xg','rng','players'])assert.deepEqual(s.match[key],before[key]);assert.deepEqual(s.match.logs.slice(0,before.logs.length),before.logs);assert.deepEqual(S.restore(copy(s)),s);}
});

test('all pause and running saves replay talks, tactics and substitutions and finish with identical actual results',()=>{
 for(const stop of [0,17,45,56,65,78,90]){const original=S.create(20260930);Life.talk(original,'encourage');advance(original.match,stop,{talks:true});if(stop===45){F.swap(original.match,'f1','f3');F.setTactic(original.match,'counter');}if(stop===65){F.swap(original.match,'m1','m5');F.setTactic(original.match,'press');}
  original.match.paused=F.running(original.match);const restored=S.restore(copy(original));assert.deepEqual(restored,original);finish(original.match,{talks:true});finish(restored.match,{talks:true});assert.deepEqual(S.settle(original),S.settle(restored));}
});

test('prep lineup and training changes retain canonical talks while replacing a spoken-to player is guarded',()=>{
 const s=S.create(121);Life.talk(s,'encourage');F.swap(s.match,'f1','f3');F.setFormation(s.match,'433');S.train(s,'recovery');assert.deepEqual(S.restore(copy(s)),s);finish(s.match);assert.doesNotThrow(()=>S.settle(s));
 const fresh=S.create(121);Life.talk(fresh,'encourage');atomic(fresh,()=>S.recruit(fresh,'t_f2','f1'));const other=S.create(121);S.recruit(other,'t_f2','f1');Life.talk(other,'encourage');assert.doesNotThrow(()=>S.restore(copy(other)));
});

test('altered talk choices, contexts, confidence, order, identity, duplicate decisions and logs are rejected',()=>{
 const s=S.create(37);Life.talk(s,'demand');advance(s.match,45);Life.talk(s,'calm');advance(s.match,65);Life.talk(s,'encourage');finish(s.match);
 for(const mutate of [m=>m.morale.f1=9,m=>delete m.morale,m=>m.decisions[0].choice='fake',m=>m.decisions[1].minute=44,m=>m.decisions[1].score[0]++,m=>m.decisions[1].lineup.reverse(),m=>m.decisions[1].reactions[0].delta++,m=>m.decisions[1].reactions[0].before++,m=>m.decisions[1].reactions[0].after++,m=>m.decisions[0].reactions[0].identity='t_g1',m=>m.decisions.push(copy(m.decisions[0])),m=>m.logs=m.logs.filter(l=>l.type!=='talk'),m=>m.logs.find(l=>l.type==='talk').text='changed',m=>m.decisions[0].extra=1]){const bad=copy(s);mutate(bad.match);assert.throws(()=>S.restore(bad));}
});

test('interviews change only bounded press reputation and articles and save each fixture phase once',()=>{
 const s=S.create(33),before=copy(s);assert.equal(Life.pressStatus(s).before.answered,false);assert.equal(Life.pressStatus(s).after,null);Life.answerPress(s,'before','confident');for(const key of ['finance','squad','match','results','career','staff'])assert.deepEqual(s[key],before[key]);assert.equal(Life.pressStatus(s).reputation,1);assert.equal(Life.pressStatus(s).before.answered,true);atomic(s,()=>Life.answerPress(s,'before','modest'));atomic(s,()=>Life.answerPress(s,'after','protect'));
 const next=play(s),afterBefore=copy(next);Life.answerPress(next,'after','protect');for(const key of ['finance','squad','match','results','career','staff'])assert.deepEqual(next[key],afterBefore[key]);assert.equal(Life.pressStatus(next).after.answered,true);assert.ok(Life.news(next).some(article=>article.kind==='press'));atomic(next,()=>Life.answerPress(next,'after','confident'));assert.deepEqual(S.restore(copy(next)),next);
});

test('a pre-match interview remains valid through kickoff, 17 minutes, halftime, 65 minutes and full time',()=>{
 for(const stop of [0,1,17,45,65,89,90]){const s=S.create(8401);Life.answerPress(s,'before','protect');advance(s.match,stop);s.match.paused=F.running(s.match);assert.deepEqual(S.restore(copy(s)),s);if(stop>0)assert.equal(Life.pressStatus(s).before,null);finish(s.match);const next=S.settle(s);assert.doesNotThrow(()=>S.restore(copy(next)));}
});

test('match articles use actual scores, registered goal scorers and signed coaches and do not invent events',()=>{
 let s=S.create(20260930);Staff.hire(s,Staff.candidates(s).find(p=>p.role==='FW'&&p.tier===1).id);assert.ok(Life.news(s).some(article=>article.kind==='staff'));const full=finish(s.match),score=[...full.score],scorers=[...new Set(F.goalAttributions(full).map(goal=>F.identityProfile(goal.scorerIdentity).name))];s=S.settle(s);const article=Life.news(s).find(item=>item.kind==='match');assert.ok(article.headline.includes(score.join('–')));for(const name of scorers)assert.ok(article.body.includes(name));assert.equal(article.competition,'league');assert.deepEqual(S.restore(copy(s)),s);
});

test('domestic cup and Champions League interviews, talks and articles use their real separate fixtures',()=>{
 const lower=complete(boost(S.create(121))),upper=complete(S.nextSeason(lower));let s=S.nextSeason(upper),seen=new Set();while(s.match&&seen.size<2){if(s.competition!=='league'){const competition=s.competition;Life.answerPress(s,'before','modest');Life.talk(s,'encourage');advance(s.match,45);Life.talk(s,'calm');assert.doesNotThrow(()=>S.restore(copy(s)));finish(s.match);const score=[...s.match.score];s=S.settle(s);Life.answerPress(s,'after','protect');const article=Life.news(s).find(item=>item.kind==='match'&&item.competition===competition);assert.ok(article);assert.ok(article.headline.includes(score.join('–')));assert.deepEqual(S.restore(copy(s)),s);seen.add(competition);}else s=play(s);}
 assert.deepEqual([...seen].sort(),['cup','europe']);
});

test('penalty shootout reports and interviews describe the actual winner without adding shootout goals to scoring records',()=>{
 let s=S.create(2),found=false;delete s.disciplineRules;delete s.match.discipline;while(s.match){finish(s.match);const competition=s.competition,score=[...s.match.score];s=S.settle(s);if(competition==='cup'&&s.lastReport.penalties){found=true;const article=Life.news(s).find(item=>item.kind==='match'&&item.competition==='cup');assert.ok(article.headline.includes('승부차기 승리'));assert.ok(article.headline.includes(score.join('–')));assert.ok(article.body.includes(s.lastReport.penalties.join('–')));assert.ok(Life.pressStatus(s).after.question.includes('승부차기'));const receipt=Life.answerPress(s,'after','confident');assert.equal(receipt.winner,S.own);assert.deepEqual(receipt.penalties,s.lastReport.penalties);assert.equal(Life.pressStatus(s).reputation,2);assert.deepEqual(S.restore(copy(s)),s);break;}}
 assert.equal(found,true);
});

test('a whole season caps recent articles and reputation, preserves all allowed answers and starts the next cleanly',()=>{
 let s=S.create(121);let games=0;while(s.match){Life.answerPress(s,'before',games%2?'confident':'protect');finish(s.match,{talks:true});s=S.settle(s);Life.answerPress(s,'after','modest');games++;assert.ok(Life.news(s).length<=12);assert.ok(Math.abs(Life.pressStatus(s).reputation)<=5);assert.deepEqual(S.restore(copy(s)),s);}
 assert.equal(s.clubLife.press.length,games*2);assert.ok(s.clubLife.press.length<=50);assert.equal(s.clubLife.news.length,12);const next=S.nextSeason(s);assert.equal(next.clubLife.year,2);assert.deepEqual(next.clubLife.press,[]);assert.deepEqual(next.clubLife.news,[]);assert.equal(Life.pressStatus(next).reputation,0);assert.deepEqual(S.restore(copy(next)),next);
});

test('club save validation rejects unknown versions, invalid origins, false results, future fixtures and duplicate answers',()=>{
 let s=S.create(91);Life.answerPress(s,'before','confident');s=play(s);Life.answerPress(s,'after','modest');
 for(const mutate of [l=>l.version=2,l=>l.year++,l=>l.originLedger=-1,l=>l.originLedger=100000,l=>l.press.push(copy(l.press[0])),l=>l.press[0].choice='fake',l=>l.press[0].home='future',l=>l.press[0].id='match-1-14',l=>l.press[0].score=[9,0],l=>l.press[1].score[0]++,l=>l.news.push(copy(l.news[0])),l=>l.news[0].source='cup-1-2',l=>l.extra=true]){const bad=copy(s);mutate(bad.clubLife);assert.throws(()=>S.restore(bad));}
});

test('legacy campaigns acquire optional club state without changing any current match or historical result',()=>{
 for(const minute of [0,17,45,65,90]){const s=S.create(121);advance(s.match,minute);s.match.paused=F.running(s.match);const legacy=copy(s);delete legacy.clubLife;const restored=S.restore(legacy);assert.deepEqual(restored.match,s.match);assert.deepEqual(restored.results,s.results);assert.deepEqual(restored.history,s.history);assert.equal(restored.clubLife.originLedger,legacy.finance.ledger.length);assert.equal(Object.hasOwn(restored.match,'morale'),false);finish(s.match);finish(restored.match);for(const key of ['score','rng','logs','segments','players'])assert.deepEqual(restored.match[key],s.match[key]);}
});
console.log('Validated '+groups+' club-life groups for bounded actual team talks, deterministic resumes, canonical interviews and local game articles.');
