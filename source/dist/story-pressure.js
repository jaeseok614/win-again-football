(function(root){
 'use strict';
 const F=root.Football||(typeof require==='function'?require('./engine.js'):null);
 // Original fictional incidents. A rumour is never a verified health, discipline,
 // contract or financial receipt. Anchors come only from completed league games.
 const owners=[
  {id:'results',label:'승부 우선형',line:'승격을 향한 다음 목표도 분명히 말해야 합니다.',stance:'결과와 높은 기준을 공개적으로 요구한다.'},
  {id:'guardian',label:'선수 보호형',line:'높아진 관심이 선수들을 집어삼키게 두지는 않겠습니다.',stance:'외부 비난을 막되 감독에게 설명을 요구한다.'},
  {id:'spotlight',label:'언론 주도형',line:'구단의 이야기는 우리가 먼저 해야 합니다.',stance:'공개 인터뷰로 기대와 주도권을 키우려 한다.'},
  {id:'accounts',label:'재정 현실형',line:'높은 기대와 감당할 수 있는 약속은 다릅니다.',stance:'성급한 보장보다 재정과 준비 기준을 묻는다.'}
 ];
 const reach={5:'지역 매체',4:'리그 전문 매체',3:'전국 스포츠 매체',2:'승격 경쟁 특집',1:'1부 전국 방송'};
 const league=(s,year)=>year===s.year?s.league:s.history?.find(h=>h.year===year);
 function profile(s,year=s.year){const o=owners[(s.seed>>>0)%owners.length],division=league(s,year)?.division||5;return {...o,...(o.id==='results'&&division===1?{line:'1부에서도 목표는 TOP 6입니다. 다음 기준을 말해야 합니다.'}:{}),division,reach:reach[division]};}
 function complete(s,year){return ((year===s.year?s.statistics?.records:s.statistics?.archive?.find(a=>a.year===year)?.records)||[]).filter(g=>g.competition==='league'&&g.statisticsOriginMinute===0&&!g.unassignedGoals).sort((a,b)=>a.round-b.round);}
 function ability(p){return Math.round(p[F.roleKey(p)]*.55+p.passing*.15+p.speed*.15+p.endurance*.15);}
 function anchor(games,count,kind){if(games.length<count)return null;const minutes=new Map();for(const g of games.slice(0,count))for(const p of g.players)if(p.minutes>0&&F.identityProfile(p.identity))minutes.set(p.identity,(minutes.get(p.identity)||0)+p.minutes);
  return [...minutes.keys()].map(id=>F.identityProfile(id)).sort((a,b)=>(kind==='private'?F.mentalProfile(a).pressure-F.mentalProfile(b).pressure:kind==='future'?(b.potential||0)-(a.potential||0):ability(b)-ability(a))||a.identity.localeCompare(b.identity))[0]||null;
 }
 function events(s,year){
  const l=league(s,year);if(l?.rules!=='five-tier')return [];const o=profile(s,year),games=complete(s,year),records=s.clubStory?.records||[],list=[];
  const add=(kind,round,relation,actor,title,scene,question,options,replies,followQuestion,followOptions,finalReplies)=>list.push({key:'pressure-'+kind+'-'+o.id,round,relation,actor,speaker:relation==='board'?'구단주':'선수',title,scene,question,options,replies,followQuestion,followOptions,finalReplies,...(kind==='promoted'?{questionSpeaker:'기자'}:{}),conflict:true,fictional:true,context:'가상 사건 · '+o.label+' · '+o.reach});
  const previous=s.history?.find(h=>h.year===year-1);
  if(previous?.rules==='five-tier'&&previous.division>l.division){
   add('promoted',0,'board','board','승격 축하 뒤의 마이크',previous.division+'부에서 '+l.division+'부로 승격했다. '+o.reach+'의 기자가 마이크를 켠다.\n\n구단주: “'+o.line+'”\n감독은 축하보다 다음 질문이 먼저 온 것을 알아차린다.',{results:'기자: “구단주가 높은 기준을 요구했습니다. 바로 다음 목표도 보장하실 겁니까?”',guardian:'기자: “선수 보호 방침은 성적 목표를 낮추겠다는 뜻입니까?”',spotlight:'기자: “구단이 먼저 이야기한다면, 감독님의 목표도 지금 밝혀주시겠습니까?”',accounts:'기자: “승격 뒤 투자와 성과, 어디까지 약속하실 수 있습니까?”'}[o.id],['기대와 선수들의 준비 상태를 함께 듣겠습니다','높아진 목표를 공개적으로 받아들이겠습니다','목표와 결과 보장을 나누어 설명하겠습니다'],['구단주: “선수들이 어떤 준비가 필요한지 제게도 말해 주세요.”','기자: “그 답을 제목으로 쓰겠습니다.” 구단주도 감독을 바라본다.','기자: “축하와 보장은 다르다는 뜻이군요.” 구단주는 덧붙일 말을 고른다.'],'카메라가 꺼진 뒤, 구단주가 묻는다. “우리 입장이 다른 날에도 이렇게 이야기하겠습니까?”',['차이가 있으면 먼저 직접 만나겠습니다','공개 답변의 범위를 그때그때 설명하겠습니다'],['구단주: “다른 의견도 직접 듣죠. 인터뷰로 처음 알게 하지는 마세요.”','구단주: “같은 목소리를 강요하지는 않겠습니다. 이유는 듣고 싶군요.”']);
  }
  const star=anchor(games,4,'star');
  if(star){const t=F.mentalProfile(star);add('star',games[3].round,'captain',star.identity,'능력표 밖의 부담','등록 프로필의 역할 종합 '+ability(star)+'인 '+star.name+'에게 관심이 쏠린다. 압박 대처 '+t.pressure+'/20 · 프로 의식 '+t.professionalism+'/20.\n\n기자: “이 선수가 팀을 혼자 끌어올리는 것 아닙니까?”\n선수는 동료들의 쪽을 먼저 본다.','선수: “제 능력 얘기만 나오면, 동료들은 어떤 기분일까요?”',['관심을 받는 선수와 동료의 마음을 따로 듣자','기대에 맞서 역할을 증명하자고 말하자','혼자보다 주변의 지원 역할을 설명하자'],[t.pressure<=10?'“칭찬인데도 매번 증명해야 할 것 같아요.”':'“기대는 받아들일게요. 그래도 동료 이름을 빼지는 말아 주세요.”','“못한 날에는 혼자 책임질 선수로도 보겠죠?” 선수는 쉽게 웃지 않는다.','“저도 누군가 받아 주지 않으면 아무것도 못 합니다. 그걸 같이 말해 주세요.”'],'다음 인터뷰에서도 어떤 기준을 지킬까요?',['개인의 이야기도 먼저 듣고 답하겠다','선발·성과를 보장하지 않고 팀의 역할을 설명하겠다'],['“그럼 억지로 자신 있는 척부터 하지는 않아도 되겠네요.”','“제 역할은 준비하겠습니다. 모든 결과까지 혼자 보장할 수는 없으니까요.”']);}
  const privatePlayer=anchor(games,8,'private');
  if(privatePlayer){add('private',games[7].round,'captain',privatePlayer.identity,'사진 한 장, 아직 모르는 이야기','게임 속 익명 계정이 '+privatePlayer.name+'의 심야 외출이라며 사진을 올렸다. 촬영 시각·장소·경위는 확인되지 않았다. 실제 생활에 대한 정보가 아니다.\n\n'+o.label+' 구단주: “'+({results:'경기 준비에 문제가 있는지부터 알고 싶습니다.',guardian:'확인되지 않은 사진으로 선수를 몰아세우지 맙시다.',spotlight:'질문이 커지기 전에 공식 답변부터 준비하죠.',accounts:'논란을 이유로 벌금이나 계약 변경부터 할 수는 없습니다.'}[o.id])+'”','선수: “제 이야기를 듣기도 전에 해명부터 하라고 하면, 뭘 말해야 하죠?”',['비공개로 듣고 확인된 내용만 다루자','인터뷰에서 팀의 준비 기준을 분명히 말하자','소문과 실제 경기 준비를 분리해서 확인하자'],['“모든 사정을 카메라 앞에서 말하고 싶지는 않아요.” 선수는 잠시 숨을 고른다.','“기준은 알겠습니다. 다만 소문을 사실처럼 설명하지는 말아 주세요.”','“훈련과 경기는 확인하셔도 됩니다. 사진만으로 결론을 내리지는 말아 주세요.”'],'기자가 다시 사생활을 묻는다면 무엇이라고 답할까요?',['당사자의 사생활은 공개하지 않고 준비 상태만 말하겠다','확인되지 않은 내용에는 결론을 내리지 않겠다'],['“모두 앞에서 설명하지 않아도 되는군요. 준비할 일부터 하겠습니다.”','“모른다는 답도 해 주셨으면 했어요. 제 말도 듣고 판단해 주세요.”']);}
  if(games.length>=12){add('public',games[11].round,'board','board','감독보다 먼저 나온 인터뷰','게임 속 '+o.reach+' 인터뷰에서 구단주가 말했다. “'+o.line+'”\n\n'+o.stance+' 감독과 사전에 합의한 발표는 아니다. 기자가 두 사람의 의견이 같으냐고 묻는다.','구단주: “제 말을 다른 뜻으로 받아들였습니까?”',['공개 발언이 선수들에게 어떻게 들렸는지 묻겠습니다','기자들 앞에서도 제 판단과 책임을 분명히 말하겠습니다','공개할 기준을 먼저 서로 확인하겠습니다'],['“선수마다 다른 부담이겠군요. 감독님은 무엇을 들었습니까?”','“같은 답을 하지는 않겠다는 거군요.” 구단주가 말을 멈춘다.','“그럼 다음 발표 전에 합의할 것부터 적어 보죠.”'],'입장 차이가 생기면 다음에는 어떻게 하겠습니까?',['먼저 직접 만나고 제 책임으로 답하겠습니다','선수의 평가와 공개 목표를 구분해 설명하겠습니다'],['“동의하지 않아도 먼저 들을 자리는 남겨 두죠.”','“목표를 말한 것과 선수 한 명을 지목한 것은 다릅니다. 그 선을 확인하죠.”']);}
  const future=anchor(games,20,'future');
  if(future){add('future',games[19].round,'captain',future.identity,'가능성에 붙은 이적 제목','등록 잠재력 '+future.potential+'인 '+future.name+'에게 게임 속 기자가 “더 높은 무대라면 떠날 생각인가”라고 묻는다. 실제 제안이나 이적 요청은 없다.\n\n선수: “제가 떠나겠다고 말한 건 아니잖아요.”','선수의 가능성과 구단의 목표를 어떻게 이야기할까요?',['선수가 바라는 미래부터 비공개로 듣자','이 팀의 도전도 가치 있다고 분명히 말하자','현재 역할과 확인된 계약만 이야기하자'],['“언젠가 도전하고 싶은 것과 지금 떠나겠다는 건 달라요.”','“구단을 무시한 적은 없어요. 제 꿈까지 없다고 하지는 말아 주세요.”','“없는 제안을 설명하느라 지금 할 일을 놓치고 싶지는 않습니다.”'],'다음 질문에는 무엇을 함께 지킬까요?',['앞날의 생각은 듣되 공개할 때 먼저 상의하자','잔류·이적 보장 없이 현재 준비에 집중하자'],['“꿈을 말하면 곧바로 배신자가 되는 것만 아니었으면 해요.”','“계약을 바꾼 건 아니죠. 오늘 제가 맡은 역할은 준비할게요.”']);}
  const out=[];
  for(const e of list){const id=year+':'+e.key,first=records.find(r=>r.event===id&&r.step===0),done=records.find(r=>r.event===id&&r.step===1),present=e.relation==='board'||year!==s.year||Object.values(s.squad).some(p=>p.identity===e.actor);if(!present&&!first)continue;out.push(e);if(!first||!done)continue;
   const later=games.filter(g=>g.round>done.atRound).slice(0,2);if(later.length<2)continue;const key=e.key+'-followup',round=later[1].round;if(!present&&!records.some(r=>r.event===year+':'+key))continue;
   const name=F.identityProfile(e.actor)?.name||'구단주',minutes=e.relation==='board'?null:later.reduce((n,g)=>n+(g.players.find(p=>p.identity===e.actor)?.minutes||0),0),statement=e.followOptions[done.choice==='commit'?0:1];
   out.push({...e,key,round,title:'기사 다음의 대화 · '+e.title,scene:name+'은 “'+statement+'”라는 답을 기억한다. '+(minutes===null?'그 뒤 두 리그 경기의 결과가 확정됐다.':name+'의 이후 두 리그 경기 실제 출전은 '+minutes+'분이다.')+(e.key.includes('-private-')?' 사진의 사생활 의혹이 사실로 확인된 기록은 없다. 경기 기록으로 사생활을 증명할 수도 없다.':''),question:first.choice==='bold'?'분명한 말은 들었습니다. 그런데 남아 있는 부담은 어떻게 이야기할까요?':'지난번 들었던 이야기를, 이번에도 꺼내도 괜찮겠습니까?',options:['남은 부담도 먼저 듣고 준비하자','지켜야 할 기준을 다시 분명하게 말하자','확인된 기록과 아직 모르는 일을 나누자'],replies:['“괜찮다고 답해야 끝나는 면담은 아니군요.”','“기준은 듣겠습니다. 다만 감정도 함께 남아 있습니다.”','“알고 있는 것부터 이야기하죠. 모르는 부분은 억지로 채우지 말고요.”'],followQuestion:'이 사건 뒤에 어떤 대화 방식을 남길까요?',followOptions:['말하기 어려워도 직접 찾아올 수 있게 하겠다','결과와 사람의 사정을 구분해 설명하겠다'],finalReplies:['문이 닫혀도 다음 대화의 자리는 남는다. 모든 오해가 풀렸다고 발표하지는 않는다.','정해진 기준과 남은 감정을 함께 기록한다. 한 번의 답변으로 사람을 단정하지 않는다.']});
  }
  return out;
 }
 function focus(source,player){const match=/^\d+:pressure-(promoted|star|private|public|future)-(results|guardian|spotlight|accounts)(?:-followup)?$/.exec(source.event||'');if(!match)return 0;const [,kind,owner]=match,t=F.mentalProfile(player);
  if(kind==='private')return source.first==='listen'&&t.pressure<=10?1:source.first==='bold'&&t.pressure<=10?-1:0;
  if(!['promoted','public'].includes(kind))return 0;
  if(owner==='results'&&source.first==='bold')return t.professionalism>=15&&t.pressure>=12?1:t.pressure<=10?-1:0;
  if(owner==='guardian'&&source.first==='listen')return t.loyalty>=15||t.pressure<=10?1:0;
  if(owner==='spotlight'&&source.first==='bold')return t.pressure<=12?-1:t.determination>=16?1:0;
  return owner==='accounts'&&source.first==='practical'&&t.professionalism>=14?1:0;
 }
 const api={profile,events,focus,ability};root.StoryPressure=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
