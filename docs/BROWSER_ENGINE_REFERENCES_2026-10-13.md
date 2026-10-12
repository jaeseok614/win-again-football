# 브라우저 축구 엔진 참고 · 2026-10-13

사용자가 공유한 [Kotaku 기사](https://kotaku.com/we-might-be-cooked-as-these-vibe-coded-web-browser-ports-of-halo-the-simpsons-hit-and-run-and-gta-vice-city-seem-to-work-perfectly-2000743300)는 브라우저 게임 포팅을 소개합니다. 기사에서 재사용 가능한 축구 엔진 소스는 확인되지 않았습니다. 연결된 X 게시물은 읽기 오류로 원본 프로젝트·성능·라이선스를 검증하지 못했습니다. 기사 속 게임 바이너리/자산을 받거나 이식하지 않았습니다.

직접 확인한 1차 자료:
- [Open Soccer](https://github.com/modelence/open-soccer): [engine.ts](https://github.com/modelence/open-soccer/blob/main/src/client/game/engine.ts)의 프레임 루프, 도착 시 감속(moveToward)과 경합 시 감속하지 않는 driveToward; [render.ts](https://github.com/modelence/open-soccer/blob/main/src/client/game/render.ts)의 순수 Scene→Canvas 렌더러. 아케이드 조작 게임이며 FM식 전술·능력 밸런스의 검증 자료는 아닙니다.
- [HussBall](https://github.com/Nicofisi/HussBall): 물리/화면 분리, 고정60Hz와 표시 보정의 공개 README. 직접 조작 기반이므로 22명 감독 AI를 그대로 가져오지 않습니다.
- [Emscripten 공식 실행 환경](https://emscripten.org/docs/porting/emscripten-runtime-environment.html): 프레임마다 브라우저에 제어권을 돌려주는 비동기 루프. WebAssembly 컴파일만으로 전술·판정이 개선된다는 자료는 아닙니다.

## 실제 반영

새 규칙8의 포메이션 도착 감속은 자리 유지·지원·마크에만 적용하고 공 받기·압박·키퍼·재개 담당은 접촉까지 진행합니다. 이 구분은 실제 접촉 전에 멈추는 문제를 피합니다. 물리100ms는 유지하며 인접한 실제 좌표만 표시 보간하고 슈팅/골/카드 접촉·정지 시 실제 좌표를 표시합니다.

추가 최적화는 규칙 변경 없이 적용합니다. 화면용22명 좌표의 팀 구분을 한 번의 순회로 만들고, 한 RAF 콜백 내 여러 물리 틱에서 직전에 만든 실제 스냅샷을 다음 틱의 이전 좌표로 사용합니다. N틱의 F.continuousFrame 호출은2N에서N+1로 줄어듭니다. 다음 콜백에는 새로 읽어 같은 틱에서 바뀐 감독 지시·선수 정보를 낡은 캐시로 표시하지 않습니다. 물리 루프6ms 예산·숨김/정지 동결·명령 기록/RNG·저장 세계는 그대로입니다.

원본 소스 코드는 복사하지 않았고 외부 라이브러리·네트워크 의존은 추가하지 않았습니다. 새 WebAssembly 포팅은 현재 JavaScript 물리의 병목 측정 없이 진행하지 않습니다. 구조를 참고한 자체 구현입니다.

## 검증

source/test-continuous-ui.cjs에 다중 틱의 스냅샷 호출 감소·다음 콜백 갱신·정지 좌표/읽기 전용 회귀를 추가합니다. 공개 규칙7의 부분/완료/정산 골든과 새 규칙8 전체 관전의 직접 엔진 세계/RNG/체력/로그 일치, 브라우저8크기와 Android34/35 결과는 HANDOFF 최신 항목에 기록합니다.
