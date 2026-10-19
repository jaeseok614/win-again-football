# 압박과 역습 · 연속 규칙13 — 2026-10-19

새 킥오프와 새 연습만13을 쓴다. 공개1–12의 물리·난수·부분 저장·명령·연습·정산은 보존한다. schema10, 저장키 win-again-season-v17과 앱 ID는 같다. 현재 시즌을 이동하지 않는다. 다음 공개 물리 변경에는14가 필요하다.

## 공을 빼앗은 뒤의 연결

가까운 지원 선수는 출발 대형의 점이 아닌 실제 거리로 고른다. 중원 선수를 우선하고 후방에서는 가까운 수비수도 패스 출구가 될 수 있으며, 최대 두 명만 움직인다. 앞·옆·뒤 후보를 비교해 빈 공간, 동료와의 간격, 실제 가속·패스 도착에 따른 차단 위험과 이동 거리를 평가한다. 대형 주변으로 이동 범위를 제한하고 실제 가속으로 도착한다.

역습 공격수는 탈취 뒤9초 동안 수비수와 같은 통로로 곧장 달리는 대신, 대형 주변의 대각선 공간을 찾는다. 목표는 오프사이드 선 안에 두지만 이미 선을 넘은 실제 선수를 옮기거나 판정을 면제하지 않는다. 최종 역습 목표에 가까워지면 전력질주를 멈추고, 달리는 중에도 남은 거리로 감속한다. 패스를 기다리며 앞뒤로 과도하게 왕복하던 체력 낭비를 줄인다. 전체 선수의 이동 속도나 득점 확률을 일괄 올리지 않았다.

## 압박의 시작과 협력

첫 터치·측면·골키퍼는 적극적으로 접근할 계기다. 공을 안정적으로 다루는 상대에게 먼 거리부터 계속 달려들기보다 블록과 패스 길을 지킨다. 두 번째 압박 선수는 기존 체력·거리 조건과 함께 첫 선수와의 도착 차이를 확인한다. 접근 담당은 최대 두 명이며 나머지는 마크·커버·복귀를 수행한다.

전력질주하며 뻗는 태클과 자리를 잡고 내미는 태클은 같은 거리로 공을 빼앗지 않는다. 실제 속도에 따라 도달 범위를 제한하고 공을 잃은 직후 회복 중인 선수의 즉시 재태클도 막는다. 기존 능력·체력 기반 성공률, 반칙과 카드, 실제 공 접촉·경계 판정은 유지한다. 거리와 시간 계수는 이 게임의 자체 값이며 외부 연구의 권장 수치로 표시하지 않는다.

## 한 화면에서 전술을 읽기

전술 분석의 기존 가로 작업 공간에 ‘탈취 직후’를 추가했다. 우리·상대 소유, 후방·중원·측면·탈취 상황과 네 전술을 비교한다. 같은 엔진의 복사본에서 목표만 계산하며 경기·난수·돈·선발을 진행하지 않는다. 실제 위치와 목표 배치도 구분한다. 적용 버튼을 눌러야 지시가 바뀐다.

작은 분석도의22명 이름은 겹치는지 실제 글자 영역까지 검사한다. 줄 정렬과 빈 구간 검색, 제한된 네 번의 글자 크기 조절로 맞추고 넓은 분석도에서는 번호와 이름을 함께 보여준다. 연결선을 그리거나 선수를 감추지 않는다. 기본 라이브 이름표의 기존 크기·위치 유지 계약은 보존한다. 필터와 주요 동작은44px 높이를 유지한다.

새 연습은 실제 경기에서 자연스럽게 만들어진75분1:2(씨드1),80분1:0(씨드6)이다. 공개1–12의 연습 씨드와 기록은 그대로다.

## 공식 참고와 구현 범위

- [EA 감독 모드](https://www.ea.com/ea-originals/news/manager-mode): 지원·전개 속도·수비 폭·협력 압박의 관계를 참고했다.
- [FM의 공 소유 전환](https://www.footballmanager.com/fm26/features/possession-out-possession-fm26s-new-tactical-evolution): 소유와 비소유의 역할·위치를 함께 비교하는 방식을 참고했다.
- [FIFA 역습 공간 만들기](https://www.fifatrainingcentre.com/en/practice/elite-sessions/transition-to-attacking/opening-space-on-the-counter-attack.php): 첫 연결, 대각선 침투와 동료의 지원을 참고했다.
- [FIFA 높은 압박](https://www.fifatrainingcentre.com/en/game/game-analysis/out-of-possession/high-press.php), [압박을 통과하는 패스](https://www.fifatrainingcentre.com/en/game/game-analysis/transition-to-attacking/passing-the-press.php): 압박 계기·협력과 이를 벗어날 출구를 참고했다.

외부 게임의 코드·그림·대사를 복사하지 않았다. 골·코너·승률을 정해 놓고 주입하지 않는다. 전술 대결은 동급 전력의 고정 진단과 T.coach의 적응 진단을 구분한다. 후자는 시작 전술 라벨이며 경기 중 바뀔 수 있고 캠페인의 하프타임/65분 상대 계획까지 재현하는 실전 전체 경기와도 구분한다.

## 검증과 남은 조정

최종 수치는 [전술 비교 증빙](PRESS_COUNTER_RULE13_BENCHMARK_2026-10-19.json)과 [설치 검증 증빙](PRESS_COUNTER_RULE13_RELEASE_2026-10-19.json)에 기록한다. 아직 네 전술의 우열이 사라졌다고 주장하지 않는다. 고정 전술에서 남는 압박 우세, 낮은 수비의 커버와 강한 초기 선수단의 장기 득점은 계속 볼 부분이다.

재현: node source/run-tests.cjs, node source/build-pwa.cjs, node source/test-pwa.cjs index.html, node source/build-android.cjs. 전술 비교는 node source/benchmark-tactics.cjs --versions 12,13 --seeds 701,702,703,704 --coach fixed 또는 --coach adaptive. Playwright/Chrome 환경에서 source/browser/runtime-replay.cjs, regain-preview.cjs, horizontal-pitch.cjs를 실행한다. 사용자 저장을 테스트 입력으로 쓰지 않는다.
