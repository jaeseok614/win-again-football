'use strict';
module.exports=function minutes(value){const records=Array.isArray(value)?value:[value];return records.reduce((sum,r)=>sum+(r.minute??90)*11-(r.cards||r.discipline?.events||[]).filter(e=>e.team===0&&e.card==='red').reduce((lost,e)=>lost+(r.minute??90)-e.minute,0),0);};
