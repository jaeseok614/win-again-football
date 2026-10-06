# 선수 최근 경기 폼

훈련 센터의 선수 목록과 선택 선수 보고서에 가장 최근의 확정 출전 5회를 표시합니다. 리그·국내컵·유럽대회를 함께 읽고, 교체 명단에만 있었던 경기와 아직 확정하지 않은 경기는 제외합니다. 지난 시즌 통산 기록도 같은 선수 ID의 영수증에서 이어 읽습니다.

폼은 실제 팀 결과(승·무·패)와 선수의 출전 시간·골·도움으로 구성합니다. 임의의 선수 평점이나 가상의 경기 기록은 만들지 않습니다. 보고서는 기존 statistics 영수증을 역순으로 읽어 필요 인원이 최근 5회 출전을 채우면 멈춥니다. 선수단·경기 결과·체력·재정·저장·RNG에는 쓰지 않습니다.

훈련 센터의 간결한 목록은 최근 결과를 최신순으로 보여 주며, 선택 선수 패널에는 상대와 스코어, 출전 시간, 공격 기여를 펼쳐 보여 줍니다. 실제 선발 변경은 기존 경기 전 전술 도구에서 감독이 직접 합니다.

구성 아이디어로 [Football Manager 26 Mobile](https://www.footballmanager.com/fm26/features/football-manager-26-mobile-new-features-showcase)의 선수별 폼 및 훈련 보고 흐름을 참고했습니다. 이 게임에서는 선수 평점 대신 저장된 확정 경기 통계만 표시하도록 맞췄습니다.

검증: `node source/test-player-form.cjs`, `node source/test-training-centre.cjs`, `node source/test-training-centre-ui.cjs`와 전체 테스트 및 PWA/Android 오프라인 빌드 검사.
