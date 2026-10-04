const reviewSkillNames={attack:'결정력',defense:'수비',passing:'패스',keeping:'선방'};
function reviewIdentityMarkup(p,{large=false}={}){
 const content=Portraits.html(F.identityProfile(p.identity),large?{size:'large'}:{})+'<span><strong>'+playerUiText(p.name)+'</strong><small>'+playerUiText(p.pos||F.identityProfile(p.identity).pos)+(p.owned?' · 선수 카드 ↗':' · 경기 당시 선수')+'</small></span>';
 return p.owned?'<button class="review-player-button" data-player-detail="'+playerUiText(p.identity)+'" aria-label="'+playerUiText(p.name)+' 선수 상세 보기">'+content+'</button>':'<div class="review-player-button review-former-player">'+content+'</div>';
}
function matchReviewMarkup(d,{compact=false}={}){
 if(!d?.valid)return '';
 const played=d.players.filter(p=>p.minutes>0),creators=played.filter(p=>p.goals>0||p.assists>0).sort((a,b)=>b.goals-a.goals||b.assists-a.assists||b.minutes-a.minutes||a.name.localeCompare(b.name,'ko'));
 const featured=creators.length?creators:played.filter(p=>p.cleanSheets>0),outcome=d.winner===S.own?'승리':d.winner?'패배':'무승부';
 const label=d.competition==='cup'?'컵 '+P.stageNames[d.stage]:d.competition==='europe'?'챔피언스리그 '+Europe.stageNames[d.stage]:'리그 '+d.round+'R',header=d.pending?'경기 결과와 선수 기록':'최근 경기 결과';
 const partial=d.legacy?'이전 저장에는 이 경기의 선수별 출전·득점 자료가 없습니다.':d.coverage.unassignedGoals>0?'이 경기에는 득점 선수가 기록되지 않은 골이 있습니다.':d.coverage.partial?'이전 저장에서 이어진 경기입니다. 기록이 있는 득점부터 집계합니다.':'';
 const board=d.confirmed&&d.cashflow?season.finance.ledger.slice(season.finance.ledger.findIndex(e=>e.id===d.cashflow.id)+1).filter(e=>e.type==='board'&&e.year===d.year&&e.round===d.round):[];
 const cashflow=typeof matchCashflow==='function'?matchCashflow(d.cashflow):d.cashflow;
 const playerCards=featured.slice(0,4).map(p=>'<article class="review-featured-player">'+reviewIdentityMarkup(p)+'<p>'+[p.goals?p.goals+'골':'',p.assists?p.assists+'도움':'',p.cleanSheets?'90분 무실점':'',p.minutes+'분 출전'].filter(Boolean).join(' · ')+'</p></article>').join('');
 const rows=played.map(p=>'<tr><th scope="row">'+reviewIdentityMarkup(p)+'</th><td>'+ (p.started?'선발':'교체')+'</td><td>'+p.minutes+'<small>분</small></td><td>'+p.goals+'</td><td>'+p.assists+'</td><td>'+(p.pos==='GK'?p.cleanSheets:'—')+'</td></tr>').join('');
 const growing=d.growth.map(p=>'<article class="review-growth-player">'+reviewIdentityMarkup(p)+'<span class="review-gain">'+playerUiText(reviewSkillNames[p.key]||p.key)+' +'+p.gained+'</span></article>').join('');
 const injuryLine=(p,type)=>'<div class="review-health-line '+(type==='injury'?'review-injury':'review-recovered')+'"><span>'+ (type==='injury'?'휴식 판정':'복귀 가능')+'</span><b>'+playerUiText(p.name)+'</b><small>'+(type==='injury'?playerUiText(H.kindLabel(p.kind))+' · '+p.remaining+'경기 휴식':'부상 휴식 완료')+'</small></div>';
 const health=d.healthAligned?d.injuries.map(p=>injuryLine(p,'injury')).join('')+d.recovered.map(p=>injuryLine(p,'recovered')).join(''):'';
 const events=d.events.map(e=>'<li><b>'+e.minute+'′</b><span>'+playerUiText(e.scorerName)+'<small>'+(e.assistName?'도움 '+playerUiText(e.assistName):'도움 기록 없음')+'</small></span></li>').join('');
 return `<section class="match-review ${compact?'review-compact':''} ${d.pending?'review-pending':''}" aria-label="${d.pending?'경기 종료 후 확정 전 리뷰':'최근 확정 경기 리뷰'}" data-review-id="${playerUiText(d.id)}">
  <div class="review-heading"><div><div class="eyebrow">${d.pending?'FULL TIME / NOT CONFIRMED':'전체 대회 최근 확정 경기'} / ${d.year} SEASON</div><h3>${header}</h3></div><span class="review-state">${d.pending?'결과 확정 전':'확정 완료'}</span></div>
  <div class="review-score"><div><span>${playerUiText(label)} · ${d.venue.label}</span><strong>${playerUiText(S.club(S.own).short)} <b>${d.score[0]} : ${d.score[1]}</b> ${playerUiText(d.opponent.short)}</strong></div><span class="review-outcome ${d.winner===S.own?'review-win':''}">${outcome}</span></div>
  ${d.penalties?'<p class="review-penalties">90분 무승부 · 승부차기 '+d.penalties[0]+' : '+d.penalties[1]+' · '+outcome+'</p>':''}
  <p class="review-status-note">${d.pending?'출전·득점은 이번 경기 내용입니다. 결과를 확정해야 경험·성장·부상·재정에 반영됩니다.':'출전 경험과 구단 결과를 반영했습니다. 아래 수치는 이 경기의 확정 기록입니다.'}</p>
  ${partial?'<p class="review-limited">'+partial+(d.coverage.unassignedGoals?' 선수 미지정 '+d.coverage.unassignedGoals+'골.':'')+'</p>':''}
  ${featured.length?'<div class="review-contributors"><h4>'+ (creators.length?'골을 만든 선수들':'90분 무실점의 주인공')+'</h4><div class="review-featured-grid">'+playerCards+'</div>'+(featured.length>4?'<small>전체 '+featured.length+'명은 출전 명단에서 확인하세요.</small>':'')+'</div>':d.legacy?'':'<p class="review-no-contributor">이번 경기에는 우리 구단의 득점·도움·골키퍼 무실점 기록이 없습니다.</p>'}
  ${d.confirmed?'<div class="review-settlement"><section><h4>출전이 성장으로</h4>'+(growing?'<div class="review-growth-list">'+growing+'</div>':'<p>'+ (d.legacy?'이전 저장에 남아 있는 능력 상승 자료는 없습니다.':'이번 경기에는 주요 능력 상승이 없습니다. 출전 경험은 다음 성장에 쌓입니다.')+'</p>')+'</section><section><h4>경기 뒤 몸 상태</h4>'+(d.healthAligned?(health||'<p>새 부상·복귀 선수가 없습니다.</p>'):'<p>이 경기의 건강 점검 자료가 없습니다.</p>')+'</section></div>':''}
  ${d.confirmed&&cashflow?'<div class="review-cash"><span>이 경기 정산</span><strong class="'+(cashflow.amount<0?'loss':'')+'">'+signedMoney(cashflow.amount)+'</strong><small>경기 순수익'+(d.competition==='cup'?' · 컵 상금 포함':d.competition==='europe'?' · 유럽 대회 수입·상금':cashflow.staffPayroll?' · 선수·코치 급여 포함':' · 선수 급여 포함')+'</small></div>':''}
  ${board.length?'<p class="review-board">이사회 과제 보상 · '+board.map(e=>playerUiText(missionInfo[e.task].title)+' '+moneyLabel(e.amount)).join(' / ')+'</p>':''}
  ${played.length?'<details class="review-roster"><summary>전체 출전 선수 '+played.length+'명 <span>출전 시간 · 득점 · 도움</span></summary><div class="table-wrap"><table><thead><tr><th>선수</th><th>투입</th><th>출전</th><th>골</th><th>도움</th><th>무실점</th></tr></thead><tbody>'+rows+'</tbody></table></div><p>선발은 킥오프 명단, 시간은 실제 뛴 분입니다. 무실점은 90분 출전한 골키퍼 기록입니다.'+(d.pending?' 아직 시즌 기록에 반영하지 않았습니다.':'')+'</p></details>':''}
  ${events?'<details class="review-events"><summary>우리 구단 득점 장면 '+d.events.length+'개</summary><ol>'+events+'</ol><p>승부차기 득점은 포함하지 않습니다.</p></details>':''}
 </section>`;
}
function renderLatestMatchReview(){const target=$('last-round');if(target)target.innerHTML=matchReviewMarkup(MatchReview.read(season),{compact:true});}
function focusLatestMatchReview(){const target=$('last-round')?.querySelector('.match-review');if(!target)return;target.setAttribute('tabindex','-1');target.scrollIntoView({block:'start',behavior:'instant'});target.focus({preventScroll:true});}
