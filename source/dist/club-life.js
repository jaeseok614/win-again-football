(function(root){
 'use strict';
 const F=root.Football||(typeof require==='function'?require('./engine.js'):null),own='brynwell',copy=x=>JSON.parse(JSON.stringify(x)),clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
 const talkChoices=F.talkChoices,pressChoices=Object.freeze([{id:'modest',label:'겸손한 답변',description:'한 경기씩 준비하고 상대를 존중합니다.'},{id:'confident',label:'자신 있게',description:'우리 선수들을 믿고 결과에 책임집니다.'},{id:'protect',label:'선수 보호',description:'결과의 책임은 감독에게, 부담은 덜어 줍니다.'}]);
 const windows={prep:'경기 전',half:'하프타임',late:'65분'},competitions={league:'리그',cup:'국내컵',europe:'챔피언스리그'},fail=()=>{throw Error('저장한 팀 대화와 구단 소식을 읽을 수 없어요.');};
 const exact=(x,keys)=>!!x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).length===keys.length&&keys.every(key=>Object.hasOwn(x,key)),same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
 function initialize(s){s.clubLife={version:1,year:s.year,originLedger:s.finance.ledger.length,press:[],news:[]};return s;}
 function decorate(s,reactions){return reactions.map(reaction=>{const traits=F.mentalProfile(reaction.identity),reason=reaction.delta>0?(traits.loyalty>=16?'감독에 대한 충성심으로 힘을 냈습니다.':traits.professionalism>=16?'프로 의식으로 지시를 받아들입니다.':traits.pressure<=8?'부담이 줄어 마음을 다잡았습니다.':'승부욕을 다시 끌어올립니다.'):reaction.delta<0?(traits.loyalty<=8?'감독의 말에 아직 확신이 없습니다.':'강한 요구를 부담스럽게 느낍니다.'):'차분히 듣고 기존 집중력을 유지합니다.';return {...reaction,traits,name:F.identityProfile(reaction.identity)?.name||s.match?.players[reaction.id]?.name||reaction.id,feeling:reaction.delta>0?'힘을 얻었어요':reaction.delta<0?'긴장했어요':'차분히 듣고 있어요',text:reason};});}
 function talkStatus(s){const m=s.match,window=windows[m?.phase]||'경기 진행 중',last=m?.decisions?.find(d=>d.type==='talk'&&d.minute===m.minute)||null,allowed=!!m&&!!windows[m.phase];return {available:allowed&&!last,minute:m?.minute??0,window,reason:last?'이 구간의 대화를 마쳤어요.':allowed?null:'경기 전·하프타임·65분에 선수들에게 말할 수 있어요.',last:last?copy(last):null,reactions:decorate(s,last?.reactions||[])};}
 function previewTalk(s,choice){if(!talkStatus(s).available)return [];return decorate(s,F.talkReactions(s.match,choice));}
 function talk(s,choice){if(!talkStatus(s).available)throw Error(talkStatus(s).reason);return F.teamTalk(s.match,choice);}
 function matchEntries(s){return s.finance.ledger.slice(s.clubLife.originLedger).filter(entry=>entry.year===s.year&&['match','cup','europe'].includes(entry.type));}
 function currentSpec(s,{availableOnly=true}={}){
  if(!s.match||availableOnly&&(s.match.phase!=='prep'||s.match.minute!==0))return null;const fixture=root.Season.fixtureFor(s),competition=s.competition,stage=competition==='cup'?s.cup.stage:competition==='europe'?s.europe.stage:null,round=competition==='league'?s.round+1:s.round;
  return {id:competition==='league'?'match-'+s.year+'-'+round:competition+'-'+s.year+'-'+stage,year:s.year,competition,round,stage,home:fixture.home,away:fixture.away,score:null,winner:null,penalties:null};
 }
 function settledSpec(s,entry){
  const competition=entry.type==='match'?'league':entry.type,stage=competition==='league'?null:entry.stage,fixture=competition==='league'?s.results.find(result=>result.round===entry.round-1&&(result.home===own||result.away===own)):s[competition==='cup'?'cup':'europe'].results.find(result=>result.stage===stage&&(result.home===own||result.away===own));
  if(!fixture)fail();return {id:entry.id,year:entry.year,competition,round:entry.round,stage,home:fixture.home,away:fixture.away,score:fixture.home===own?[...fixture.goals]:[fixture.goals[1],fixture.goals[0]],winner:competition==='league'?(fixture.goals[0]===fixture.goals[1]?null:fixture.goals[0]>fixture.goals[1]?fixture.home:fixture.away):fixture.winner,penalties:fixture.penalties?(fixture.home===own?[...fixture.penalties]:[fixture.penalties[1],fixture.penalties[0]]):null};
 }
 function opponent(spec){const id=spec.home===own?spec.away:spec.home;return root.Season.club(id)?.short||root.Season.club(id)?.name||id;}
 function question(s,phase,spec){if(!spec)return null;const answer=s.clubLife.press.find(record=>record.id===spec.id&&record.phase===phase),win=spec.winner===own;return {...copy(spec),phase,opponent:opponent(spec),question:phase==='before'?opponent(spec)+'전, 어떤 마음으로 준비하고 있나요?':spec.penalties?(win?'승부차기로 다음 단계에 오른 선수들에게 어떤 말을 전할까요?':'승부차기 패배 뒤 선수들에게 어떤 말을 전할까요?'):win?'승리의 주인공인 선수들에게 어떤 말을 전할까요?':spec.score[0]===spec.score[1]?'무승부를 어떻게 받아들이고 다음 경기를 준비할까요?':'오늘 결과에 대해 선수들과 팬들에게 전할 말이 있나요?',answered:!!answer,choice:answer?.choice??null};}
 function publicDelta(record){if(record.choice==='protect')return -1;if(record.choice==='modest')return record.phase==='after'&&record.winner!==own?1:0;if(record.phase==='before')return 1;return record.winner===own?2:record.winner?-2:0;}
 function pressStatus(s){
  const life=s.clubLife;if(!life)return {before:null,after:null,reputation:0,message:'구단 소식이 준비되면 인터뷰가 열립니다.'};const entries=matchEntries(s),last=entries.at(-1),reputation=life.press.reduce((value,record)=>clamp(value+publicDelta(record),-5,5),0);
  return {before:question(s,'before',currentSpec(s)),after:question(s,'after',last?settledSpec(s,last):null),reputation,message:reputation>=2?'언론은 감독의 분명한 목소리에 관심을 보입니다.':reputation<=-2?'언론의 질문은 날카로워졌지만 선수 보호의 뜻은 전해졌습니다.':'차분히 구단의 이야기를 전하고 있습니다.'};
 }
 function answerPress(s,phase,choice){
  if(!pressChoices.some(option=>option.id===choice)||!['before','after'].includes(phase))throw Error('인터뷰의 답변을 선택하세요.');const status=pressStatus(s)[phase];if(!status||status.answered)throw Error('인터뷰는 경기 전·후 각각 한 번 할 수 있어요.');
  const record={id:status.id,phase,choice,year:status.year,competition:status.competition,round:status.round,stage:status.stage,home:status.home,away:status.away,score:copy(status.score),winner:status.winner,penalties:copy(status.penalties)};s.clubLife.press.push(record);return {...copy(record),reputation:pressStatus(s).reputation};
 }
 function expectedNews(s){return matchEntries(s).slice(-12).map(entry=>({id:'article-'+entry.id,kind:'match',source:entry.id}));}
 function afterMatch(s){if(!s.clubLife)initialize(s);s.clubLife.news=expectedNews(s);return s;}
 function nextYear(s){initialize(s);return s;}
 function news(s){
  if(!s.clubLife)return [];const life=s.clubLife,ledger=s.finance.ledger.slice(life.originLedger),list=[],clubShort=root.Season.club(own)?.short||'블랙본';
  for(let index=0;index<ledger.length;index++){
   const entry=ledger[index];if(entry.year!==s.year)continue;
   if(['match','cup','europe'].includes(entry.type)){
    const spec=settledSpec(s,entry),win=spec.winner===own,draw=!spec.winner,record=s.statistics?.records?.find(record=>record.id===entry.id),scorers=[...new Set((record?.events||[]).map(event=>F.identityProfile(event.scorerIdentity)?.name).filter(Boolean))],names=scorers.length?' 득점 기록: '+scorers.join(', ')+'.':'',penalties=spec.penalties?' 승부차기 '+spec.penalties.join('–')+'로 '+(win?'승리했습니다.':'패배했습니다.'):'';
    list.push({id:'article-'+entry.id,kind:'match',year:s.year,competition:spec.competition,tag:competitions[spec.competition]+' 경기 기사',headline:clubShort+', '+opponent(spec)+'전 '+spec.score.join('–')+' '+(spec.penalties?'승부차기 ':'')+(win?'승리':draw?'무승부':'패배'),body:competitions[spec.competition]+'에서 '+clubShort+'은 '+(spec.home===own?'홈':'원정')+' 경기를 '+spec.score.join('–')+'로 마쳤습니다.'+penalties+names+(win?' 선수단은 다음 경기를 향해 다시 준비합니다.':draw?' 접전의 경험을 다음 경기 준비에 이어갑니다.':' 선수단은 경기를 돌아보고 다시 집중합니다.'),order:index*3+1});
   }else if(entry.type==='staff-hire'){
    const person=root.Staff?.candidates(s).find(person=>person.id===entry.candidate);if(person)list.push({id:'article-'+entry.id,kind:'staff',year:s.year,competition:'club',tag:'코치 계약',headline:person.name+', '+clubShort+' '+person.label+' 부임',body:'구단은 리그 '+person.term+'경기 계약으로 '+person.name+' 코치를 영입했습니다. 훈련과 선수 관리를 도울 새 목소리가 합류했습니다.',order:index*3+1});
   }
  }
  for(const record of life.press){const index=ledger.findIndex(entry=>entry.id===record.id),label=pressChoices.find(option=>option.id===record.choice).label,statement=record.choice==='modest'?'상대를 존중하며 한 경기씩 준비하겠다.':record.choice==='confident'?'우리 선수들을 믿고 감독으로서 결과에 책임지겠다.':'선수들은 최선을 다했다. 결과의 책임은 감독에게 있다.';list.push({id:'article-'+record.id+'-'+record.phase,kind:'press',year:s.year,competition:record.competition,tag:record.phase==='before'?'경기 전 인터뷰':'경기 후 인터뷰',headline:opponent(record)+'전, 감독의 '+label,body:statement+' '+(record.choice==='protect'?'선수단은 감독의 보호 메시지를 들었습니다.':record.choice==='confident'?'팬들은 자신 있는 답변과 실제 경기 결과를 함께 지켜봅니다.':'구단은 준비 과정과 침착함을 강조했습니다.'),order:(index<0?ledger.length:index)*3+(record.phase==='before'?0:2)});}
  return list.sort((a,b)=>b.order-a.order||b.id.localeCompare(a.id)).slice(0,12).map(({order,...article})=>article);
 }
 function validate(s){
  const life=s.clubLife;if(!exact(life,['version','year','originLedger','press','news'])||life.version!==1||life.year!==s.year||!Number.isInteger(life.originLedger)||life.originLedger<0||life.originLedger>s.finance.ledger.length||s.finance.ledger.slice(life.originLedger).some(entry=>entry.year!==s.year)||!Array.isArray(life.press)||life.press.length>2*((root.Season?.roundCount(s)??46)+11)||!Array.isArray(life.news)||life.news.length>12)fail();
  const settled=new Map(matchEntries(s).map(entry=>[entry.id,settledSpec(s,entry)])),current=currentSpec(s,{availableOnly:false}),seen=new Set();if(current)settled.set(current.id,current);
  for(const record of life.press){
   if(!exact(record,['id','phase','choice','year','competition','round','stage','home','away','score','winner','penalties'])||!['before','after'].includes(record.phase)||!pressChoices.some(option=>option.id===record.choice)||seen.has(record.id+'-'+record.phase))fail();seen.add(record.id+'-'+record.phase);
   const spec=settled.get(record.id);if(!spec||record.phase==='after'&&spec.score===null)fail();const expected={id:spec.id,phase:record.phase,choice:record.choice,year:spec.year,competition:spec.competition,round:spec.round,stage:spec.stage,home:spec.home,away:spec.away,score:record.phase==='before'?null:spec.score,winner:record.phase==='before'?null:spec.winner,penalties:record.phase==='before'?null:spec.penalties};if(!same(record,expected))fail();
  }
  if(!same(life.news,expectedNews(s)))fail();return s;
 }
 function restore(s,raw){if(raw===undefined){initialize(s);return s;}s.clubLife=copy(raw);validate(s);return s;}
 const api={talkChoices,pressChoices,initialize,talkStatus,previewTalk,talk,pressStatus,answerPress,afterMatch,nextYear,news,validate,restore};root.ClubLife=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
