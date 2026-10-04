'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const F=require('./dist/engine.js'),S=require('./dist/season.js'),T=require('./dist/training.js'),P=require('./dist/cup.js'),H=require('./dist/health.js'),R=require('./dist/match-review.js'),Portraits=require('./dist/portraits.js');
function legacyFixture(seed){const s=S.create(seed);delete s.disciplineRules;delete s.match.discipline;return s;}
const copy=value=>JSON.parse(JSON.stringify(value));let groups=0;
function test(name,fn){fn();groups++;console.log('PASS '+name);}
function full(s,decisions=false){
 const m=s.match;F.setTactic(m,decisions?'counter':'balanced');F.begin(m);
 const sub=(pos,wantedOut,wantedIn)=>{const out=m.lineup.includes(wantedOut)?wantedOut:m.lineup.find(id=>m.players[id].pos===pos),fit=id=>m.players[id]?.pos===pos&&!m.lineup.includes(id)&&!m.out.includes(id)&&F.isAvailable(m.players[id]),incoming=fit(wantedIn)?wantedIn:Object.keys(m.players).find(fit);if(incoming)F.swap(m,out,incoming);};
 while(m.phase!=='full'){if(F.running(m)){F.tick(m);continue;}if(decisions&&m.phase==='half'){sub('FW','f1','f3');F.setTactic(m,'press');}if(decisions&&m.phase==='late'){sub('MID','m4','m5');F.setTactic(m,'balanced');}F.begin(m);}return s;
}
function fixtures(){let pending=legacyFixture(2);pending=S.settle(full(pending));pending=S.settle(full(pending));full(pending,true);const confirmed=S.settle(copy(pending)),cupPrep=S.settle(full(copy(confirmed))),cupPending=full(copy(cupPrep),true),cupConfirmed=S.settle(copy(cupPending));return {pending,confirmed,cupPrep,cupPending,cupConfirmed};}
function harness(season){
 const calls={settle:0,train:0,recruit:0,tick:0},portraits=[],target={innerHTML:''},deny=kind=>(()=>{calls[kind]++;throw Error('review attempted '+kind);});
 const context=vm.createContext({season,F:{...F,tick:deny('tick')},S:{...S,settle:deny('settle'),recruit:deny('recruit'),train:deny('train')},Training:{train:deny('train')},P,H,MatchReview:R,Portraits:{html(p,options){portraits.push(p.identity);return Portraits.html(p,options);}},$:id=>id==='last-round'?target:null});
 for(const file of ['market-ui.js','academy-ui.js','match-review-ui.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'dist',file),'utf8'),context);
 return {context,calls,portraits,target,render:(d,options)=>context.matchReviewMarkup(d,options)};
}
function same(h,before){assert.equal(JSON.stringify(h.context.season),before);assert.deepEqual(h.calls,{settle:0,train:0,recruit:0,tick:0});}
function freeze(value){if(value&&typeof value==='object'){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;}
function oldV5(){const context=vm.createContext({});for(const file of ['engine','economy','career','cup','season'])vm.runInContext(fs.readFileSync(path.join(__dirname,'legacy-v5',file+'.js'),'utf8'),context);let s=context.Season.create(1405);while(s.match.phase!=='full'){if(!context.Football.running(s.match))context.Football.begin(s.match);context.Football.tick(s.match);}return S.restore(copy(context.Season.settle(s)));}
const base=fixtures();

test('pending full-time review shows real goals and minutes without claiming settlement, growth, health or money',()=>{
 const s=copy(base.pending),h=harness(s),before=JSON.stringify(s),d=R.read(s,{source:'pending'}),html=h.render(d);
 assert.equal(d.valid,true);assert.match(html,/FULL TIME \/ NOT CONFIRMED/);assert.match(html,/<h3>경기 결과와 선수 기록<\/h3>/);assert.match(html,/결과 확정 전/);assert.match(html,/결과를 확정해야 경험·성장·부상·재정에 반영됩니다/);assert.match(html,/20′/);assert.match(html,/48′/);assert.match(html,/손헝민/);assert.match(html,/킬리안 음바뻬/);assert.match(html,/케빈 더브라이닝/);assert.match(html,/파올로 말디닝/);assert.match(html,/45<small>분/);assert.match(html,/25<small>분/);assert.doesNotMatch(html,/90분을 뛴 선수들|review-settlement|review-cash|review-growth-player|review-health-line|확정 완료/);same(h,before);
});

test('confirmed growth remains the exact earned +1 after later training and next-match changes',()=>{
 const s=copy(base.confirmed);T.train(s,'g1','technique','g1');F.begin(s.match);for(let i=0;i<8;i++)F.tick(s.match);
 const h=harness(s),before=JSON.stringify(s),d=R.read(s),html=h.render(d);assert.equal(d.valid,true);assert.equal(s.squad.g1.keeping,F.identityProfile('g1').keeping+3);assert.ok(d.growth.some(p=>p.identity==='g1'&&p.gained===1));assert.match(html,/data-review-id="match-1-3"/);assert.match(html,/전체 대회 최근 확정 경기/);assert.match(html,/리그 3R/);assert.match(html,/2 : 2/);assert.match(html,/선방 \+1/);assert.doesNotMatch(html,/선방 \+3|리그 4R/);assert.match(html,/확정 완료/);assert.match(html,/review-cash/);assert.match(html,/45<small>분/);same(h,before);
});

test('league-to-cup preparation still renders the last confirmed league receipt rather than the next Cup opponent',()=>{
 const s=copy(base.cupPrep),h=harness(s),before=JSON.stringify(s);assert.equal(s.competition,'cup');h.context.renderLatestMatchReview();const html=h.target.innerHTML;
 assert.match(html,/data-review-id="match-1-4"/);assert.match(html,/리그 4R/);assert.match(html,/0 : 1/);assert.match(html,/셰필턴/);assert.doesNotMatch(html,/컵 8강|data-review-id="cup-/);assert.match(html,/새 부상·복귀 선수가 없습니다/);same(h,before);
});

test('Cup settlement shows actual goals and the matching new injury even after returning to a league fixture',()=>{
 const s=copy(base.cupConfirmed),h=harness(s),before=JSON.stringify(s),d=R.read(s),html=h.render(d);assert.equal(s.competition,'league');assert.equal(d.competition,'cup');assert.match(html,/data-review-id="cup-1-0"/);assert.match(html,/컵 8강/);assert.match(html,/3 : 0/);for(const minute of [18,48,85])assert.ok(html.includes(minute+'′'));assert.match(html,/주드 벨링험/);assert.match(html,/근육 부상 · 2경기 휴식/);assert.match(html,/휴식 판정/);assert.doesNotMatch(html,/리그 5R|class="review-penalties"/);same(h,before);
 const pendingHtml=harness(copy(base.cupPending)).render(R.read(base.cupPending,{source:'pending'}));assert.doesNotMatch(pendingHtml,/휴식 판정|2경기 휴식|review-settlement/);
});

test('legacy completed games disclose limited attribution and missing health instead of inventing scorers or participation',()=>{
 const s=oldV5(),h=harness(s),before=JSON.stringify(s),d=R.read(s),html=h.render(d);assert.equal(d.valid,true);assert.equal(d.legacy,true);assert.equal(d.players.length,0);assert.equal(d.events.length,0);assert.match(html,/이전 저장에는 이 경기의 선수별 출전·득점 자료가 없습니다/);assert.match(html,/이 경기의 건강 점검 자료가 없습니다/);assert.doesNotMatch(html,/review-featured-player|review-roster|review-events|review-health-line|새 부상·복귀 선수가 없습니다/);same(h,before);
});

test('partial coverage without unassigned goals explains continuation without falsely claiming unknown scorers',()=>{
 const old=vm.createContext({});for(const file of ['engine','economy','career','cup','health','season'])vm.runInContext(fs.readFileSync(path.join(__dirname,'legacy-v7',file+'.js'),'utf8'),old);
 let resumed,raw;for(let seed=1;seed<=30&&!resumed;seed++){const candidate=old.Season.create(seed);old.Football.begin(candidate.match);for(let i=0;i<17;i++)old.Football.tick(candidate.match);if(candidate.match.score[0])continue;const migrated=S.restore(copy(candidate));while(migrated.match.phase!=='full'){if(!F.running(migrated.match))F.begin(migrated.match);F.finishSegment(migrated.match);}if(migrated.match.score[0]>0){resumed=S.settle(migrated);raw=candidate;}}
 assert.ok(resumed,'normal migration should include a post-upgrade goal');const h=harness(resumed),before=JSON.stringify(resumed),d=R.read(resumed),html=h.render(d);assert.equal(d.valid,true);assert.equal(d.coverage.partial,true);assert.equal(d.coverage.unassignedGoals,0);assert.equal(d.coverage.statisticsOriginMinute,17);assert.match(html,/이전 저장에서 이어진 경기입니다\. 기록이 있는 득점부터 집계합니다/);assert.match(html,/전체 대회 최근 확정 경기/);assert.doesNotMatch(html,/선수 미지정|득점 선수가 기록되지 않은 골|선수별 출전·득점 자료가 없습니다/);same(h,before);
 while(raw.match.phase!=='full'){if(!old.Football.running(raw.match))old.Football.begin(raw.match);old.Football.finishSegment(raw.match);}const oldFull=S.restore(copy(raw)),pending=R.read(oldFull,{source:'pending'});assert.ok(pending.coverage.unassignedGoals>0);const unknownHtml=harness(oldFull).render(pending);assert.match(unknownHtml,/득점 선수가 기록되지 않은 골이 있습니다/);assert.ok(unknownHtml.includes('선수 미지정 '+pending.coverage.unassignedGoals+'골'));assert.doesNotMatch(unknownHtml,/기록이 있는 득점부터 집계합니다/);
});

test('departed identities retain their own portrait and historical name without linking the new occupant player card',()=>{
 const s=S.recruit(copy(base.confirmed),'t_f1','f2'),h=harness(s),before=JSON.stringify(s),d=R.read(s),html=h.render(d);assert.equal(s.squad.f2.identity,'t_f1');assert.ok(d.players.some(p=>p.identity==='f2'&&!p.owned&&p.goals===1));assert.match(html,/review-former-player/);assert.match(html,/손헝민/);assert.match(html,/경기 당시 선수/);assert.doesNotMatch(html,/data-player-detail="f2"|리오넬 메씨/);assert.ok(h.portraits.includes('f2'));assert.ok(!h.portraits.includes('t_f1'));same(h,before);
});

test('player names, event names, opponent text and review identity are escaped in every rendered location',()=>{
 const s=copy(base.cupConfirmed),h=harness(s),d=copy(R.read(s)),before=JSON.stringify(s),payload='<img src=x onerror="bad()"> & \'Q\'';
 d.id=payload;d.opponent.short=payload;for(const p of d.players)p.name=payload;for(const p of d.growth){p.name=payload;p.key=payload;}for(const p of d.injuries)p.name=payload;for(const e of d.events){e.scorerName=payload;e.assistName=payload;}const html=h.render(d);
 assert.doesNotMatch(html,/<img|onerror="/);assert.ok((html.match(/&lt;img src=x onerror=&quot;bad\(\)&quot;&gt; &amp; &#39;Q&#39;/g)||[]).length>10);assert.match(html,/data-review-id="&lt;img/);same(h,before);
});

test('unaligned health is omitted and incompatible latest reports clear the compact review',()=>{
 const s=copy(base.cupConfirmed),h=harness(s);s.health.lastReport.competition='league';let before=JSON.stringify(s),d=R.read(s),html=h.render(d);assert.equal(d.valid,true);assert.equal(d.healthAligned,false);assert.match(html,/이 경기의 건강 점검 자료가 없습니다/);assert.doesNotMatch(html,/휴식 판정|근육 부상 · 2경기/);same(h,before);
 s.lastReport.score=[90,90];before=JSON.stringify(s);h.target.innerHTML='old review';h.context.renderLatestMatchReview();assert.equal(h.target.innerHTML,'');assert.equal(h.render({valid:false}), '');same(h,before);
});

test('repeated compact and expanded rendering reads frozen snapshots and never advances or settles a season',()=>{
 const s=freeze(copy(base.confirmed)),h=harness(s),d=freeze(R.read(s)),before=JSON.stringify(s),reviewBefore=JSON.stringify(d),html=h.render(d);
 for(let i=0;i<4;i++){assert.equal(h.render(d),html);const compact=h.render(d,{compact:true});assert.match(compact,/review-compact/);h.context.renderLatestMatchReview();assert.equal(h.target.innerHTML,compact);}assert.equal(JSON.stringify(d),reviewBefore);same(h,before);
});
console.log('Validated '+groups+' match review UI groups, including pending and confirmed boundaries, historical values, partial saves, identity portraits and read-only rendering.');
