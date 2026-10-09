(function(root){
 'use strict';
 const F=root.Football||(typeof require==='function'?require('./engine.js'):null),T=root.PlayerTraits||(typeof require==='function'?require('./player-traits.js'):null);
 const clamp=(n,min=1,max=20)=>Math.max(min,Math.min(max,Math.round(n))),scale=n=>clamp(n/5);
 // Original game assessments, informed by public position/foot and playing-style
 // references. These are neither FotMob ratings nor imported match statistics.
 const MarketRoster=root.MarketRoster||(typeof require==='function'?require('./market-roster.js'):null);
 const profiles={...MarketRoster?.scouting,
  sp_g1:{country:'이탈리아',style:'전진하는 골문 지킴이',use:'패스가 필요한 빌드업과 뒷공간 커버를 맡기세요.',watch:'골문을 비우는 판단과 공중볼 대응을 함께 살피세요.',offset:{reflexes:2,rushing:2,distribution:1,handling:-1}},
  sp_g2:{country:'잉글랜드',style:'골문을 지키는 베테랑',use:'선방과 안정적인 골문 수비가 우선일 때 비교하세요.',watch:'빠른 전환에서는 속도와 패스가 약점입니다.',offset:{handling:2,aerial:2,rushing:-2,distribution:-2}},
  sp_d1:{country:'아르헨티나',style:'앞에서 끊는 수비수',use:'수비 능력을 살려 상대 공격을 먼저 차단하세요.',watch:'적극적인 수비와 경고 누적을 함께 관리하세요.',offset:{tackling:2,marking:1,aerial:1,vision:-1}},
  sp_d2:{country:'네덜란드',style:'뒷공간을 지우는 수비수',use:'높은 수비 뒤를 커버할 때 빠른 속도를 활용하세요.',watch:'속도만 보고 공중볼 담당까지 맡기지는 마세요.',offset:{acceleration:2,anticipation:1,aerial:-1,strength:-1}},
  sp_d3:{country:'스페인',style:'오른쪽 찬스 배달부',use:'오른쪽 풀백·윙백과 코너 담당으로 비교하세요.',watch:'전진할 때 남는 수비 공간을 확인하세요.',offset:{crossing:3,vision:1,longShots:2,marking:-1}},
  sp_d4:{country:'이탈리아',style:'왼쪽을 왕복하는 풀백',use:'왼발과 속도·지구력을 살려 왼쪽에 배치하세요.',watch:'크로스와 마무리보다 전진과 회복에 강점이 있습니다.',offset:{dribbling:1,acceleration:1,workRate:2,crossing:-1}},
  sp_d5:{country:'루마니아',style:'박스 안 공중볼 수비수',use:'중앙 수비와 코너 공중볼 후보로 비교하세요.',watch:'짧은 패스로 탈압박하는 역할은 별도로 비교하세요.',offset:{heading:3,aerial:2,strength:2,passing:-1,firstTouch:-1}},
  sp_d6:{country:'웨일스',style:'간격을 지키는 수비수',use:'중앙·왼쪽 수비에서 안정적인 연결을 맡기세요.',watch:'빠른 상대와 넓은 공간을 두고 경합하면 속도를 확인하세요.',offset:{positioning:2,anticipation:2,passing:1,acceleration:-1}},
  sp_m1:{country:'말리',style:'중원에서 공을 되찾는 미드필더',use:'수비형 미드필더로 수비와 패스를 연결하세요.',watch:'박스 근처에서의 결정력보다 중원 회수에 초점을 두세요.',offset:{tackling:2,dribbling:1,positioning:1,finishing:-1}},
  sp_m2:{country:'잉글랜드',style:'마지막 패스를 설계하는 선수',use:'공격형 미드필더·코너·프리킥 후보로 비교하세요.',watch:'수비와 지구력이 필요한 역할에는 보완할 동료를 두세요.',offset:{vision:3,firstTouch:2,crossing:2,longShots:2,strength:-2,heading:-2}},
  sp_m3:{country:'스웨덴',style:'중앙과 측면을 잇는 왼발',use:'중앙·공격형 미드필더 또는 오른쪽에서 안으로 들어오게 배치하세요.',watch:'폭을 넓히는 역할과 안쪽 연결 역할을 구분하세요.',offset:{dribbling:2,firstTouch:1,workRate:2,strength:1,acceleration:-1}},
  sp_m4:{country:'우루과이',style:'수비 앞 패스 연결고리',use:'수비형·중앙 미드필더로 회수와 배급을 함께 맡기세요.',watch:'공격수 바로 뒤 역할에서는 결정력을 다시 비교하세요.',offset:{firstTouch:2,vision:1,anticipation:2,positioning:1}},
  sp_m5:{country:'세네갈',style:'박스 사이를 오가는 엔진',use:'지구력과 속도로 중원 활동량을 보완하세요.',watch:'마지막 패스는 더 창의적인 동료와 나눠 맡기세요.',offset:{workRate:3,offBall:1,acceleration:1,firstTouch:-1}},
  sp_m6:{country:'스웨덴',style:'성장하는 중원 연결자',use:'중앙에서 패스 경험을 쌓고 개인 훈련을 이어가세요.',watch:'즉시 전력보다 출전 경험과 성장 여유를 보고 선택하세요.',offset:{firstTouch:2,dribbling:1,vision:1,strength:-1}},
  sp_f1:{country:'대한민국',style:'양발로 마무리하는 침투 공격수',use:'양발과 결정력·속도를 살려 측면 또는 중앙에 배치하세요.',watch:'공중볼 경합보다 공간을 향한 패스를 노리세요.',offset:{finishing:2,offBall:3,firstTouch:1,heading:-3,strength:-1}},
  sp_f2:{country:'잉글랜드',style:'동료를 돕는 중앙 공격수',use:'박스 마무리와 압박을 맡길 중앙 공격수로 비교하세요.',watch:'혼자 찬스를 만들기보다 패스를 공급할 동료가 필요합니다.',offset:{offBall:2,workRate:3,heading:2,strength:2,dribbling:-1}},
  sp_f3:{country:'웨일스',style:'수비 뒤를 달리는 측면 공격수',use:'속도를 살려 오른쪽에서 침투와 역습을 준비하세요.',watch:'지공에서는 패스와 퍼스트 터치를 함께 비교하세요.',offset:{offBall:3,acceleration:2,firstTouch:-1,vision:-1}},
  sp_f4:{country:'브라질',style:'박스 안에서 경합하는 공격수',use:'중앙·왼쪽 공격과 공중볼 마무리 후보로 비교하세요.',watch:'좁은 공간의 패스 연결보다 박스 안 경합에 초점을 두세요.',offset:{heading:3,offBall:2,strength:2,workRate:1,vision:-1}}
 };
 const roleDefinitions=[
  ['keeper','골문 수비','GK',['GK'],{reflexes:.5,handling:.3,aerial:.2},'선방·포구·공중볼'],
  ['sweeper','전진형 골키퍼','GK',['GK'],{reflexes:.35,rushing:.3,distribution:.25,acceleration:.1},'선방·전진·배급'],
  ['stopper','박스 수비','DEF',['CB'],{tackling:.35,marking:.3,heading:.2,strength:.15},'태클·마크·헤더'],
  ['cover','뒷공간 커버','DEF',['CB'],{pace:.35,acceleration:.25,anticipation:.2,positioning:.2},'속도·가속·예측'],
  ['ballDefender','패스하는 수비수','DEF',['CB'],{passing:.4,firstTouch:.2,positioning:.2,marking:.2},'패스·터치·위치 선정'],
  ['fullback','측면 수비','DEF',['LB','RB'],{tackling:.3,marking:.25,pace:.25,stamina:.2},'수비·속도·지구력'],
  ['wingback','측면 전진','DEF',['LWB','RWB','LB','RB'],{crossing:.35,pace:.25,stamina:.25,dribbling:.15},'크로스·속도·지구력'],
  ['anchor','중원 회수','MID',['DM','CM'],{tackling:.35,positioning:.25,passing:.2,stamina:.2},'태클·위치 선정·패스'],
  ['creator','찬스 설계','MID',['AM','CM','RW','LW'],{vision:.35,passing:.35,firstTouch:.2,dribbling:.1},'시야·패스·터치'],
  ['runner','중원 왕복','MID',['CM','DM'],{stamina:.35,workRate:.25,pace:.2,passing:.2},'지구력·활동량·속도'],
  ['winger','측면 돌파','FW',['LW','RW','LM','RM'],{pace:.3,dribbling:.3,offBall:.25,crossing:.15},'속도·드리블·침투'],
  ['finisher','침투와 마무리','FW',['ST','LW','RW'],{finishing:.5,offBall:.3,acceleration:.2},'결정력·침투·가속'],
  ['target','공중볼 마무리','FW',['ST'],{heading:.4,strength:.3,finishing:.3},'헤더·몸싸움·결정력'],
  ['pressForward','압박형 공격수','FW',['ST','LW','RW'],{workRate:.35,stamina:.25,pace:.2,finishing:.2},'활동량·지구력·속도']
 ];
 const roles=Object.fromEntries(roleDefinitions.map(([id,label,pos,positions,weights,keys])=>[id,{id,label,pos,positions,weights,keys}]));
 function attributes(p){
  const base=Object.fromEntries(F.detailedAttributes(p).flatMap(g=>g.items).map(i=>[i.key,i.value]));
  Object.assign(base,{heading:scale(p.attack*.35+p.defense*.3+p.endurance*.35),aerial:scale(p.keeping*.65+p.defense*.2+p.endurance*.15),longShots:scale(p.attack*.65+p.passing*.35),vision:scale(p.passing),anticipation:scale(p.defense*.5+p.speed*.25+p.passing*.25),positioning:scale(p.defense*.75+p.passing*.25),offBall:scale(p.attack*.65+p.speed*.35),workRate:scale(p.endurance),reflexes:p.pos==='GK'?scale(p.keeping):null,handling:p.pos==='GK'?scale(p.keeping*.85+p.defense*.15):null,rushing:p.pos==='GK'?scale(p.keeping*.45+p.speed*.3+p.defense*.25):null,distribution:p.pos==='GK'?scale(p.passing):null});
  if(p.pos!=='GK')base.aerial=null;
  for(const [key,delta] of Object.entries(profiles[p.identity]?.offset||{}))if(base[key]!==null&&Number.isFinite(base[key]))base[key]=clamp(base[key]+delta);
  const labels={finishing:'골 결정력',firstTouch:'퍼스트 터치',passing:'패스',crossing:'크로스',dribbling:'드리블',heading:'헤더',longShots:'중거리 슛',tackling:'태클',marking:'마크',vision:'시야',anticipation:'예측',positioning:'위치 선정',offBall:'공 없는 움직임',workRate:'활동량',loyalty:'충성도',professionalism:'프로 의식',determination:'승부욕',pressure:'압박 대처',teamwork:'팀워크',leadership:'리더십',pace:'주력',acceleration:'순간 가속',stamina:'지구력',strength:'몸싸움',agility:'민첩성',balance:'균형 감각',reflexes:'반사 신경',handling:'포구',rushing:'전진 판단',distribution:'골킥·배급',aerial:'공중볼 처리'};
  const groups=[['기술',p.pos==='GK'?['passing','firstTouch']:['finishing','firstTouch','passing','crossing','dribbling','heading','longShots','tackling','marking']],['판단 · 성격',['vision','anticipation','positioning','offBall','workRate','loyalty','professionalism','determination','pressure','teamwork','leadership']],['신체',['pace','acceleration','stamina','strength','agility','balance']],...(p.pos==='GK'?[['골키퍼',['reflexes','handling','rushing','distribution','aerial']]]:[])];
  return groups.map(([label,keys])=>({label,items:keys.map(key=>({key,label:labels[key],value:base[key]}))}));
 }
 function scoreRole(p,role,values){if(!role||!role.positions.some(code=>T.preferredPositions(p).includes(code)))return null;return Math.round(Object.entries(role.weights).reduce((n,[key,w])=>n+(values[key]||1)*5*w,0));}
 function roleScore(p,id){if(!Object.hasOwn(roles,id)||!p||!['GK','DEF','MID','FW'].includes(p.pos))return null;return scoreRole(p,roles[id],Object.fromEntries(attributes(p).flatMap(g=>g.items).map(i=>[i.key,i.value])));}
 function read(p){
  if(!p||!['GK','DEF','MID','FW'].includes(p.pos)||!['attack','defense','passing','speed','endurance','keeping'].every(k=>Number.isFinite(p[k])))return null;
  const profile=profiles[p.identity],groups=attributes(p),values=Object.fromEntries(groups.flatMap(g=>g.items).map(i=>[i.key,i.value])),assessments=Object.values(roles).map(role=>({...role,positions:[...role.positions],weights:{...role.weights},score:scoreRole(p,role,values)})).filter(r=>r.score!==null).sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id));
  const axes=p.pos==='GK'?[['reflexes','선방'],['handling','포구'],['rushing','전진'],['distribution','배급'],['aerial','공중볼'],['stamina','지구력']]:[['finishing','마무리'],['vision','창조'],['dribbling','돌파'],['tackling','수비'],['heading','헤더'],['stamina','지구력']];
  return {style:profile?.style||assessments[0]?.label||'균형형 선수',country:profile?.country||null,use:profile?.use||'현재 능력과 필요한 역할을 비교해 선발·영입을 결정하세요.',watch:profile?.watch||'역할 점수와 별개로 실제 주 능력·체력·부상 여부를 함께 확인하세요.',featured:!!profile,attributes:groups,roles:assessments,axes:axes.map(([key,label])=>({key,label,value:values[key]*5})),note:'0–100 코치 평가 · 실제 경기 통계나 백분위가 아닙니다. 세부 능력은 게임의 기본 능력과 선수별 특징으로 계산합니다.'};
 }
 const api={read,attributes,roles,roleScore};root.PlayerScouting=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
