'use strict';
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),cp=require('node:child_process'),assert=require('node:assert/strict');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'football-build-')),source=path.join(dir,'source');
try{
 fs.mkdirSync(source);fs.cpSync(path.join(__dirname,'dist'),path.join(source,'dist'),{recursive:true});
 for(const file of ['build.cjs','build-pwa.cjs'])fs.copyFileSync(path.join(__dirname,file),path.join(source,file));
 const build=()=>cp.execFileSync(process.execPath,[path.join(source,'build-pwa.cjs')],{stdio:'pipe'});
 const names=['index.html','cache-assets.js','sw.js','manifest.webmanifest','source/dist/cache-assets.js'];
 build();const before=names.map(file=>fs.readFileSync(path.join(dir,file),'utf8'));
 for(const entry of fs.readdirSync(path.join(source,'dist'),{withFileTypes:true}))if(entry.isFile()&&/\.(js|css|html|webmanifest)$/.test(entry.name)){
  const file=path.join(source,'dist',entry.name),text=fs.readFileSync(file,'utf8').replace(/\r\n/g,'\n');fs.writeFileSync(file,text.replace(/\n/g,'\r\n'));
 }
 build();assert.deepEqual(names.map(file=>fs.readFileSync(path.join(dir,file),'utf8')),before);
 console.log('PASS Windows and Unix checkouts produce identical PWA artifacts and cache revisions');
}finally{fs.rmSync(dir,{recursive:true,force:true});}
