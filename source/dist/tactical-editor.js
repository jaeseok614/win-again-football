// Editing is restricted to the tactics dialog; live pitch stays read-only.
var tacticalDrag=null;
function tacticalDropPoint(rect,x,y){return [Math.max(7,Math.min(93,Math.round((x-rect.left)/rect.width*100))),Math.max(8,Math.min(92,Math.round((y-rect.top)/rect.height*100)))];}
function commitTacticalPosition(id,point){
 if(!editable()||!state.lineup.includes(id))return;
 const p=state.players[id];customPositions[p.identity]=point;selected=id;save();render();
 const pos=F.assignedPosition(...point,p.pos);$('tactical-position-status').textContent=p.name+' · '+pos.code+' '+pos.label+' 배치 완료';
 $('tactical-editor').querySelector('[data-tactical-player="'+id+'"]')?.focus({preventScroll:true});
}
function renderTacticalEditor(){
 const host=$('tactical-editor');if(!host||!state||tacticalDrag)return;
 const canEdit=editable(),rows=positions().filter(row=>!Discipline.dismissed(state).includes(row.id)),chosen=rows.find(row=>row.id===selected);
 host.innerHTML='<h3>선수 배치와 역할</h3><p>유니폼을 누른 채 원하는 곳으로 끌어 놓으세요. 위치에 따라 배치 포지션이 바뀝니다. 키보드는 선수 선택 후 방향키로 이동합니다.</p><div class="tactical-pitch" role="group" aria-label="드래그로 선수 배치 · 공격 방향 위쪽"><span class="tactical-direction" aria-hidden="true">공격 방향 ↑</span>'+rows.map(({id,p,x,y})=>{const pos=F.assignedPosition(x,y,p.pos);return '<button type="button" data-tactical-player="'+id+'" aria-label="'+escapeText(p.name+' · '+pos.code+' '+pos.label+' · 방향키로 이동')+'" aria-pressed="'+(selected===id)+'" '+(!canEdit?'disabled':'')+' style="left:'+x+'%;top:'+y+'%"><b>'+p.no+' <em>'+pos.code+'</em></b><span>'+escapeText(p.name)+'</span></button>';}).join('')+'</div><p id="tactical-position-status" role="status" aria-live="polite">'+(chosen?escapeText(chosen.p.name)+' · 배치 '+F.assignedPosition(chosen.x,chosen.y,chosen.p.pos).code+' · 주 포지션 '+chosen.p.pos:'선수를 끌어 놓거나 선택하세요.')+'</p><p class="tactical-note">배치 포지션은 경기장의 출발 위치입니다. 선수의 주 포지션과 교체 등록 포지션은 유지됩니다. 포메이션을 바꾸면 새 기본 배치로 정렬합니다.</p>';
 host.onclick=event=>{const b=event.target.closest('[data-tactical-player]');if(!b||!canEdit||tacticalDrag)return;selected=b.dataset.tacticalPlayer;save();render();host.querySelector('[data-tactical-player="'+selected+'"]')?.focus({preventScroll:true});};
 host.onpointerdown=event=>{const b=event.target.closest('[data-tactical-player]');if(!b||!canEdit||event.button!==0||tacticalDrag)return;const row=rows.find(row=>row.id===b.dataset.tacticalPlayer);selected=row.id;tacticalDrag={id:row.id,pointer:event.pointerId,button:b,rect:b.parentElement.getBoundingClientRect(),point:[row.x,row.y]};b.setPointerCapture(event.pointerId);b.classList.add('dragging');event.preventDefault();};
 host.onpointermove=event=>{const d=tacticalDrag;if(!d||event.pointerId!==d.pointer)return;d.point=tacticalDropPoint(d.rect,event.clientX,event.clientY);d.button.style.left=d.point[0]+'%';d.button.style.top=d.point[1]+'%';const p=state.players[d.id],pos=F.assignedPosition(...d.point,p.pos);d.button.querySelector('em').textContent=pos.code;$('tactical-position-status').textContent=p.name+' · '+pos.code+' '+pos.label;event.preventDefault();};
 host.onpointerup=event=>{const d=tacticalDrag;if(!d||event.pointerId!==d.pointer)return;tacticalDrag=null;d.button.releasePointerCapture(event.pointerId);commitTacticalPosition(d.id,d.point);};
 host.onpointercancel=host.onlostpointercapture=event=>{if(!tacticalDrag||event.pointerId!==tacticalDrag.pointer)return;tacticalDrag=null;render();};
 host.onkeydown=event=>{const b=event.target.closest('[data-tactical-player]'),delta={ArrowLeft:[-2,0],ArrowRight:[2,0],ArrowUp:[0,-2],ArrowDown:[0,2]}[event.key];if(!b||!delta||!canEdit)return;event.preventDefault();const row=positions().find(row=>row.id===b.dataset.tacticalPlayer);commitTacticalPosition(row.id,[Math.max(7,Math.min(93,row.x+delta[0])),Math.max(8,Math.min(92,row.y+delta[1]))]);};
}
const tacticalEditorHost=document.createElement('section');tacticalEditorHost.id='tactical-editor';$('match-popup-tactics').prepend(tacticalEditorHost);
