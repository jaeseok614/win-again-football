// Original, offline vector crests. Stable club identity, no external logo requests.
(function(root){
 const cache=new Map(),esc=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function html(club){
  const c=club||{},key=[c.id,c.code,c.color].join('|');if(cache.has(key))return cache.get(key);
  let hash=2166136261;for(const ch of String(c.id||c.name||c.code))hash=(Math.imul(hash,16777619)^ch.charCodeAt(0))>>>0;
  const color=/^#[a-f0-9]{3,8}$/i.test(c.color||'')?c.color:'#315d76',shape=hash%3;
  const outline=shape===0?'M8 4H48V30Q48 48 28 57Q8 48 8 30Z':shape===1?'M28 3L49 13V34L40 49L28 57L16 49L7 34V13Z':'M28 3C57 3 60 42 28 57C-4 42 -1 3 28 3Z';
  const symbol=['M28 13L31 22L41 22L33 28L36 37L28 31L20 37L23 28L15 22L25 22Z','M16 33L20 17L28 25L36 17L40 33Z','M16 30L28 13L40 30L28 25Z','M17 16L39 34M39 16L17 34'][hash%4];
  const value='<span class="club-mark club-crest" aria-hidden="true"><svg viewBox="0 0 56 62" focusable="false"><path d="'+outline+'" fill="'+color+'" stroke="#e5d79b" stroke-width="2"/><path d="'+outline+'" fill="none" stroke="#ffffff30" stroke-width="5" transform="translate(5 5) scale(.82)"/><path d="'+symbol+'" fill="'+(hash%4===3?'none':'#f4edcc')+'" stroke="#f4edcc" stroke-width="2"/><path d="M12 40H44L41 50H15Z" fill="#12222d"/><text x="28" y="48" text-anchor="middle" font-size="8" font-weight="800" fill="#fff">'+esc(String(c.code||'FC').slice(0,5))+'</text></svg></span>';
  cache.set(key,value);return value;
 }
 const api={html};root.ClubCrests=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
