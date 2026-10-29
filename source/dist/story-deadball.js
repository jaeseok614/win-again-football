(function(root){
 'use strict';
 // Additive v1 scene: only a confirmed full rule12+ league receipt can open it.
 const serial=()=>root.StorySerial||(typeof require==='function'?require('./story-serial'):null);
 function events(s,year=s.year){
  const g=serial().games(s,year).find(g=>g.continuousVersion>=12&&Number.isInteger(g.physicalStats?.corners?.[0])&&g.physicalStats.corners[0]>0);if(!g)return [];
  const corners=g.physicalStats.corners[0],fact='리그 '+g.round+'R · 최종 '+g.score.join(' : ')+' · 우리 코너 '+corners+'회';
  const follow='“키커 이름만 바꾸면 끝날까요? 공을 올린 뒤 누가 남고 누가 들어갈지도 같이 봐야죠.”',options=['다음 준비에서 키커와 타깃을 직접 비교하자','득점을 약속하진 말고 각자 맡을 위치를 확인하자'],replies=['코치가 노트를 덮었다. “좋아요. 정하는 건 감독님이고, 우리는 실행할 수 있는지 같이 보죠.” 선수 명단과 키커는 아직 그대로였다.','“그 말이면 됐어요. 코너를 얻는 것과 골을 넣는 건 다른 일이니까.” 그는 다음 경기의 빈 전술판을 들고 일어났다.'];
  return [{key:'deadball-second-v1',round:g.round,relation:'coach',speaker:'수석 코치',conflict:true,readingVersion:2,drama:'locker',action:'setpieces',context:'세트피스 복기 · 확정 경기 기록',title:'기회 다음에 남은 공',scene:'선수들이 씻으러 간 뒤, 수석 코치는 구겨진 기록지를 전술판 위에 펼쳤다. “'+fact+'. 코너 숫자만 보면, 다들 골문 쪽 생각부터 하죠.” 그는 슛이 들어갔다거나 전술이 성공했다고 적지는 않았다. 기록지에서 확실히 아는 건 오늘의 횟수와 결과뿐이었다.\n\n“기회가 하나 더 생겼다고 준비까지 끝난 건 아니잖아요.” 코치가 자석 두 개를 벌려 놓았다. 나는 공을 차는 선수의 이름부터 고르려다 손을 멈췄다. 올리는 공의 높이, 기다리는 동료의 위치, 튕겨 나온 공 뒤에 남을 사람. 숫자 하나로는 보이지 않던 질문들이 작은 전술판에 남았다. “그럼 감독님은 다음 코너에서 뭘 먼저 확인할 겁니까?”',thought:'코너 횟수가 늘면 잘 풀린다고 쉽게 생각했지. 그 뒤에 누가 뭘 해야 하는지는 내가 정해야 한다. 멋진 작전 이름보다 선수들이 이해할 한 가지부터 만들자.',question:'“다음 준비에 가져갈 질문 하나만 정합시다. 누구에게 뭘 물을 건가요?”',options:['차는 선수와 받는 선수가 본 위치부터 듣자','코너 하나도 끝까지 준비하는 팀을 만들자','실제 키커 능력과 타깃 배치를 함께 비교하자'],replies:['“같은 공을 보고도 기대하는 위치는 다를 겁니다. 둘 다 불러서 들어보죠.” 코치가 의자를 하나 더 꺼냈다.','“좋은 말이에요. 공이 안 들어간 날에도 같은 기준으로 돌아볼 수 있으면 더 좋겠군요.”','“숫자는 확인하고, 실제로 맡길 역할은 직접 정하죠. 코너 횟수만으론 누가 잘못했는지 알 수 없으니까.”'],turns:[0,1,2].map(()=>[follow,options,replies])}];
 }
 const api={events};root.StoryDeadball=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
