(function(root){
 const Discipline=root.Discipline||(typeof require==='function'?require('./discipline.js'):null);
 const activeLineup=(s,minute=s.minute)=>s.discipline?Discipline.active(s,minute):s.lineup;
 const roster=[
 ['g1','에런 켈윅','GK',1,38,62,57,45,64,100,73],['g2','마테오 브렌델','GK',21,25,52,50,46,60,100,63],
 ['d1','리오 하스웰','DEF',2,42,75,61,62,68,95],['d2','니코 바르덴','DEF',4,36,78,57,51,72,94],['d3','루카스 에버릭','DEF',5,40,73,63,54,70,98],['d4','이안 모렐','DEF',3,49,68,68,76,69,92],['d5','에밀 렌코','DEF',15,42,65,56,80,75,100],['d6','토마스 윌렌','DEF',16,38,66,66,62,77,100],
 ['m1','노아 세르반','MID',6,57,69,76,58,73,93],['m2','레온 알베크','MID',8,69,51,83,61,68,90],['m3','아드리안 코르빈','MID',7,71,45,71,81,70,89],['m4','테오 드레인','MID',11,70,47,72,77,62,82],['m5','루벤 마르코','MID',14,56,62,73,71,82,100],['m6','세바스 로웬','MID',18,65,52,68,83,78,100],
 ['f1','오스카 베런','FW',9,83,29,61,51,50,64],['f2','밀로 카르덴','FW',10,76,32,68,70,64,91],['f3','핀 아르덴','FW',19,66,26,56,94,77,100],['f4','라파엘 노벡','FW',20,73,35,71,78,73,100]]
 .map(([id,name,pos,no,attack,defense,passing,speed,endurance,energy,keeping=0])=>({id,name,pos,no,attack,defense,passing,speed,endurance,energy,keeping}));

 const ages={g1:25,g2:31,d1:24,d2:27,d3:26,d4:21,d5:20,d6:24,m1:24,m2:28,m3:21,m4:26,m5:23,m6:19,f1:30,f2:24,f3:18,f4:22};
 const potentials={g1:88,g2:74,d1:89,d2:88,d3:86,d4:91,d5:90,d6:83,m1:89,m2:91,m3:94,m4:86,m5:87,m6:94,f1:87,f2:91,f3:97,f4:91};
 const roleKey=p=>({GK:'keeping',DEF:'defense',MID:'passing',FW:'attack'}[p.pos]);
 for(const p of roster){p.identity=p.id;p.age=ages[p.id];p.potential=potentials[p.id];p.fee=Math.max(15000,Math.round(((p[roleKey(p)]-55)*1400+25000)/1000)*1000);p.wage=Math.round((p[roleKey(p)]-50)*25+600);p.kind=p.age<=21?'유망주':'기존 선수';}
 const market=[
 {identity:'t_g1',name:'베니오 렌츠',pos:'GK',age:28,potential:87,fee:78000,wage:1800,kind:'즉시 전력',attack:30,defense:62,passing:61,speed:48,endurance:78,keeping:83},
 {identity:'t_g2',name:'엘리안 벨로',pos:'GK',age:19,potential:95,fee:35000,wage:650,kind:'유망주',attack:25,defense:54,passing:58,speed:52,endurance:82,keeping:68},
 {identity:'t_d1',name:'마르코스 네런',pos:'DEF',age:28,potential:88,fee:82000,wage:1800,kind:'즉시 전력',attack:46,defense:83,passing:69,speed:63,endurance:81,keeping:0},
 {identity:'t_d2',name:'레미 할베른',pos:'DEF',age:19,potential:95,fee:39000,wage:750,kind:'유망주',attack:49,defense:70,passing:65,speed:84,endurance:85,keeping:0},
 {identity:'t_m1',name:'카일로 베르넌',pos:'MID',age:26,potential:93,fee:110000,wage:2200,kind:'즉시 전력',attack:74,defense:61,passing:86,speed:69,endurance:77,keeping:0},
 {identity:'t_m2',name:'다리오 펠스',pos:'MID',age:18,potential:97,fee:44000,wage:850,kind:'유망주',attack:70,defense:52,passing:73,speed:83,endurance:82,keeping:0},
 {identity:'t_f1',name:'엔조 카르벤',pos:'FW',age:28,potential:92,fee:125000,wage:2800,kind:'즉시 전력',attack:89,defense:31,passing:69,speed:77,endurance:76,keeping:0},
 {identity:'t_f2',name:'테오린 베르츠',pos:'FW',age:19,potential:97,fee:49000,wage:900,kind:'유망주',attack:73,defense:29,passing:63,speed:92,endurance:86,keeping:0}
 ];
 const personalities={
  g1:['티보 쿠르투왕','골문 앞 거인','팔을 쭉 펴면 골대가 갑자기 작아 보여요.'],
  g2:['마누엘 노이얼','산책하는 골키퍼','골대도 지키고 수비 뒷마당도 순찰해요.'],
  d1:['버질 반다이쿠','수비반 반장','상대 공격수에게 오늘의 출입 금지를 알려줘요.'],
  d2:['세르히오 라모쑤','태클 출석왕','공이 굴러가는 곳엔 이미 발을 뻗고 있어요.'],
  d3:['파올로 말디닝','우아한 방패','유니폼 주름은 펴고 수비 간격은 접어요.'],
  d4:['김민제','수비하는 괴물','상대가 돌파를 생각할 때 먼저 길을 막아요.'],
  d5:['트렌트 알렉산더 아놀두','크로스 택배기사','오른쪽에서 올린 공에 배송 완료를 찍어요.'],
  d6:['앤디 로버쏭','측면 왕복러','왼쪽 터치라인에는 이 선수 발자국이 가득해요.'],
  m1:['루카 모드리찌','중원 조율사','공 한 번 툭 차면 우리 팀 박자가 맞아요.'],
  m2:['케빈 더브라이닝','패스 설계자','골키퍼와 수비수 사이의 틈을 먼저 찾아요.'],
  m3:['주드 벨링험','중원 해결사','공격도 수비도 부르면 바로 달려와요.'],
  m4:['브루노 페르난두','찬스 제조기','공을 잡으면 동료부터 골문 앞으로 보내요.'],
  m5:['박지송','두 개의 심장','잔디보다 더 자주 경기장을 뛰어다녀요.'],
  m6:['이강잉','왼발 요술쟁이','좁은 틈에서도 공이 빙글 돌아 빠져나와요.'],
  f1:['해리 케잉','골문 앞 해결사','박스 안에서는 공보다 골대부터 봐요.'],
  f2:['손헝민','찰칵 세리머니','뒷공간을 달린 다음 골문 앞에서 사진을 찍어요.'],
  f3:['킬리안 음바뻬','번개 발걸음','패스가 출발하면 벌써 수비 뒤에 도착해요.'],
  f4:['모하메드 살라흐','측면 마법사','오른쪽에서 나타나 골문 쪽으로 슬쩍 접어요.'],
  t_g1:['잔루이지 부퐁','골문 장인','공이 날아오면 장갑부터 일할 준비를 해요.'],
  t_g2:['잔루이지 돈나룸바','선방 새싹','큰 장갑에 더 큰 꿈을 담고 있어요.'],
  t_d1:['후벵 디아쑤','수비 대장','우리 골문 앞에 흔들리지 않는 기준선을 세워요.'],
  t_d2:['윌리엄 살리밥','미래의 철벽','상대가 돌아서는 순간 어깨 옆에 따라붙어요.'],
  t_m1:['안드레스 이니에쑤타','틈새 패스 장인','수비수 셋 사이에도 공 하나 지나갈 길은 있어요.'],
  t_m2:['자말 무시알랴','드리블 새싹','공과 함께 움직이면 수비수 발이 먼저 꼬여요.'],
  t_f1:['리오넬 메씨','작은 축구 마술사','공이 발에 붙었나 확인하고 싶어져요.'],
  t_f2:['엘링 홀란두','골망 먹보','골문 앞에 공이 오면 일단 한 입 먹고 봐요.']
 };
 const legacyNames={},textAliases=new Map();
 function rememberAlias(before,after){if(!textAliases.has(before))textAliases.set(before,new Set());textAliases.get(before).add(after);}
 for(const p of [...roster,...market]){legacyNames[p.identity]=p.name;p.name=personalities[p.identity][0];rememberAlias(legacyNames[p.identity],p.name);}
 const identities=Object.fromEntries([...roster,...market].map(p=>[p.identity,p]));
 // A fictional 2024/25-inspired starting squad; legacy identities remain intact.
 const startingNames=[
  ['g1','굴리엘모 비카리오우','장갑의 파수꾼',28],['g2','프레이저 포스털','노련한 장갑',36],
  ['d1','크리스티안 로메로우','수비의 투사',26],['d2','미키 판더벤느','추격의 번개',23],['d3','페드로 포로우','측면 배달부',25],['d4','데스티니 우도기잉','왼쪽 질주',22],['d5','라두 드라구신느','수비의 새벽',22],['d6','벤 데이비쑤','조용한 버팀목',31],
  ['m1','이브 비수마르','중원 청소부',28],['m2','제임스 매디쏜','찬스 설계자',28],['m3','데얀 쿨루셉스키','틈새 창조자',24],['m4','로드리고 벤탄쿠르르','중원 연결고리',27],['m5','파페 마타 사르르','중원의 엔진',22],['m6','루카스 베리발','새로운 박자',18],
  ['f1','손헝민','우리의 주장',32],['f2','도미닉 솔랑케잉','박스의 해결사',27],['f3','브레넌 존쏜','침투의 화살',23],['f4','히샬리쏭','골문 사냥꾼',27]
 ];
 const startingSkills={g1:[30,62,65,50,70,76],g2:[25,58,52,40,68,68],d1:[42,78,65,68,78,0],d2:[38,75,63,87,76,0],d3:[58,69,76,77,77,0],d4:[52,70,65,82,79,0],d5:[35,68,54,66,74,0],d6:[37,70,64,59,75,0],m1:[55,70,74,70,80,0],m2:[72,43,83,68,71,0],m3:[73,48,77,74,80,0],m4:[54,65,76,65,75,0],m5:[58,65,70,78,83,0],m6:[57,50,68,74,74,0],f1:[82,32,73,83,76,0],f2:[76,36,63,73,80,0],f3:[70,30,62,88,77,0],f4:[73,39,57,76,74,0]};
 const startingRoster=startingNames.map(([slot,name,nickname,age])=>{const p=roster.find(p=>p.id===slot),identity='sp_'+slot;personalities[identity]=[name,nickname,'강등된 토투넘을 다시 일으키기 위해 함께 뛰어요.'];return identities[identity]={...p,...Object.fromEntries(['attack','defense','passing','speed','endurance','keeping'].map((key,index)=>[key,startingSkills[slot][index]])),identity,name,age,energy:100,kind:'토투넘 선수'};});
 function mentalProfile(value){
  const identity=typeof value==='string'?value:value.identity||value.id;
  let hash=2166136261;for(const ch of identity)hash=(Math.imul(hash,16777619)^ch.charCodeAt(0))>>>0;
  const draw=()=>{hash=(Math.imul(hash,1664525)+1013904223)>>>0;return 6+hash%14;};
  const profile={loyalty:draw(),professionalism:draw(),determination:draw(),pressure:draw(),teamwork:draw(),leadership:draw()};
  if(identity==='sp_f1')Object.assign(profile,{loyalty:19,professionalism:18,determination:18,pressure:16,teamwork:18,leadership:19});
  return profile;
 }
 function detailedAttributes(p){
  const mental=mentalProfile(p),scale=value=>Math.max(1,Math.min(20,Math.round(value/5))),item=(key,label,value)=>({key,label,value});
  return [
   {label:'기술',items:[item('finishing','골 결정력',scale(p.attack)),item('firstTouch','퍼스트 터치',scale((p.attack+p.passing)/2)),item('passing','패스',scale(p.passing)),item('crossing','크로스',scale(p.passing*.7+p.speed*.3)),item('dribbling','드리블',scale(p.speed*.45+p.attack*.55)),item('tackling','태클',scale(p.defense)),item('marking','마크',scale(p.defense*.8+p.endurance*.2)),item('keeping','선방',p.pos==='GK'?scale(p.keeping):null)]},
   {label:'정신 · 성격',items:[item('loyalty','충성도',mental.loyalty),item('professionalism','프로 의식',mental.professionalism),item('determination','승부욕',mental.determination),item('pressure','압박 대처',mental.pressure),item('teamwork','팀워크',mental.teamwork),item('leadership','리더십',mental.leadership)]},
   {label:'신체',items:[item('pace','주력',scale(p.speed)),item('acceleration','순간 가속',scale(p.speed*.85+p.endurance*.15)),item('stamina','지구력',scale(p.endurance)),item('strength','몸싸움',scale(p.defense*.6+p.endurance*.4)),item('agility','민첩성',scale(p.speed*.7+p.passing*.3)),item('balance','균형 감각',scale(p.endurance*.6+p.passing*.4))]}
  ];
 }
 const youthNames=['엘리오','카이렌','레빈','니엘','아르노','율리안','시모','미렌','다니오','루엔','파비오','이세르','테빈','밀렌','오리안','렌토','바스티','라비오','카엘','노린','로미오','에릭스','세리오','마렌'];
 const youthSurnames=['델베르','하르벤','코르델','렌바흐','세르넬','베르켄','라스벨','펠데르','놀바크','드레빈','로셀','알텐','카렌스','베르릭','반델','모르넬','세베르','올렌','메르딘','카스펠','네르벨','헤르반','벨로크','오르덴'];
 const youthAliases={
  GK:['알리쏭 베커리','에데르쏭 모레쑤','이케르 카시야쑤','페트르 체흐림','얀 오블라쿠','다비드 데헤야','조던 픽포두','에밀리아노 마르티닝','케파 아리사발라밥','안드레 오나나용','우고 요리쑤','다비드 라야옹'],
  DEF:['카르레스 푸욜림','제라르 피케잉','알레산드로 네쑤타','로베르토 카를로쑤','카푸딩','마르셀로 비에링','아슈라프 하키미용','조슈아 키미쑤','안토니오 뤼디걸','알폰소 데이비쑤','베냐민 파바두','다니엘 카르바할롱'],
  MID:['지네딘 지단두','사비 에르난데쑤','토니 크로쑤','세르히오 부스케쑤','앙골로 캉테잉','프랭크 램파두','스티븐 제라두','폴 스콜쑤','카카링','메수트 외질림','페데리코 발베르두','데클런 라이스볼'],
  FW:['크리스티아누 호날둥','네이마루 주니오','로베르트 레반도쑤키','루이스 수아레쑤','즐라탄 이브라히모밥','앙리 티에링','디디에 드로그밥','웨인 루니용','페르난도 토레쑤','세르히오 아구에롱','사디오 마네용','비니시우쑤 주니얼']
 };
 const youthPersonalities={
  GK:[['골문 신입벽','선방 하나씩 쌓아서 골문 앞 벽을 키워요.'],['장갑 든 새싹','오늘의 실수를 내일의 선방으로 바꿔요.'],['선방 수집가','공이 오는 곳에 자기 장갑을 먼저 놓아요.']],
  DEF:[['미니 철벽','상대가 지나갈 길을 하나씩 지워요.'],['수비 달리미','수비 뒷공간에 생긴 빈칸을 재빨리 채워요.'],['태클 연습생','공부터 건드리는 깔끔한 태클을 연습해요.']],
  MID:[['패스 싹싹이','동료가 받기 편한 곳으로 공을 살짝 밀어요.'],['중원 새싹','작은 패스 하나로 더 큰 공격을 꿈꿔요.'],['공 배달부','우리 편 발 앞으로 공을 배달해요.']],
  FW:[['골망 노크맨','골대에 슈팅으로 인사를 건네요.'],['번개 새싹','수비 뒤 빈 공간부터 눈에 담아요.'],['박스 신입생','골문 앞 자리를 하나씩 자기 것으로 만들어요.']]
 };
 function youthAlias(id,pos,variant){let hash=2166136261;for(const ch of 'parody|'+id.slice(0,-1))hash=(Math.imul(hash,16777619)^ch.charCodeAt(0))>>>0;const pool=youthAliases[pos];return pool[(hash+variant-1)%pool.length];}
 function youthProfile(id){
  if(typeof id!=='string')return;const parts=/^y_(\d+)_(\d+)_([12])_(GK|DEF|MID|FW)_([123])$/.exec(id);if(!parts)return;
  const seed=Number(parts[1]),year=Number(parts[2]),cycle=Number(parts[3]),pos=parts[4],variant=Number(parts[5]);
  if(!Number.isInteger(seed)||seed<0||seed>4294967295||!Number.isInteger(year)||year<1||year>10000||id!==`y_${seed}_${year}_${cycle}_${pos}_${variant}`)return;
  let rng=2166136261;for(const ch of id)rng=(Math.imul(rng,16777619)^ch.charCodeAt(0))>>>0;
  rng^=rng>>>16;rng=Math.imul(rng,0x85ebca6b)>>>0;rng^=rng>>>13;rng=Math.imul(rng,0xc2b2ae35)>>>0;rng^=rng>>>16;
  const draw=n=>{rng=(Math.imul(rng,1664525)+1013904223)>>>0;return Math.floor(rng/4294967296*n);};
  const previousName=youthNames[draw(youthNames.length)]+' '+youthSurnames[draw(youthSurnames.length)],name=youthAlias(id,pos,variant),age=17+draw(3);rememberAlias(previousName,name);
  const primary=[72,63,68][variant-1]+draw(5)-2,potential=[89,95,92][variant-1]+draw(3),speed=[63,87,76][variant-1]+draw(5),endurance=74+draw(10);
  const p={identity:id,name,pos,age,potential,speed,endurance,attack:30+draw(22),defense:30+draw(23),passing:48+draw(18),keeping:0,kind:'유소년',academy:true,academySeed:seed,academyYear:year,academyCycle:cycle,academyVariant:variant};
  if(pos==='GK'){p.keeping=primary;p.attack=22+draw(12);p.defense=45+draw(15);p.speed=44+draw(13);}
  else if(pos==='DEF'){p.defense=primary;p.passing=54+draw(15);}
  else if(pos==='MID'){p.passing=primary;p.attack=57+draw(14);p.defense=47+draw(14);}
  else {p.attack=primary;p.passing=53+draw(15);p.defense=25+draw(12);}
  p.fee=Math.round((25000+(primary-60)*1400+(potential-88)*600)/1000)*1000;p.wage=500+(primary-60)*30;
  return p;
 }
 function youthCandidates(seed,year,cycle,pos){return [1,2,3].map(variant=>youthProfile(`y_${seed}_${year}_${cycle}_${pos}_${variant}`)).filter(Boolean);}
 function identityProfile(id){return identities[id]||youthProfile(id);}
 function legacyName(identity){
  const id=typeof identity==='string'?identity:identity?.identity||identity?.id;if(legacyNames[id])return legacyNames[id];const person=identityProfile(id);if(!person?.academy)return;
  let rng=2166136261;for(const ch of id)rng=(Math.imul(rng,16777619)^ch.charCodeAt(0))>>>0;rng^=rng>>>16;rng=Math.imul(rng,0x85ebca6b)>>>0;rng^=rng>>>13;rng=Math.imul(rng,0xc2b2ae35)>>>0;rng^=rng>>>16;
  const draw=n=>{rng=(Math.imul(rng,1664525)+1013904223)>>>0;return Math.floor(rng/4294967296*n);};return youthNames[draw(youthNames.length)]+' '+youthSurnames[draw(youthSurnames.length)];
 }
 function personality(value){
  const id=typeof value==='string'?value:value?.identity||value?.id,fixed=personalities[id];if(fixed)return {nickname:fixed[1],tagline:fixed[2]};const person=identityProfile(id),row=person?.academy?youthPersonalities[person.pos][person.academyVariant-1]:null;return row?{nickname:row[0],tagline:row[1]}:{nickname:'숨은 카드',tagline:'기회가 오면 자기만의 축구를 보여줄 거예요.'};
 }
 function displayText(value,context){
  const people=typeof context==='string'||context?.identity||context?.id?[context]:Array.isArray(context)?context:Object.values(context||{}),specific=new Map();
  for(const value of people){const id=typeof value==='string'?value:value?.identity||value?.id,person=identityProfile(id),before=legacyName(id);if(!person||!before)continue;if(!specific.has(before))specific.set(before,new Set());specific.get(before).add(person.name);}
  const replacements=new Map();for(const [before,names] of textAliases)if(names.size===1)replacements.set(before,[...names][0]);for(const [before,names] of specific){if(names.size===1)replacements.set(before,[...names][0]);else replacements.delete(before);}
  let text=String(value??'');for(const [before,after] of [...replacements].sort((a,b)=>b[0].length-a[0].length))text=text.split(before).join(after);return text;
 }
 function profileForSlot(slotId,identity=slotId){const slot=roster.find(p=>p.id===slotId),person=identityProfile(identity);if(!slot||!person||slot.pos!==person.pos)throw Error('같은 포지션의 등록 선수를 선택하세요.');return {...person,id:slotId,identity,no:slot.no,energy:100};}
 // One layout source for selection, the editor, broadcast and analysis diagram.
 const formationPositions={
  '442':{DEF:[[15,69],[38,73],[62,73],[85,69]],MID:[[15,44],[38,49],[62,49],[85,44]],FW:[[35,23],[65,23]]},
  '433':{DEF:[[15,69],[38,73],[62,73],[85,69]],MID:[[25,48],[50,52],[75,48]],FW:[[18,24],[50,18],[82,24]]},
  '352':{DEF:[[25,74],[50,76],[75,74]],MID:[[12,46],[31,52],[50,48],[69,52],[88,46]],FW:[[35,23],[65,23]]},
  '4231':{DEF:[[15,69],[38,73],[62,73],[85,69]],MID:[[35,59],[65,59],[18,32],[50,32],[82,32]],FW:[[50,16]]},
  '4141':{DEF:[[15,69],[38,73],[62,73],[85,69]],MID:[[50,59],[15,40],[38,43],[62,43],[85,40]],FW:[[50,19]]},
  '451':{DEF:[[15,69],[38,73],[62,73],[85,69]],MID:[[13,43],[32,48],[50,48],[68,48],[87,43]],FW:[[50,19]]},
  '4411':{DEF:[[15,69],[38,73],[62,73],[85,69]],MID:[[15,47],[38,51],[62,51],[85,47],[50,32]],FW:[[50,17]]},
  '343':{DEF:[[25,74],[50,76],[75,74]],MID:[[12,48],[38,53],[62,53],[88,48]],FW:[[18,24],[50,18],[82,24]]},
  '532':{DEF:[[12,64],[30,74],[50,76],[70,74],[88,64]],MID:[[28,49],[50,53],[72,49]],FW:[[35,23],[65,23]]},
  '541':{DEF:[[12,64],[30,74],[50,76],[70,74],[88,64]],MID:[[15,43],[38,49],[62,49],[85,43]],FW:[[50,19]]},
  '41212':{DEF:[[15,69],[38,73],[62,73],[85,69]],MID:[[50,59],[30,44],[70,44],[50,31]],FW:[[35,18],[65,18]]},
  '4312':{DEF:[[15,69],[38,73],[62,73],[85,69]],MID:[[28,51],[50,55],[72,51],[50,32]],FW:[[35,18],[65,18]]}
 };
 const formations=Object.fromEntries(Object.entries(formationPositions).map(([key,layout])=>[key,Object.fromEntries(Object.entries(layout).map(([pos,points])=>[pos,points.length]))]));
 function assignedPosition(x,y,natural){
  if(natural==='GK')return {code:'GK',label:'골키퍼',line:'GK'};
  const left=x<30,right=x>70,side=left?'L':right?'R':'';
  if(y>=66)return {code:side?side+'B':'CB',label:side?(left?'왼쪽':'오른쪽')+' 풀백':'중앙 수비수',line:'DEF'};
  if(y>=55)return {code:side?side+'WB':'DM',label:side?(left?'왼쪽':'오른쪽')+' 윙백':'수비형 미드필더',line:side?'DEF':'MID'};
  if(y>=38)return {code:side?side+'M':'CM',label:side?(left?'왼쪽':'오른쪽')+' 미드필더':'중앙 미드필더',line:'MID'};
  if(y>=27)return {code:side?side+'W':'AM',label:side?(left?'왼쪽':'오른쪽')+' 윙어':'공격형 미드필더',line:side?'FW':'MID'};
  return {code:side?side+'W':'ST',label:side?(left?'왼쪽':'오른쪽')+' 윙어':'스트라이커',line:'FW'};
 }
 const isAvailable=p=>!!p&&!(p.injuryRemaining||p.injury?.remaining||p.suspended);
 function fitLineup(players,formation,preferred=[]){if(!formations[formation])throw Error('올바른 포메이션을 선택하세요.');const counts={GK:1,...formations[formation]},lineup=[];for(const [pos,n] of Object.entries(counts)){const fit=Object.values(players).filter(p=>p.pos===pos&&isAvailable(p));if(fit.length<n)throw Error('이 포메이션에 출전할 건강한 선수가 부족합니다.');fit.sort((a,b)=>{const ai=preferred.indexOf(a.id),bi=preferred.indexOf(b.id);if(ai>=0&&bi>=0)return ai-bi;if(ai>=0)return -1;if(bi>=0)return 1;return b.energy-a.energy||b[roleKey(b)]-a[roleKey(a)]||a.id.localeCompare(b.id);});lineup.push(...fit.slice(0,n).map(p=>p.id));}return lineup;}
 function create(seed=20260132,options={}){let players=Object.fromEntries(roster.map(slot=>{const p=profileForSlot(slot.id,options.players?.[slot.id]?.identity||slot.id),injuryRemaining=options.players?.[slot.id]?.injury?.remaining??options.players?.[slot.id]?.injuryRemaining??0;if(!Number.isInteger(injuryRemaining)||injuryRemaining<0||injuryRemaining>2)throw Error('선수의 부상 정보를 확인할 수 없어요.');return [p.id,{...p,...Object.fromEntries(["attack","defense","passing","speed","endurance","keeping","energy"].map(key=>[key,options.players?.[p.id]?.[key]??p[key]])),id:p.id,name:p.name,pos:p.pos,no:p.no,potential:options.players?.[p.id]?.potential??p.potential,initialEnergy:options.players?.[p.id]?.energy??(options.players?p.energy:slot.energy),energy:options.players?.[p.id]?.energy??(options.players?p.energy:slot.energy),injuryRemaining,minutes:0}];}));return {version:5,statisticsOriginMinute:0,homeName:options.homeName||'브린웰 로버스',opponentName:options.opponentName||'팔켄루 04',opponent:options.opponent||{attack:79,defense:75,middle:80,speed:48,energy:94},isHome:options.isHome!==false,seed,rng:seed>>>0,formation:'442',tactic:'balanced',phase:'prep',minute:0,lineup:fitLineup(players,'442',['g1','d1','d2','d3','d4','m1','m2','m3','m4','f1','f2']),players,out:[],subs:0,score:[0,0],shots:[0,0],chances:[0,0],xg:[0,0],logs:[],segments:[],decisions:[],paused:false};}
 function setFormation(s,key){if(s.phase!=='prep'||!formations[key])throw Error('포메이션은 경기 전에 정할 수 있어요.');const lineup=fitLineup(s.players,key,s.lineup);s.lineup=lineup;s.formation=key;}
 function swap(s,outId,inId){if(s.discipline&&Discipline.dismissed(s).includes(outId))throw Error('퇴장한 선수는 교체할 수 없어요.');if(!['prep','half','late'].includes(s.phase)&&!running(s))throw Error('교체는 경기 준비와 경기 중에 할 수 있어요.');if(running(s)&&s.minute===0)throw Error('첫 1분부터 교체할 수 있어요. 경기 준비에서는 선발을 자유롭게 바꾸세요.');const a=s.players[outId],b=s.players[inId];if(!a||!b||!s.lineup.includes(outId)||s.lineup.includes(inId)||s.out.includes(inId)||a.pos!==b.pos)throw Error('같은 포지션의 대기 선수를 선택하세요.');if(!isAvailable(b))throw Error('부상 또는 출전 정지 중인 선수는 출전할 수 없어요.');if(s.phase!=='prep'&&s.subs>=3)throw Error('교체 3명을 모두 사용했어요.');const lineup=[...s.lineup];lineup[lineup.indexOf(outId)]=inId;replaceLiveSnapshot(s,s.tactic,lineup);s.lineup=lineup;if(s.phase!=='prep'){s.subs++;s.out.push(outId);s.decisions.push({minute:s.minute,type:'sub',out:outId,in:inId,speedDelta:b.speed-a.speed,energyDelta:b.energy-a.energy,attackDelta:b.attack-a.attack});s.logs.push({minute:s.minute,type:'sub',text:a.name+' 대신 '+b.name+' 투입.'});}return {out:a,in:b};}
 const clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),avg=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:0;
 const talkChoices=Object.freeze([{id:'encourage',label:'격려하기',description:'할 수 있다는 믿음을 전합니다.'},{id:'praise',label:'칭찬하기',description:'좋은 경기력을 인정합니다.'},{id:'demand',label:'분발 요구',description:'더 집중하라고 요구합니다.'},{id:'calm',label:'침착하게',description:'부담을 덜고 차분한 판단을 부탁합니다.'}]);
 function temperament(identity){let hash=2166136261;for(const ch of identity)hash=(Math.imul(hash,16777619)^ch.charCodeAt(0))>>>0;return ['steady','ambitious','sensitive','team'][hash%4];}
 function talkReactions(s,choice,{minute=s.minute,lineup=s.lineup,score=s.score,energy=null,morale=s.morale||{},rules=2}={}){
  if(!talkChoices.some(c=>c.id===choice))throw Error('팀 대화의 말을 선택하세요.');const difference=score[0]-score[1];
  return lineup.map(id=>{const p=s.players[id],type=temperament(p.identity),tired=minute>0&&(energy?energy[id]:p.energy)<60;let delta;
   if(choice==='encourage')delta=type==='ambitious'&&difference>=2?0:1;
   else if(choice==='praise')delta=difference<0?-1:difference>=2&&type==='team'?2:1;
   else if(choice==='demand')delta=type==='ambitious'?2:type==='sensitive'?-2:difference>=1?-1:1;
   else delta=type==='ambitious'&&difference<=-2?-1:tired?2:1;
   if(rules===2){const traits=mentalProfile(p);if(choice==='encourage')delta+=traits.loyalty>=16?1:traits.loyalty<=8?-1:0;else if(choice==='demand')delta+=traits.professionalism>=16&&traits.determination>=14?1:traits.loyalty<=8?-1:0;else if(choice==='calm'&&traits.pressure<=8)delta++;}
   const before=morale[id]||0,after=clamp(before+delta,-3,3);return {id,identity:p.identity,delta:after-before,before,after};
  });
 }
 function teamTalk(s,choice){
  if(!['prep','half','late'].includes(s.phase)||s.minute!=={prep:0,half:45,late:65}[s.phase])throw Error('팀 대화는 경기 전·하프타임·65분에 할 수 있어요.');
  if(s.decisions.some(d=>d.type==='talk'&&d.minute===s.minute))throw Error('이 시간에는 이미 선수들에게 말했어요.');
  const reactions=talkReactions(s,choice),decision={minute:s.minute,type:'talk',choice,lineup:[...s.lineup],score:[...s.score],reactions,rules:2};
  if(!s.morale)s.morale=Object.fromEntries(roster.map(p=>[p.id,0]));for(const reaction of reactions)s.morale[reaction.id]=reaction.after;
  s.decisions.push(decision);s.logs.push({minute:s.minute,type:'talk',text:'감독의 팀 대화: '+talkChoices.find(c=>c.id===choice).label+'.'});return decision;
 }
 const running=s=>['first','second','third'].includes(s.phase);
 function random(s){s.rng=(Math.imul(s.rng,1664525)+1013904223)>>>0;return s.rng/4294967296;}
 function ratings(s){const active=activeLineup(s),team=active.map(id=>s.players[id]);const field=pos=>team.filter(p=>p.pos===pos),eff=(p,key)=>{const base=(p?.[key]||0)*(.65+.0035*(p?.energy||0)),morale=p?s.morale?.[p.id]||0:0;return morale?base*(1+morale*.01):base;};let fw=field('FW'),mid=field('MID'),def=field('DEF'),gk=field('GK')[0];let pace=avg(fw.map(p=>eff(p,'speed'))),attack=.65*avg(fw.map(p=>eff(p,'attack')))+.35*avg(mid.map(p=>eff(p,'passing'))),defense=(.7*avg(def.map(p=>eff(p,'defense')))+.3*eff(gk,'keeping'))*(1+.06*(def.length-4)),middle=avg(mid.map(p=>eff(p,'passing')))*(1+.05*(mid.length-4));let profile=s.opponent||{attack:79,defense:75,middle:80,speed:48,energy:94},oppFactor=.65+.0035*(profile.energy-s.minute*35/90),opponentCount=11-(s.discipline?Discipline.dismissed(s,1).length:0),manpower=opponentCount/11,opp={attack:profile.attack*oppFactor*manpower,defense:profile.defense*oppFactor*manpower,middle:profile.middle*oppFactor*manpower,speed:profile.speed*oppFactor};defense*=active.length/11;let paceBonus=s.tactic==='counter'?clamp((pace-opp.speed)*.42,0,15):0;let rate=6/90*clamp(1+(middle-opp.middle)*.008,.85,1.15)*(1+.06*(fw.length-2));let ourRate=rate*({press:1.18,balanced:1,counter:.9}[s.tactic])*(s.isHome===false?.96:1),oppRate=6/90*clamp(1+(opp.middle-middle)*.008,.85,1.15)*({press:1.13,balanced:1,counter:.92}[s.tactic]);ourRate*=active.length/11;oppRate*=manpower;if(!fw.length)ourRate=0;return {attack,defense,middle,pace,paceBonus,ourRate,oppRate,ourGoal:clamp(.18+.005*(attack+paceBonus-opp.defense),.06,.4),oppGoal:clamp(.18+.005*(opp.attack-defense),.06,.4),opponent:opp};}
 function makeSegment(s,tactic=s.tactic,lineup=s.lineup){return {start:s.minute,end:null,tactic,lineup:[...lineup],rating:ratings({...s,tactic,lineup}),chances:[0,0],shots:[0,0],xg:[0,0],goals:[0,0]};}
 function replaceLiveSnapshot(s,tactic,lineup){
  if(!running(s))return;
  const active=s.segments.at(-1);if(!active||active.end!==null||active.start>s.minute)throw Error('진행 중인 경기 구간을 확인할 수 없어요.');
  const next=makeSegment(s,tactic,lineup);
  if(active.start===s.minute){Object.assign(active,next);return;}
  active.end=s.minute;s.segments.push(next);
 }
 function setTactic(s,tactic){if(!['press','balanced','counter'].includes(tactic)||!['prep','half','late'].includes(s.phase)&&!running(s))throw Error('경기 지시는 경기 준비와 경기 중에 변경할 수 있어요.');if(s.tactic===tactic)return s;const from=s.tactic;replaceLiveSnapshot(s,tactic,s.lineup);s.tactic=tactic;if(running(s)){s.decisions.push({minute:s.minute,type:'tactic',from,to:tactic});s.logs.push({minute:s.minute,type:'tactic',text:{press:'전방 압박을 높입니다.',balanced:'균형을 유지하며 경기를 운영합니다.',counter:'수비 뒷공간으로 빠르게 역습합니다.'}[tactic]});}return s;}
 function begin(s){let phase={prep:'first',half:'second',late:'third'}[s.phase];if(!phase)throw Error('이미 경기가 진행 중이에요.');const counts={GK:1,...formations[s.formation]};if(s.lineup.length!==11||new Set(s.lineup).size!==11||s.lineup.some(id=>!isAvailable(s.players[id]))||Object.entries(counts).some(([pos,n])=>s.lineup.filter(id=>s.players[id].pos===pos).length!==n))throw Error('부상 선수를 제외하고 선발 11명을 구성하세요.');s.phase=phase;s.paused=false;s.segments.push({start:s.minute,end:null,tactic:s.tactic,lineup:[...s.lineup],rating:ratings(s),chances:[0,0],shots:[0,0],xg:[0,0],goals:[0,0]});if(s.minute===0)s.logs.push({minute:0,type:'start',text:'킥오프! '+s.homeName+'의 도전이 시작됩니다.'});else s.logs.push({minute:s.minute,type:'tactic',text:{press:'전방 압박을 높입니다.',balanced:'균형을 유지하며 경기를 운영합니다.',counter:'수비 뒷공간으로 빠르게 역습합니다.'}[s.tactic]});}
 function assistFor(players,lineup,scorerId,roll){
  if(roll>=.78)return null;
  const candidates=lineup.map(id=>players[id]).filter(p=>p.id!==scorerId&&p.pos!=='GK'),weight=p=>Math.max(1,p.passing);
  let pick=roll/.78*candidates.reduce((sum,p)=>sum+weight(p),0);
  for(const p of candidates){if(pick<weight(p))return p;pick-=weight(p);}
  return candidates.at(-1)||null;
 }
 function tick(s){
  if(!running(s)||s.paused)return [];
  const active=activeLineup(s),r=ratings(s),rolls=Array.from({length:8},()=>random(s));s.minute++;
  for(const id of active){const p=s.players[id];p.energy=clamp(p.energy-(35*(1+(50-p.endurance)/250)+(s.tactic==='press'?8:0))/90,0,100);p.minutes++;}
  const events=[],segment=s.segments[s.segments.length-1];
  for(let team=0;team<2;team++){
   const rate=team===0?r.ourRate:r.oppRate;if(rolls[team]>=rate)continue;
   s.chances[team]++;segment.chances[team]++;
   const attackers=active.map(id=>s.players[id]).filter(p=>p.pos==='FW'),scorer=attackers[Math.min(attackers.length-1,Math.floor(rolls[6]*attackers.length))],shooter=team===0?scorer.name:s.opponentName;
   let text,type='chance';
   if(rolls[2+team]>.86){text=team===0?shooter+'의 침투, 마지막 패스가 끊깁니다.':s.opponentName+'의 공격을 수비진이 차단합니다.';}
   else{
    s.shots[team]++;segment.shots[team]++;const prob=team===0?r.ourGoal:r.oppGoal;s.xg[team]+=prob;segment.xg[team]+=prob;
    if(rolls[4+team]<prob){s.score[team]++;segment.goals[team]++;type='goal';text=team===0?'골! '+shooter+'의 슈팅이 골망을 가릅니다.':s.opponentName+'의 골. 다시 집중해야 합니다.';}
    else{type='shot';text=team===0?shooter+'의 슈팅! 상대 골키퍼가 막아냅니다.':s.players[s.lineup.find(id=>s.players[id].pos==='GK')].name+'의 선방! '+s.opponentName+'의 슈팅을 막습니다.';}
   }
   const event={minute:s.minute,type,team,text,paceBonus:team===0?r.paceBonus:0};
   if(team===0&&type==='goal'){const assist=assistFor(s.players,active,scorer.id,rolls[7]);Object.assign(event,{scorerId:scorer.id,scorerIdentity:scorer.identity,assistId:assist?.id||null,assistIdentity:assist?.identity||null});}
   s.logs.push(event);events.push(event);
  }
  if(s.discipline)events.push(...Discipline.tick(s));
  const next={45:'half',65:'late',90:'full'}[s.minute];if(next){segment.end=s.minute;s.phase=next;s.paused=false;const text={half:'전반 종료. 상대의 약점을 공략할 방법을 선택하세요.',late:'65분. 지친 선수와 남은 교체 횟수를 확인하세요.',full:'경기 종료. 감독의 선택과 경기 흐름을 돌아봅니다.'}[next];s.logs.push({minute:s.minute,type:'break',text});}
  return events;
 }
 function finishSegment(s){if(!running(s))throw Error('진행 중인 경기에서 사용할 수 있어요.');s.paused=false;while(running(s))tick(s);}
 function goalAttributions(s){const origin=s.statisticsOriginMinute??s.minute;return s.logs.filter(event=>event.type==='goal'&&event.team===0&&event.minute>origin);}
 function validateAttributions(s,fail){
  const fields=['scorerId','scorerIdentity','assistId','assistIdentity'],legacy=s.version<5;
  if(legacy){s.statisticsOriginMinute=s.minute;for(const event of s.logs)for(const key of fields)delete event[key];}
  if(!Number.isInteger(s.statisticsOriginMinute)||s.statisticsOriginMinute<0||s.statisticsOriginMinute>s.minute)fail();
  const goalCounts=[0,0],segmentCounts=s.segments.map(()=>[0,0]),seen=new Set();
  for(const event of s.logs){
   if(event.type!=='goal'){if(fields.some(key=>Object.hasOwn(event,key)))fail();continue;}
   if(![0,1].includes(event.team)||event.minute<1||seen.has(event.team+'-'+event.minute))fail();seen.add(event.team+'-'+event.minute);
   const index=s.segments.findIndex(segment=>event.minute>segment.start&&event.minute<=(segment.end??s.minute));if(index<0)fail();goalCounts[event.team]++;segmentCounts[index][event.team]++;
   if(event.team!==0||event.minute<=s.statisticsOriginMinute){if(fields.some(key=>Object.hasOwn(event,key)))fail();continue;}
   const lineup=s.segments[index].lineup,scorer=s.players[event.scorerId],assist=event.assistId===null?null:s.players[event.assistId];
   if(!scorer||scorer.pos!=='FW'||!isAvailable(scorer)||!lineup.includes(scorer.id)||event.scorerIdentity!==scorer.identity)fail();
   if(event.assistId===null){if(event.assistIdentity!==null)fail();}
   else if(!assist||assist.pos==='GK'||assist.id===scorer.id||!isAvailable(assist)||!lineup.includes(assist.id)||event.assistIdentity!==assist.identity)fail();
   let rng=s.seed>>>0,rolls=[];for(let draw=0;draw<event.minute*8;draw++){rng=(Math.imul(rng,1664525)+1013904223)>>>0;if(draw>=(event.minute-1)*8)rolls.push(rng/4294967296);}
   const eligible=lineup.filter(id=>!s.discipline||!Discipline.dismissed(s,0,event.minute-1).includes(id)),attackers=eligible.map(id=>s.players[id]).filter(p=>p.pos==='FW'),expectedScorer=attackers[Math.min(attackers.length-1,Math.floor(rolls[6]*attackers.length))],expectedAssist=expectedScorer?assistFor(s.players,eligible,expectedScorer.id,rolls[7]):null;
   if(!expectedScorer||scorer.id!==expectedScorer.id||event.assistId!==(expectedAssist?.id||null))fail();
  }
  for(let team=0;team<2;team++){if(goalCounts[team]!==s.score[team])fail();for(let index=0;index<s.segments.length;index++)if(segmentCounts[index][team]!==s.segments[index].goals[team])fail();}
 }
 function validateSegments(s,fail){
  const tactics=['press','balanced','counter'],counts={GK:1,...formations[s.formation]},equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b),near=(a,b)=>Number.isFinite(a)&&Math.abs(a-b)<1e-7;
  const validLineup=lineup=>Array.isArray(lineup)&&lineup.length===11&&new Set(lineup).size===11&&lineup.every(id=>isAvailable(s.players[id]))&&Object.entries(counts).every(([pos,n])=>lineup.filter(id=>s.players[id].pos===pos).length===n);
  const subs=s.decisions.filter(d=>d?.type==='sub');if(subs.length!==s.subs||!equal(subs.map(d=>d.out),s.out))fail();
  const groups=new Map();let lastDecision=-1;
  for(const d of s.decisions){
   if(!d||!['sub','tactic','talk'].includes(d.type)||!Number.isInteger(d.minute)||d.minute<0||d.minute>=90||d.minute>s.minute||d.minute<lastDecision)fail();lastDecision=d.minute;
   if(d.type==='sub'){if(d.minute===0||s.discipline&&Discipline.dismissed(s,0,d.minute).includes(d.out)||!s.players[d.in]||!s.players[d.out]||d.in===d.out||s.players[d.in].pos!==s.players[d.out].pos||!isAvailable(s.players[d.in]))fail();}
   else if(d.type==='tactic'&&(!tactics.includes(d.from)||!tactics.includes(d.to)||d.from===d.to||d.minute===s.minute&&!running(s)))fail();
   else if(d.type==='talk'&&(![0,45,65].includes(d.minute)||!talkChoices.some(c=>c.id===d.choice)))fail();
   if(!groups.has(d.minute))groups.set(d.minute,[]);groups.get(d.minute).push(d);
  }
  const talks=s.decisions.filter(d=>d.type==='talk'),morale=Object.fromEntries(roster.map(p=>[p.id,0]));
  if(talks.length>3||new Set(talks.map(d=>d.minute)).size!==talks.length||!talks.length&&Object.hasOwn(s,'morale')||talks.length&&(!s.morale||Object.keys(s.morale).length!==18||roster.some(p=>!Number.isInteger(s.morale[p.id])||s.morale[p.id]<-3||s.morale[p.id]>3)))fail();
  const talkLogs=s.logs.filter(log=>log?.type==='talk');if(talkLogs.length!==talks.length)fail();
  function applyTalk(d,lineup,energy){
   if(!Array.isArray(d.lineup)||d.lineup.length!==11||new Set(d.lineup).size!==11||d.lineup.some(id=>!isAvailable(s.players[id]))||!Object.values(formations).some(f=>Object.entries({GK:1,...f}).every(([pos,n])=>d.lineup.filter(id=>s.players[id].pos===pos).length===n)))fail();
   if(d.minute&& !equal(d.lineup,lineup))fail();const score=[0,0];for(const log of s.logs)if(log?.type==='goal'&&log.minute<=d.minute&&[0,1].includes(log.team))score[log.team]++;
   if(Object.hasOwn(d,'rules')&&d.rules!==2)fail();
   const expected={minute:d.minute,type:'talk',choice:d.choice,lineup:[...d.lineup],score,reactions:talkReactions(s,d.choice,{minute:d.minute,lineup:d.lineup,score,energy,morale,rules:d.rules||1}),...(d.rules?{rules:d.rules}:{})};
   if(!equal(d,expected))fail();const index=talks.indexOf(d),expectedLog={minute:d.minute,type:'talk',text:'감독의 팀 대화: '+talkChoices.find(c=>c.id===d.choice).label+'.'};if(!equal(talkLogs[index],expectedLog))fail();for(const reaction of expected.reactions)morale[reaction.id]=reaction.after;
  }
  function checkMorale(){if(talks.length&&!equal(s.morale,morale))fail();}
  if(s.phase==='prep'){if(s.segments.length||s.decisions.some(d=>d.type!=='talk')||s.subs)fail();for(const p of Object.values(s.players))if(p.minutes||!near(p.energy,p.initialEnergy))fail();for(const d of talks)applyTalk(d,d.lineup,null);checkMorale();return;}
  if(!s.segments.length||s.segments.length>90)fail();
  let previousEnd=0;
  for(let i=0;i<s.segments.length;i++){
   const seg=s.segments[i],last=i===s.segments.length-1,open=last&&running(s),end=open?s.minute:seg.end;
   if(!seg||!Number.isInteger(seg.start)||seg.start!==previousEnd||!tactics.includes(seg.tactic)||!validLineup(seg.lineup)||!Number.isInteger(end)||end<seg.start||end>s.minute||open&&seg.end!==null||!open&&(seg.end===null||end===seg.start))fail();
   if(last&&end!==s.minute)fail();for(const boundary of [45,65])if(seg.start<boundary&&end>boundary)fail();previousEnd=end;
   for(const key of ['attack','defense','middle','pace','paceBonus','ourRate','oppRate','ourGoal','oppGoal'])if(!Number.isFinite(seg.rating?.[key])||seg.rating[key]<0||seg.rating[key]>200)fail();
   for(const key of ['attack','defense','middle','speed'])if(!Number.isFinite(seg.rating?.opponent?.[key])||seg.rating.opponent[key]<0||seg.rating.opponent[key]>200)fail();
   for(const key of ['chances','shots','xg','goals'])if(!Array.isArray(seg[key])||seg[key].length!==2||seg[key].some(n=>!Number.isFinite(n)||n<0))fail();
   for(let team=0;team<2;team++)if(!Number.isInteger(seg.chances[team])||!Number.isInteger(seg.shots[team])||!Number.isInteger(seg.goals[team])||seg.goals[team]>seg.shots[team]||seg.shots[team]>seg.chances[team]||seg.chances[team]>end-seg.start||seg.xg[team]>seg.shots[team]*.4+1e-8)fail();
  }
  for(const boundary of [45,65])if(s.minute>=boundary&&!s.segments.some(seg=>seg.end===boundary))fail();
  const energy=Object.fromEntries(Object.values(s.players).map(p=>[p.id,p.initialEnergy])),played=Object.fromEntries(Object.values(s.players).map(p=>[p.id,0])),departed=new Set(),handled=new Set();
  let lineup=[...s.segments[0].lineup];
  if(!validLineup(lineup))fail();
  function applyGroup(minute,initialTactic){
   const decisions=groups.get(minute)||[];let tactic=initialTactic;
   for(const d of decisions){
    if(d.type==='tactic'){if(tactic!==null&&d.from!==tactic)fail();tactic=d.to;}
    else if(d.type==='talk')applyTalk(d,lineup,energy);
    else{const index=lineup.indexOf(d.out);if(index<0||lineup.includes(d.in)||departed.has(d.in))fail();const a=s.players[d.out],b=s.players[d.in];if(d.speedDelta!==b.speed-a.speed||d.attackDelta!==b.attack-a.attack||!near(d.energyDelta,energy[d.in]-energy[d.out]))fail();lineup[index]=d.in;departed.add(d.out);}
   }
   handled.add(minute);return tactic;
  }
  for(let i=0;i<s.segments.length;i++){
   const seg=s.segments[i],boundary=seg.start===0||seg.start===45||seg.start===65,decisions=groups.get(seg.start)||[],previous=i?s.segments[i-1]:null;
   if(!boundary&&!decisions.length)fail();
   const tactic=applyGroup(seg.start,boundary?null:previous.tactic);if(tactic!==null&&tactic!==seg.tactic||!equal(lineup,seg.lineup))fail();
   const snapshotPlayers=Object.fromEntries(Object.entries(s.players).map(([id,p])=>[id,{...p,energy:energy[id]}])),expected=ratings({...s,morale,players:snapshotPlayers,lineup:seg.lineup,tactic:seg.tactic,minute:seg.start});
   for(const key of ['attack','defense','middle','pace','paceBonus','ourRate','oppRate','ourGoal','oppGoal'])if(!near(seg.rating[key],expected[key]))fail();for(const key of ['attack','defense','middle','speed'])if(!near(seg.rating.opponent[key],expected.opponent[key]))fail();
   const duration=(seg.end??s.minute)-seg.start;
   for(let minute=0;minute<duration;minute++)for(const id of seg.lineup.filter(id=>!s.discipline||!Discipline.dismissed(s,0,seg.start+minute).includes(id))){const p=s.players[id];energy[id]=clamp(energy[id]-(35*(1+(50-p.endurance)/250)+(seg.tactic==='press'?8:0))/90,0,100);played[id]++;}
  }
  if(!running(s)&&['half','late'].includes(s.phase)&&groups.has(s.minute)&&!handled.has(s.minute)){if(groups.get(s.minute).some(d=>d.type==='tactic'))fail();applyGroup(s.minute,null);}
  if([...groups.keys()].some(minute=>!handled.has(minute))||!equal(lineup,s.lineup))fail();
  if((running(s)||s.phase==='full')&&s.tactic!==s.segments.at(-1).tactic)fail();
  for(const p of Object.values(s.players))if(p.minutes!==played[p.id]||!near(p.energy,energy[p.id]))fail();checkMorale();
 }
 function restore(raw){
  const fail=()=>{throw Error('저장된 경기를 읽을 수 없어요.');};
  if(!raw||![1,2,3,4,5].includes(raw.version)||!Number.isInteger(raw.seed)||!Number.isInteger(raw.rng)||raw.rng<0||raw.rng>4294967295||!formations[raw.formation]||!['press','balanced','counter'].includes(raw.tactic)||!Number.isInteger(raw.minute)||!Array.isArray(raw.lineup)||raw.lineup.length!==11||new Set(raw.lineup).size!==11||!Array.isArray(raw.out)||new Set(raw.out).size!==raw.out.length||!Number.isInteger(raw.subs)||raw.subs<0||raw.subs>3||raw.out.length!==raw.subs)fail();
  const ranges={prep:[0,0],first:[0,44],half:[45,45],second:[45,64],late:[65,65],third:[65,89],full:[90,90]},range=ranges[raw.phase];if(!range||raw.minute<range[0]||raw.minute>range[1])fail();
  if(Object.hasOwn(raw,'suspensionRules')&&raw.suspensionRules!==1)fail();if(!raw.suspensionRules&&Object.values(raw.players||{}).some(p=>p.suspended))fail();
  const s=JSON.parse(JSON.stringify(raw)),counts={GK:1,...formations[s.formation]};if(Object.keys(s.players||{}).length!==roster.length)fail();
  for(const slot of roster){
   const saved=s.players?.[slot.id];let p;if(s.version>=3&&typeof saved?.identity!=='string')fail();try{p=profileForSlot(slot.id,s.version>=3?saved?.identity:slot.id);}catch{fail();}
   if(!saved||!Number.isFinite(saved.energy)||saved.energy<0||saved.energy>100||!Number.isInteger(saved.minutes)||saved.minutes<0||saved.minutes>s.minute)fail();
   const stats={};for(const key of ['attack','defense','passing','speed','endurance','keeping']){const value=s.version===1?p[key]:saved[key];if(!Number.isInteger(value)||value<0||value>99)fail();stats[key]=value;}
   const initialEnergy=s.version===1?slot.energy:saved.initialEnergy;if(!Number.isFinite(initialEnergy)||initialEnergy<0||initialEnergy>100)fail();
   const potential=s.version>=3?saved.potential:Math.max(p.potential,stats[roleKey(p)]);if(!Number.isInteger(potential)||potential<p.potential||potential>99||stats[roleKey(p)]>potential)fail();
   const injuryRemaining=s.version>=4?saved.injuryRemaining:0;if(!Number.isInteger(injuryRemaining)||injuryRemaining<0||injuryRemaining>2||injuryRemaining>0&&saved.minutes!==0)fail();
   if(Object.hasOwn(saved,'suspended')&&(saved.suspended!==true||saved.minutes!==0))fail();
   s.players[p.id]={...p,...stats,potential,energy:saved.energy,initialEnergy,injuryRemaining,minutes:saved.minutes,...(saved.suspended?{suspended:true}:{})};
  }
  if(new Set(Object.values(s.players).map(p=>p.identity)).size!==roster.length||Object.values(s.players).reduce((n,p)=>n+p.minutes,0)!==s.minute*11-(s.discipline?.events||[]).filter(e=>e.team===0&&e.card==='red').reduce((n,e)=>n+s.minute-e.minute,0))fail();
  if(s.lineup.some(id=>!isAvailable(s.players[id]))||s.out.some(id=>!s.players[id]||s.lineup.includes(id)))fail();for(const [pos,count] of Object.entries(counts))if(s.lineup.filter(id=>s.players[id].pos===pos).length!==count)fail();
  for(const key of ['score','shots','chances','xg'])if(!Array.isArray(s[key])||s[key].length!==2||s[key].some(n=>!Number.isFinite(n)||n<0))fail();for(const key of ['logs','segments','decisions'])if(!Array.isArray(s[key]))fail();
  s.opponent=s.opponent||{attack:79,defense:75,middle:80,speed:48,energy:94};for(const key of ['attack','defense','middle','speed','energy'])if(!Number.isFinite(s.opponent[key])||s.opponent[key]<1||s.opponent[key]>99)fail();
  try{if(s.discipline)Discipline.validate(s);}catch{fail();}
  validateSegments(s,fail);
  for(let team=0;team<2;team++){if(s.score[team]>s.shots[team]||s.shots[team]>s.chances[team]||['score','shots','chances'].some(key=>!Number.isInteger(s[key][team])))fail();for(const [sumKey,segKey] of [['score','goals'],['shots','shots'],['chances','chances'],['xg','xg']])if(Math.abs(s.segments.reduce((sum,seg)=>sum+seg[segKey][team],0)-s[sumKey][team])>1e-8)fail();}
  if(s.logs.some(log=>typeof log.text!=='string'||log.text.length>300||!Number.isInteger(log.minute)||log.minute<0||log.minute>s.minute))fail();validateAttributions(s,fail);
  let rng=s.seed>>>0;for(let draw=0;draw<s.minute*8;draw++)rng=(Math.imul(rng,1664525)+1013904223)>>>0;if(s.rng!==rng)fail();
  s.homeName=typeof s.homeName==='string'&&s.homeName.length<60?s.homeName:'브린웰 로버스';s.opponentName=typeof s.opponentName==='string'&&s.opponentName.length<60?s.opponentName:'팔켄루 04';s.version=5;s.paused=running(s);return s;
 }
 const api={roster,startingRoster,mentalProfile,detailedAttributes,market,youthProfile,youthCandidates,identityProfile,profileForSlot,legacyName,personality,displayText,roleKey,formations,formationPositions,assignedPosition,isAvailable,fitLineup,create,setFormation,swap,setTactic,begin,tick,finishSegment,ratings,restore,running,goalAttributions,teamTalk,talkChoices,talkReactions,temperament};root.Football=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
