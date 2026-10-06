# 플레이 경험 개선 — 2026-10-03

참고: [요즘IT · Codex에 앱스토어 1위 게임 만들라 했더니, 진짜 1위 했다](https://yozm.wishket.com/magazine/detail/3968/)

기사의 반복 플레이 성장감, 구체적인 기획, 실제 화면을 통한 검증을 이 게임에 적용한다.
순위나 매출을 보장하거나 임의의 재미 점수를 만들지 않는다. 다른 게임의 환생 시스템을
그대로 옮기기보다 기존의 선수 성장·승격·시즌 계승을 플레이어가 이해하도록 개선한다.

## 이번 구현

감독실 ‘우승까지의 여정’은 리그 승리, 1부 승격, 국내컵 우승, 1부 우승,
유럽 우승을 확정된 경기·시즌 기록에서 계산한다. 목표는 순서에 관계없이 달성 가능하다.
리그 진행은 현재 저장된 대회의 전체 일정 길이를 기준으로 표시합니다. 새 5부 피라미드는
1부 38경기, 2~5부 각 46경기이며, 이전 시즌 형식은 저장된 규칙과 길이를 유지합니다.
이 수치는 우승 확률을 뜻하지 않습니다.
새 저장 필드나 중복 보상은 없고, 저장 내보내기/가져오기로 기존 기록과 함께 이동한다.
구버전에 남아 있지 않은 과거 승리는 추정하지 않는다.

합격 기준: 새 구단 0/5, 미확정 승리 제외, 해당 리그 최종 라운드 전 승격·리그 우승 제외,
시즌 전환 뒤 기록 유지, 기존 저장 복원, 읽기 시 상태/RNG 불변,
숨은 화면 계산 생략, 360px 가로 넘침 없음, 버튼 높이 44px 이상.
자동 검증과 실제 브라우저에서 위 기준을 확인했다.

## 이어서 개발할 항목

- 구단주 면담과 약속: 구현 완료. 신뢰·투자와 저장 규칙은 OWNER_BOARD.md 참고.
- 누적 경고/다음 경기 출전 정지: 우리 구단 구현 완료. 인원 부족 시 집행 연기 규칙은 SUSPENSIONS.md 참고.
- 시즌 결산·통합 일정·선발 계획 저장: 구현. SEASON_PLANNING.md 참고.
- 과거 경기 조회·영입 후 자금 계획: 구현. MATCH_ARCHIVE_AND_BUDGET.md 참고.
- 영입 후보 검색·관심 목록·계약 최종 검토: 구현. TRANSFER_PLANNING.md 참고.
- 통산 선수/개인 기록: 구현. CAREER_RECORDS.md 참고.
- 리그 전체 순위·과거 라운드 결과·최근 흐름: 구현. LEAGUE_CENTRE.md 참고.
- 상대 구단의 리그 누적 경고·퇴장 정지: 구현. 실제 경기 영수증과 고정 시드 AI 경기에서 계산하고 결장 선발을 가상 후보로 교체한다. 범위와 호환성은 RIVAL_DISCIPLINE.md 참고.
- 화면/탭별 갱신과 숨은 분석 생략: 구현. VISIBLE_RENDERING.md 참고.
- 여러 시즌 훈련·영입·계약·대화 통합 검증: 62경기 / 1,052회 복원을 CI에 포함.

## Football-management game references

FC 26's official Career Mode notes connect tactical flexibility, player roles,
training energy, and player development. Our adaptation keeps the same decision
loop (scout the opponent, compare lineups and fitness, then adjust tactics) while
using original fictional clubs, players, portraits, and ratings. The opponent
scout now places player faces beside the role-weighted ability and fitness values
to make that pre-match decision easier to scan on mobile. See EA's [Career Mode
deep dive](https://www.ea.com/games/ea-sports-fc/fc-26/news/pitch-notes-fc26-career-mode-deep-dive)
and [Career Mode guide](https://help.ea.com/en/articles/ea-sports-fc/career-mode/).

코드는 최신 main을 기준으로 이어간다. 개인 구단 저장과 코드 동기화는 별도다.
스토어 제출 자료는 실제 빌드 화면으로 만들고, 새 APK는 해당 커밋의 Android CI
APK/AAB/lint/에뮬레이터 성공 여부를 확인한 뒤 안내한다.
