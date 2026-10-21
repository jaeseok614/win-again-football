'use strict';
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
async function main(){
 const args=process.argv.slice(2);
 if(args.length&&(args.length!==2||args[0]!=='--jobs'||!['1','2'].includes(args[1])))throw Error('Usage: node source/run-tests.cjs [--jobs 1|2]');
 const jobs=args.length?Number(args[1]):2,files=fs.readdirSync(__dirname).filter(file=>/^test-.*[.]cjs$/.test(file)&&file!=='test-all.cjs').sort();
 if(!files.length)throw Error('No test suites found.');
 let cursor=0,suites=0,groups=0;const failures=[];
 console.log('Running '+files.length+' suites with '+jobs+' isolated workers.');
 function run(file){return new Promise(resolve=>{
  const child=cp.spawn(process.execPath,[path.join(__dirname,file)],{cwd:__dirname,stdio:['ignore','pipe','pipe'],windowsHide:true});
  let stdout='',stderr='',spawnError='';child.stdout.setEncoding('utf8');child.stderr.setEncoding('utf8');
  child.stdout.on('data',text=>{stdout+=text;});child.stderr.on('data',text=>{stderr+=text;});
  child.once('error',error=>{spawnError=String(error);});
  child.once('close',(code,signal)=>{
   if(code===0&&!spawnError){suites++;groups+=(stdout.match(/^PASS /gm)||[]).length;console.log('PASS '+file);}
   else{process.stdout.write(stdout+stderr);if(spawnError)console.error(spawnError);console.error('FAIL '+file+' (exit '+code+(signal?', signal '+signal:'')+')');failures.push(file);}
   resolve();
  });
 });}
 await Promise.all(Array.from({length:Math.min(jobs,files.length)},async()=>{for(;;){const file=files[cursor++];if(!file)return;await run(file);}}));
 if(failures.length){console.error('Failed '+failures.length+' suites: '+failures.sort().join(', ')+'; '+suites+' suites / '+groups+' checks passed.');process.exitCode=1;}
 else console.log('Passed '+suites+' suites / '+groups+' checks.');
}
main().catch(error=>{console.error(error.stack||error);process.exitCode=1;});
