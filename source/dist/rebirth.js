(function(root){
 'use strict';
 const copy=x=>JSON.parse(JSON.stringify(x)),clamp=n=>Math.max(0,Math.min(100,n));
 const memories={none:{name:'첫 번째 삶',text:'아직 가져올 기억이 없습니다.'},calm:{name:'평정심',text:'새 회차의 이사회 여유 +8.'},fight:{name:'승부의 기억',text:'리그 승리 때 이사회 여유를 1 더 회복합니다.'},together:{name:'버티는 법',text:'무승부로 이사회 여유가 줄지 않습니다.'}};
 const events=[
  {speaker:'구단주',title:'빈 관중석 앞의 약속',line:'“구단을 믿고 기다리는 사람들에게 답이 필요합니다. 다음 세 경기, 무엇을 보여 주겠습니까?”',options:[{id:'steady',label:'승점부터 차곡차곡',metric:'points',target:4,reward:6,penalty:14},{id:'bold',label:'승리로 분위기를 바꾸겠습니다',metric:'points',target:6,reward:14,penalty:24}]},
  {speaker:'서포터 대표',title:'다시 노래할 이유',line:'“비가 와도 우리는 여기에 있습니다. 선수들이 싸우고 있다는 걸 보여 주세요.”',options:[{id:'steady',label:'골문부터 단단히 지키겠습니다',metric:'conceded',target:3,reward:6,penalty:14},{id:'bold',label:'공격 축구로 응원에 답하겠습니다',metric:'goals',target:6,reward:14,penalty:24}]},
  {speaker:'수석 코치',title:'흔들리는 라커룸',line:'“지시가 많아질수록 선수들은 헷갈립니다. 당장 세 경기 동안 붙잡을 목표 하나를 정하죠.”',options:[{id:'steady',label:'세 경기에서 두 번 이깁니다',metric:'wins',target:2,reward:6,penalty:14},{id:'bold',label:'세 경기를 모두 이기겠습니다',metric:'wins',target:3,reward:14,penalty:24}]}
 ];
 // Optional, seed-bound contract style belongs to a new life. Old saves keep
 // their original promises, even when a mission is already in progress.
 const contracts={
  classic:{label:'기존 약속',stance:'승점부터 차곡차곡 쌓는 약속을 이어갑니다.'},
  results:{label:'승부 우선형',stance:'“과정은 듣겠습니다. 그래도 관중에게 승리를 보여 줘야 합니다.”',options:[['한 번의 승리부터 만들겠습니다','wins',1],['두 번 이겨 기대에 답하겠습니다','wins',2]]},
  guardian:{label:'선수 보호형',stance:'“선수를 공개적으로 몰아세우지는 않겠습니다. 골문부터 함께 지켜 주세요.”',options:[['실점부터 함께 줄이겠습니다','conceded',4],['단 한 골까지 버티겠습니다','conceded',1]]},
  spotlight:{label:'언론 주도형',stance:'“기자들에게 들려줄 이야기가 필요합니다. 골로 말할 수 있겠습니까?”',options:[['경기마다 골을 향해 준비하겠습니다','goals',3],['여섯 골로 분위기를 바꾸겠습니다','goals',6]]},
  accounts:{label:'재정 현실형',stance:'“크게 말하기보다 감당할 목표를 정합시다. 새 투자 약속부터 하지는 않겠습니다.”',options:[['승점 세 점부터 책임지겠습니다','points',3],['승점 다섯 점에 도전하겠습니다','points',5]]}
 };
 function styleFor(seed){return ['results','guardian','spotlight','accounts'][(seed>>>0)%4];}
 function eventAt(n,style='classic'){if(!Number.isInteger(n)||n<6||n%6||!Object.hasOwn(contracts,style))throw Error('회차 면담 시점을 확인하세요.');const e=copy(events[(Math.floor(n/6)-1)%events.length]),c=contracts[style];if(style!=='classic'&&e.speaker==='구단주'){e.title='빈 관중석 앞의 약속 · '+c.label;e.line=c.stance+' 다음 리그 세 경기의 기준을 정하세요.';e.options=e.options.map((o,i)=>({...o,label:c.options[i][0],metric:c.options[i][1],target:c.options[i][2]}));}return {...e,after:n};}
 function targetText(o){return {points:'승점 '+o.target+'점 이상',goals:o.target+'득점 이상',conceded:'총 '+o.target+'실점 이하',wins:o.target+'승 이상'}[o.metric];}
 function points(r){return r.score[0]>r.score[1]?3:r.score[0]===r.score[1]?1:0;}
 function metric(rows,key){return rows.reduce((n,r)=>n+(key==='points'?points(r):key==='wins'?Number(points(r)===3):r.score[key==='goals'?0:1]),0);}
 function simulate(records,decisions,memory,canAppeal,contractStyle='classic'){
  if(!Object.hasOwn(contracts,contractStyle))throw Error('구단주 도전 성향을 확인하세요.');
  let confidence=60+(memory==='calm'?8:0),status='active',warning=null,mission=null,pending=null,appealed=false,cursor=0,lastChange=null;const timeline=[];
  function decide(n){
   while(decisions[cursor]?.after===n){const d=decisions[cursor++];
    if(d.kind==='appeal'){if(status!=='sacked'||appealed||!canAppeal||d.option!==null)throw Error('사용할 수 없는 유예 기록입니다.');appealed=true;status='active';warning=null;mission=null;pending=null;confidence=35;timeline.push({after:n,kind:'appeal',text:'한 번의 유예. 이번 삶에서 다시 쓸 수는 없습니다.'});}
    else if(d.kind==='deal'){if(!pending||status!=='active'||mission)throw Error('면담 시점이 맞지 않습니다.');const option=pending.options.find(o=>o.id===d.option);if(!option)throw Error('면담 선택을 확인하세요.');mission={...option,after:n,end:n+3,speaker:pending.speaker,title:pending.title};pending=null;}
    else throw Error('알 수 없는 회귀 선택입니다.');
   }
  }
  decide(0);
  for(let i=0;i<records.length;i++){
   if(status!=='active'||pending)throw Error('회차 종료 또는 미완료 면담 뒤에 경기가 있습니다.');
   const r=records[i],n=i+1,p=points(r),before=confidence;confidence=clamp(confidence+(p===3?4+(memory==='fight'?1:0):p===1?(memory==='together'?0:-3):-8));
   if(mission&&n===mission.end){const value=metric(records.slice(mission.after,n),mission.metric),success=mission.metric==='conceded'?value<=mission.target:value>=mission.target;confidence=clamp(confidence+(success?mission.reward:-mission.penalty));timeline.push({after:n,kind:success?'fulfilled':'missed',text:mission.speaker+'와의 약속 '+(success?'달성':'미달성'),target:targetText(mission),value});mission=null;}
   if(warning&&n===warning.end){const gained=metric(records.slice(warning.after,n),'points');if(gained>=3){confidence=Math.max(28,confidence);timeline.push({after:n,kind:'survived',text:'최후통첩을 넘겼습니다. 구단주가 마지막 악수를 건넵니다.'});warning=null;}else{status='sacked';pending=null;timeline.push({after:n,kind:'sacked',text:'세 경기에서 승점 3점을 얻지 못했습니다. 감독 계약이 종료됩니다.'});}}
   if(status==='active'&&!warning&&confidence<=20){warning={after:n,end:n+3,target:3};timeline.push({after:n,kind:'warning',text:'최후통첩: 다음 리그 3경기에서 승점 3점이 필요합니다.'});}
   if(status==='active'&&!warning&&!mission&&n%6===0)pending=eventAt(n,contractStyle);
   lastChange={after:n,delta:confidence-before,result:p===3?'승리':p===1?'무승부':'패배'};decide(n);
  }
  if(cursor!==decisions.length)throw Error('아직 오지 않은 시점의 회귀 선택입니다.');
  const n=records.length;
  if(mission)mission={...mission,value:metric(records.slice(mission.after),'points'===mission.metric?'points':mission.metric),remaining:mission.end-n,targetText:targetText(mission)};
  if(warning)warning={...warning,points:metric(records.slice(warning.after),'points'),remaining:warning.end-n};
  return {status,confidence,warning,mission,pending,appealed,timeline,lastChange,played:n,points:metric(records,'points'),wins:metric(records,'wins')};
 }
 function divisionFor(s,year){return year===s.year?s.league.division:s.history.find(h=>h.year===year)?.division;}
 function recordsFor(s){const o=s.rebirth.origin;return [...(s.statistics?.archive||[]).flatMap(a=>a.records),...(s.statistics?.records||[])].filter(r=>r.competition==='league'&&(r.year>o.year||r.year===o.year&&r.round>o.round)).map(r=>({year:r.year,round:r.round,division:r.division,score:[...r.score]}));}
 function read(s){
  if(!s?.rebirth)return {enabled:false,status:'unstarted'};
  const b=s.rebirth,records=recordsFor(s),contractStyle=b.contractStyle||'classic',r=simulate(records,b.decisions,b.memory,b.attempt>1,contractStyle),S=root.Season;
  const returned=s.league.division===1||S?.ready(s)&&S.movement(s).to===1;
  if(r.status==='active'&&returned){r.status='returned';r.pending=null;}
  return {...r,enabled:true,attempt:b.attempt,memory:b.memory,memoryInfo:memories[b.memory],contractStyle,contract:copy(contracts[contractStyle]),origin:copy(b.origin),previous:copy(b.previous),bestDivision:Math.min(b.origin.division,...records.map(r=>r.division),r.status==='returned'?1:s.league.division),canAppeal:r.status==='sacked'&&b.attempt>1&&!r.appealed,records};
 }
 function enable(s){if(s.rebirth)return s;if(s.match&&s.match.phase!=='prep')throw Error('진행 중 경기를 확정한 뒤 도전을 시작하세요.');const next=copy(s);next.rebirth={version:1,attempt:1,origin:{year:s.year,round:s.round,division:s.league.division},memory:'none',decisions:[],previous:[],...(s.year===1&&s.round===0?{contractStyle:styleFor(s.seed)}:{})};validate(next);return next;}
 function choose(s,option){const r=read(s);if(!r.pending||r.status!=='active'||s.match&&s.match.phase!=='prep')throw Error('지금 답할 회차 면담이 없습니다.');if(!r.pending.options.some(o=>o.id===option))throw Error('약속을 선택하세요.');const next=copy(s);next.rebirth.decisions.push({after:r.played,kind:'deal',option});validate(next);return next;}
 function appeal(s){const r=read(s);if(!r.canAppeal)throw Error('이번 회차에는 남은 기억의 유예가 없습니다.');const next=copy(s);next.rebirth.decisions.push({after:r.played,kind:'appeal',option:null});validate(next);return next;}
 function assertPlayable(s){const r=read(s);if(!r.enabled)return;if(r.status!=='active')throw Error(r.status==='sacked'?'경질된 회차입니다. 환생 화면에서 다음 도전을 선택하세요.':'1부 귀환을 이루었습니다. 회차 결말을 확인하세요.');if(r.pending)throw Error('다음 경기 전에 도전 면담의 약속을 정하세요.');}
 function restart(s,memory){const r=read(s);if(!['sacked','returned'].includes(r.status)||!Object.hasOwn(memories,memory)||memory==='none')throw Error('끝난 회차에서 다음 삶의 기억을 선택하세요.');const S=root.Season,seed=(Math.imul(s.seed^0x9e3779b9,1664525)+1013904223+r.attempt)>>>0,next=S.create(seed,{suspensions:true});const record={attempt:r.attempt,seed:s.seed,origin:copy(s.rebirth.origin),memory:r.memory,decisions:copy(s.rebirth.decisions),records:r.records,status:r.status,division:r.bestDivision,...(s.rebirth.contractStyle?{contractStyle:s.rebirth.contractStyle}:{})};next.rebirth={version:1,attempt:r.attempt+1,origin:{year:1,round:0,division:5},memory,decisions:[],previous:[...copy(s.rebirth.previous),record].slice(-12),contractStyle:styleFor(seed)};validate(next);return next;}
 const exact=(o,keys)=>o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).length===keys.length&&keys.every(k=>Object.hasOwn(o,k)),int=(n,a,b)=>Number.isInteger(n)&&n>=a&&n<=b;
 function contractShape(o,keys,seed){return exact(o,keys)||(exact(o,[...keys,'contractStyle'])&&o.contractStyle===styleFor(seed)&&o.origin.year===1&&o.origin.round===0);}
 function checkOrigin(o){if(!exact(o,['year','round','division'])||!int(o.year,1,10000)||!int(o.round,0,o.division===1?38:46)||!int(o.division,1,5))throw Error('회차 출발점을 확인하세요.');}
 function checkDecisions(ds){if(!Array.isArray(ds)||ds.length>80000)throw Error('회귀 면담 기록을 확인하세요.');let last=-1;for(const d of ds){if(!exact(d,['after','kind','option'])||!int(d.after,0,460000)||d.after<last||!['deal','appeal'].includes(d.kind)||d.kind==='deal'&&!['steady','bold'].includes(d.option)||d.kind==='appeal'&&d.option!==null)throw Error('회귀 면담 기록을 확인하세요.');last=d.after;}}
 function checkRecords(rs,o){if(!Array.isArray(rs)||rs.length>460000)throw Error('회차 경기 기록을 확인하세요.');let year=o.year,round=o.round,division=o.division;for(const r of rs){if(round===(division===1?38:46)){year++;round=0;division=r.division;}if(!exact(r,['year','round','division','score'])||r.year!==year||r.round!==round+1||!int(r.division,1,5)||r.division!==division||!Array.isArray(r.score)||r.score.length!==2||r.score.some(n=>!int(n,0,90)))throw Error('회차 경기 순서를 확인하세요.');round++;}}
 function validate(s){
  if(s.rebirth===undefined)return s;const b=s.rebirth;if(!contractShape(b,['version','attempt','origin','memory','decisions','previous'],s.seed)||b.version!==1||!int(b.attempt,1,1000000)||!Object.hasOwn(memories,b.memory)||b.attempt===1&&b.memory!=='none'||b.attempt>1&&b.memory==='none'||!Array.isArray(b.previous)||b.previous.length!==Math.min(12,b.attempt-1))throw Error('환생 회차를 읽을 수 없습니다.');
  checkOrigin(b.origin);if(b.origin.year>s.year||b.origin.year===s.year&&b.origin.round>s.round||b.origin.division!==divisionFor(s,b.origin.year))throw Error('현재 구단과 회차 출발점이 다릅니다.');
  checkDecisions(b.decisions);const records=recordsFor(s);checkRecords(records,b.origin);let expected=s.round-b.origin.round;for(let y=b.origin.year;y<s.year;y++)expected+=divisionFor(s,y)===1?38:46;if(records.length!==expected)throw Error('회차에 필요한 확정 리그 기록이 없습니다.');
  for(let i=0;i<b.previous.length;i++){const p=b.previous[i];if(!contractShape(p,['attempt','seed','origin','memory','decisions','records','status','division'],p.seed)||p.attempt!==b.attempt-b.previous.length+i||!int(p.seed,0,4294967295)||!Object.hasOwn(memories,p.memory)||p.attempt===1&&p.memory!=='none'||p.attempt>1&&p.memory==='none'||!['sacked','returned'].includes(p.status)||!int(p.division,1,5))throw Error('이전 삶의 기록을 확인하세요.');checkOrigin(p.origin);checkDecisions(p.decisions);checkRecords(p.records,p.origin);const result=simulate(p.records,p.decisions,p.memory,p.attempt>1,p.contractStyle);if(p.status==='sacked'&&result.status!=='sacked'||p.status==='returned'&&(result.status!=='active'||p.division!==1)||p.status==='sacked'&&p.division!==Math.min(p.origin.division,...p.records.map(r=>r.division)))throw Error('이전 삶의 결말을 확인하세요.');}
  const r=read(s);if((r.status!=='active'||r.pending)&&s.match&&s.match.phase!=='prep')throw Error('끝난 회차의 경기는 시작할 수 없습니다.');return s;
 }
 const api={memories,events,contracts,request:eventAt,targetText,simulate,read,enable,choose,appeal,restart,assertPlayable,validate};root.Rebirth=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
