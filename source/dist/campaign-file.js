(function(root){
 'use strict';
 const S=root.Season||(typeof require==='function'?require('./season.js'):null),F=root.Football||(typeof require==='function'?require('./engine.js'):null),Flow=root.MatchFlow||(typeof require==='function'?require('./match-flow.js'):null),T=root.Training||(typeof require==='function'?require('./training.js'):null);
 const format='win-again-campaign',version=1,maxBytes=2*1024*1024,dangerous=new Set(['__proto__','prototype','constructor']),views=['club','match','squad','market','academy','cup'];
 const tooLarge=()=>{throw Error('백업 파일은 2MiB 이하만 불러올 수 있어요.');};
 function bytes(text){
  if(typeof TextEncoder!=='undefined')return new TextEncoder().encode(text).length;
  let length=0;for(let i=0;i<text.length;i++){const code=text.charCodeAt(i);if(code<128)length++;else if(code<2048)length+=2;else if(code>=0xd800&&code<=0xdbff&&text.charCodeAt(i+1)>=0xdc00&&text.charCodeAt(i+1)<=0xdfff){length+=4;i++;}else length+=3;}return length;
 }
 function plain(value){
  if(!value||typeof value!=='object'||Array.isArray(value))return false;
  const proto=Object.getPrototypeOf(value);if(proto===null)return true;
  const descriptor=Object.getOwnPropertyDescriptor(proto,'constructor');return Object.getPrototypeOf(proto)===null&&descriptor&&typeof descriptor.value==='function'&&descriptor.value.name==='Object'&&Object.getOwnPropertyDescriptor(descriptor.value,'prototype')?.value===proto;
 }
 function clone(value,depth=0,seen=new WeakSet()){
  if(depth>80)throw Error('백업 데이터의 중첩이 너무 깊어요.');
  if(value===null||typeof value==='string'||typeof value==='boolean')return value;
  if(typeof value==='number'){if(!Number.isFinite(value))throw Error('백업에 저장할 숫자를 확인할 수 없어요.');return value;}
  if(!value||typeof value!=='object'||!Array.isArray(value)&&!plain(value))throw Error('백업에는 일반 JSON 데이터만 저장할 수 있어요.');
  if(seen.has(value))throw Error('순환 참조가 있는 데이터는 백업할 수 없어요.');seen.add(value);
  if(Object.getOwnPropertySymbols(value).length)throw Error('백업에는 일반 JSON 데이터만 저장할 수 있어요.');
  const array=Array.isArray(value);if(array&&value.length>maxBytes)tooLarge();if(array&&Object.getOwnPropertyNames(value).length!==value.length+1)throw Error('백업 배열의 값을 확인할 수 없어요.');const result=array?[]:{};
  for(const key of Object.getOwnPropertyNames(value)){
   if(array&&key==='length')continue;if(dangerous.has(key))throw Error('안전하지 않은 객체 키가 있어 백업을 읽을 수 없어요.');
   const descriptor=Object.getOwnPropertyDescriptor(value,key);
   if(!descriptor.enumerable||!Object.hasOwn(descriptor,'value')||array&&!/^(0|[1-9]\d*)$/.test(key))throw Error('백업에는 일반 JSON 데이터만 저장할 수 있어요.');
   if(descriptor.value===undefined&&!array)continue;result[key]=clone(descriptor.value,depth+1,seen);
  }
  if(array&&result.length!==value.length)throw Error('백업 배열의 값을 확인할 수 없어요.');seen.delete(value);return result;
 }
 function timestamp(value){
  if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value))throw Error('백업 파일의 저장 날짜를 확인할 수 없어요.');
  const date=new Date(value);if(!Number.isFinite(date.getTime())||date.toISOString()!==value)throw Error('백업 파일의 저장 날짜를 확인할 수 없어요.');return value;
 }
 function normalize(raw){
  if(!plain(raw)||!plain(raw.season))throw Error('구단 시즌 정보가 없는 파일이에요.');
  if(![2,3,4,5,6,7,8,9,10].includes(raw.season.version))throw Error('현재 게임에서 지원하지 않는 시즌 버전이에요.');
  let season;try{season=S.restore(raw.season);}catch(error){throw Error('구단 데이터가 손상되어 불러올 수 없어요. '+(error?.message||'시즌 상태를 확인하세요.'));}
  let view=views.includes(raw.view)?raw.view:'club';if(season.match&&F.running(season.match))view='match';if(!season.match&&view==='match')view='club';
  const individual=plain(raw.individual)?raw.individual:{},media=plain(raw.media)?raw.media:{},records=plain(raw.records)?raw.records:{};
  let lineupPlan=null;if(plain(raw.lineupPlan)&&plain(raw.lineupPlan.roles)&&plain(raw.lineupPlan.positions)){
   const identities=new Map(Object.values(season.squad).map(player=>[player.identity,player.pos])),allowed={GK:['goalkeeper','sweeperKeeper'],DEF:['centralDefender','ballPlayingDefender','wingBack'],MID:['centralMidfielder','deepLyingPlaymaker','boxToBox','advancedPlaymaker'],FW:['advancedForward','deepLyingForward','poacher','targetForward']},roles={},positions={};
   for(const [identity,role] of Object.entries(raw.lineupPlan.roles))if(identities.has(identity)&&allowed[identities.get(identity)].includes(role))roles[identity]=role;
   for(const [identity,point] of Object.entries(raw.lineupPlan.positions))if(identities.has(identity)&&Array.isArray(point)&&point.length===2&&point.every(Number.isFinite)&&point[0]>=7&&point[0]<=93&&point[1]>=8&&point[1]<=92)positions[identity]=point.slice();
   lineupPlan={roles,positions};
  }
  return {
   season,view,playback:Flow.normalize(raw.playback),media:{effects:media.effects!==false,haptics:media.haptics===true},
   individual:{slot:typeof individual.slot==='string'&&Object.hasOwn(season.squad,individual.slot)?individual.slot:'',focus:typeof individual.focus==='string'&&Object.hasOwn(T.choices,individual.focus)?individual.focus:'technique'},
   records:{tab:['health','training','records'].includes(records.tab)?records.tab:'health',filter:['all','league','cup','europe'].includes(records.filter)?records.filter:'all',sort:['goals','assists','minutes','cleanSheets'].includes(records.sort)?records.sort:'goals',year:Number.isInteger(records.year)&&records.year>=1&&records.year<=season.year?records.year:null},
   ...(lineupPlan?{lineupPlan}:{})
  };
 }
 function create(payload,options={}){
  const envelope={format,version,createdAt:timestamp(options?.createdAt??new Date().toISOString()),payload:normalize(clone(payload))};if(bytes(JSON.stringify(envelope))>maxBytes)tooLarge();return envelope;
 }
 function stringify(payload,options={}){const text=JSON.stringify(create(payload,options),null,2);if(bytes(text)>maxBytes)tooLarge();return text;}
 function read(text){
  if(typeof text!=='string')throw Error('백업 파일의 내용을 읽을 수 없어요.');if(bytes(text)>maxBytes)tooLarge();
  let parsed;try{parsed=JSON.parse(text.replace(/^\uFEFF/,''));}catch{throw Error('백업 파일의 JSON 형식을 읽을 수 없어요.');}
  const envelope=clone(parsed);
  if(!plain(envelope)||envelope.format!==format)throw Error('이번엔 우승한다 구단 백업 파일이 아니에요.');
  if(envelope.version!==version)throw Error('현재 게임에서 지원하지 않는 백업 버전이에요.');
  if(Object.keys(envelope).some(key=>!['format','version','createdAt','payload'].includes(key)))throw Error('백업 파일의 형식을 확인할 수 없어요.');timestamp(envelope.createdAt);
  const payload=normalize(envelope.payload),s=payload.season,me=S.standings(s).find(c=>c.id===S.own);
  return {payload,summary:{year:s.year,round:s.round+1,competition:s.competition,...(s.competition==='europe'?{stage:s.europe.stage}:{}),phase:s.match?.phase??'season-complete',minute:s.match?.minute??null,club:S.club(S.own).name,rank:me.rank,points:me.points,balance:s.finance.balance,playerCount:Object.keys(s.squad).length}};
 }
 const api={create,stringify,read,maxBytes};root.CampaignFile=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
