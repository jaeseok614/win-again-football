'use strict';
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
let suites=0,groups=0;
for(const file of fs.readdirSync(__dirname).filter(file=>/^test-.*[.]cjs$/.test(file)&&file!=='test-all.cjs').sort()){
 const result=cp.spawnSync(process.execPath,[path.join(__dirname,file)],{cwd:__dirname,encoding:'utf8'});
 if(result.status!==0){process.stdout.write(result.stdout+result.stderr);process.exit(result.status||1);}
 suites++;groups+=(result.stdout.match(/^PASS /gm)||[]).length;
 console.log('PASS '+file);
}
console.log('Passed '+suites+' suites / '+groups+' checks.');
