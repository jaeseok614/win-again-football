'use strict';
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright'),assert=require('node:assert/strict'),path=require('node:path'),{pathToFileURL}=require('node:url');
(async()=>{const b=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});try{const p=await b.newPage({viewport:{width:844,height:364}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 // Deliver an actual resize at the microtask checkpoint after each registering
 // script, before the next inline module can initialize its globals.
 await p.addInitScript(()=>{const original=window.addEventListener;window.addEventListener=function(type,...args){original.call(this,type,...args);if(type==='resize')queueMicrotask(()=>window.dispatchEvent(new Event('resize')));};});
 await p.goto(pathToFileURL(path.resolve('index.html')).href);await p.waitForFunction(()=>document.readyState==='complete'&&typeof matchPopupActive!=='undefined'&&typeof openMatchPopup==='function');
 assert.deepEqual(errors,[]);assert.equal(await p.evaluate(()=>state.phase),'prep');assert.equal(await p.evaluate(()=>state.minute),0);
 console.log('PASS actual early resize during bundled script loading, complete startup and unchanged preparation state');
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
