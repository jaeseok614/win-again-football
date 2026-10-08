let characterTalkIdentity=null,characterTalkTurn=0;
function renderPlayerCharacter(p){
 if(characterTalkIdentity!==p.identity){characterTalkIdentity=p.identity;characterTalkTurn=0;}
 const c=PlayerCharacter.info(p);
 return '<article class="character-profile" aria-label="'+playerUiText(p.name)+'의 라커룸"><div class="character-heading"><span class="eyebrow">라커룸</span><span class="character-nickname">'+playerUiText(c.nickname)+'</span></div><p id="character-dialogue" class="character-dialogue" aria-live="polite">'+playerUiText(PlayerCharacter.dialogue(p,characterTalkTurn))+'</p><div class="character-footer"><span class="character-condition">'+playerUiText(c.condition)+'</span><button id="character-talk" type="button">한마디 더 듣기 <span aria-hidden="true">↻</span></button></div><small class="character-trait">'+playerUiText(c.trait)+'</small></article>';
}
function bindPlayerCharacter(p){
 const button=$('character-talk');if(!button)return;
 button.onclick=()=>{characterTalkTurn++;$('character-dialogue').textContent=PlayerCharacter.dialogue(p,characterTalkTurn);};
}
