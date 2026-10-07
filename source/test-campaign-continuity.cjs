'use strict';
const assert=require('node:assert/strict'),S=require('./dist/season.js'),F=require('./dist/engine.js'),E=require('./dist/economy.js'),H=require('./dist/health.js'),Staff=require('./dist/staff.js'),Training=require('./dist/training.js'),Board=require('./dist/owner-board.js'),Plans=require('./dist/squad-plans.js'),Transfers=require('./dist/transfer-plans.js'),Suspensions=require('./dist/suspensions.js'),Review=require('./dist/season-review.js'),Calendar=require('./dist/season-calendar.js'),Career=require('./dist/career-records.js'),Files=require('./dist/campaign-file.js');
let restores=0,matches=0;
for(const [seed,modern] of [[121,true],[4433,false]]){
 let s=S.create(seed,{suspensions:modern}),label='initial';
 const check=()=>{try{assert.deepEqual(S.restore(JSON.parse(JSON.stringify(s))),s);restores++;}catch(e){e.message=label+' · '+e.message;throw e;}};
 for(let year=0;year<2;year++){
  while(s.match){
   label=seed+' / '+s.year+'시즌 '+s.round+'R '+s.competition;check();
   if(!s.suspensions&&s.round>=1){s=Suspensions.enable(s);check();}
   if(s.competition==='league'){
    for(const role of ['MID','FW','MED']){const active=Staff.active(s,role);if(active?.remaining===1&&Staff.quote(s,'renew',role).available){Staff.renew(s,role);check();}else if(!active){const candidate=Staff.candidates(s).find(p=>p.role===role&&p.tier===1);if(Staff.quote(s,'hire',candidate.id).available){Staff.hire(s,candidate.id);check();}}}
    if(s.round%7===0&&!s.career.reports.some(r=>r.cycle===(s.round<Math.ceil(S.roundCount(s)/2)?1:2))&&s.finance.balance>60000){s=S.scout(s,['FW','MID'][year]);check();const identity=s.career.reports.at(-1).candidates[year],person=F.identityProfile(identity),slot=Object.values(s.squad).filter(p=>p.pos===person.pos).at(-1).id;if(E.quote(s,identity,slot).balanceAfter>30000){const before=JSON.stringify(s),p=Transfers.preview(s,identity,slot);assert.equal(JSON.stringify(s),before);s=Transfers.confirm(s,identity,slot,p.fingerprint);check();}}
    if(s.round%7===3){const row=Transfers.search(s,{affordableOnly:true,sort:'potential'}).rows.find(r=>r.quote.balanceAfter>30000);if(row){const p=Transfers.preview(s,row.identity,row.slot);s=Transfers.confirm(s,p.identity,p.slot,p.fingerprint);check();}}
    const board=Board.read(s),choice=['investment','youth','results','protect'].find(id=>board.options.find(o=>o.id===id&&o.available));if(choice){s=Board.meet(s,choice,choice==='youth'?board.youth[0].identity:null);check();}
    const focus=['technique','recovery','pace','fitness'][s.round%4],player=Object.values(s.squad).find(p=>Training.preview(s,p.id,focus).available);if(s.round%2&&player)Training.train(s,player.id,focus,player.identity);else S.train(s,focus);check();
   }
   F.setFormation(s.match,['442','433','352'][matches%3]);H.rotate(s);check();
   const slot=['a','b','c'][matches%3];s=Plans.save(s,slot,'통합 검증 '+slot);const plan=Plans.preview(s,slot);s=Plans.apply(s,slot,plan.fingerprint);check();
   if(matches%5===0){s=Transfers.toggle(s,'t_f2');check();}
   F.teamTalk(s.match,['encourage','calm','praise'][matches%3]);check();
   while(s.match.phase!=='full'){
    if(!F.running(s.match))F.begin(s.match);F.finishSegment(s.match);check();
    if(['half','late'].includes(s.match.phase)){
     F.teamTalk(s.match,'calm');check();
     const bench=Object.values(s.match.players).filter(p=>!s.match.lineup.includes(p.id)&&!s.match.out.includes(p.id)&&F.isAvailable(p)),out=s.match.lineup.find(id=>F.isAvailable(s.match.players[id])&&!s.match.discipline?.events.some(e=>e.team===0&&e.id===id&&e.card==='red')&&bench.some(p=>p.pos===s.match.players[id].pos)),inside=out&&bench.find(p=>p.pos===s.match.players[out].pos);
     if(inside){F.swap(s.match,out,inside.id);check();}F.setTactic(s.match,['counter','press','balanced'][matches%3]);check();
    }
   }
   const before=JSON.stringify(s);Review.read(s);Calendar.read(s);Career.summary(s);assert.equal(JSON.stringify(s),before);s=S.settle(s);matches++;check();
  }
  const review=Review.read(s);assert.equal(review.finance.closing,s.finance.balance);assert.equal(s.statistics.records.filter(r=>r.competition==='league').length,S.roundCount(s));const payload=Files.read(Files.stringify({season:s,view:'squad',records:{tab:'records',filter:'all',sort:'minutes',year:s.year}})).payload;assert.deepEqual(payload.season,s);const book=JSON.stringify(s.squadPlans),watch=JSON.stringify(s.transferPlans),career=Career.summary(s).recordedGoals;s=S.nextSeason(s);check();assert.equal(JSON.stringify(s.squadPlans),book);assert.equal(JSON.stringify(s.transferPlans),watch);assert.equal(Career.summary(s).recordedGoals,career);
 }
 console.log('PASS seed '+seed+' survives two seasons of coaching, scouting, reviewed transfers, board meetings, training, saved lineups, talks, cards and substitutions');
}
console.log('Validated '+matches+' complete fixtures and '+restores+' exact action-by-action restore checks across current campaigns.');
