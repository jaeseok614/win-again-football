
'use strict';
const assert=require('node:assert/strict'),F=require('./dist/engine'),S=require('./dist/season'),Media=require('./dist/media-room'),Life=require('./dist/club-life'),News=require('./dist/newsroom');let groups=0;
function test(name,fn){fn();groups++;console.log('PASS '+name);}
test('article summaries preserve full prose without fabricating a first result',()=>{
 const s=S.create(41,{startingClub:true,suspensions:true}),before=JSON.stringify(s);
 for(const item of Media.read(s)){const a=News.get(s,'review:'+item.style);assert.equal(a.paragraphs[0],item.body);assert.equal(a.summary,News.summary(item.body));assert.ok(a.paragraphs.some(p=>p.includes('아직 확정된')));assert.equal(a.fictional,true);}
 assert.equal(News.get(s,'review:missing'),null);assert.equal(News.get(s,'news:missing'),null);assert.equal(News.get(s,null),null);assert.equal(JSON.stringify(s),before);
});
test('confirmed and interview articles preserve actual score, identities and saves',()=>{
 let s=S.create(41,{startingClub:true,suspensions:true});Life.answerPress(s,'before','protect');while(s.match.phase!=='full'){if(!F.running(s.match))F.begin(s.match);F.finishSegment(s.match);}s=S.settle(s);const before=JSON.stringify(s),last=s.statistics.records.at(-1);
 for(const n of Life.news(s)){const a=News.get(s,'news:'+n.id);assert.equal(a.paragraphs.join('\n\n'),n.body);assert.equal(a.headline,n.headline);assert.equal(a.year,n.year);}
 for(const item of Media.read(s)){const a=News.get(s,'review:'+item.style);assert.ok(a.paragraphs.at(-1).includes(last.score.join(' : ')));}
 assert.equal(JSON.stringify(s),before);assert.equal(JSON.stringify(S.restore(JSON.parse(before))),before);
});
test('summary boundaries keep Korean words and decimal facts intact',()=>{
 assert.equal(News.summary('기대 득점 1.25로 앞섰다. 확정된 결과를 살펴본다.'),'기대 득점 1.25로 앞섰다.');assert.equal(News.summary('손헝민의 첫 기회'),'손헝민의 첫 기회');
});
console.log('Validated '+groups+' newsroom groups.');
