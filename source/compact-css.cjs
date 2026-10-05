'use strict';
// Keep CSS tokens and quoted text intact; compact only whitespace and comments.
module.exports=function compactCss(source){
 let out='',quote=null,pending=false;
 for(let i=0;i<source.length;i++){
  const c=source[i];
  if(quote){out+=c;if(c==='\\'&&i+1<source.length)out+=source[++i];else if(c===quote)quote=null;continue;}
  if(c==='/'&&source[i+1]==='*'){const end=source.indexOf('*/',i+2);if(end<0)throw Error('Unclosed CSS comment');i=end+1;pending=true;continue;}
  if(/\s/.test(c)){pending=true;continue;}
  if(pending&&out)out+=' ';pending=false;out+=c;if(c==='"'||c==="'")quote=c;
 }
 if(quote)throw Error('Unclosed CSS string');
 return out;
};
