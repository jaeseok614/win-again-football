'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),cp=require('node:child_process');
let groups=0;function test(name,fn){fn();groups++;console.log('PASS '+name);}
const root=path.resolve(__dirname,'..'),script=path.join(root,'setup-source.py'),archive=path.join(root,'football-source-v22.zip');
function files(dir){return fs.readdirSync(dir,{recursive:true,withFileTypes:true}).filter(entry=>entry.isFile()).length;}
function fixture(link=true){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'win-again-source-')),target=path.join(dir,'football-source-v22.zip');fs.copyFileSync(script,path.join(dir,'setup-source.py'));if(link)fs.linkSync(archive,target);else fs.copyFileSync(archive,target);return dir;}
function run(dir){return cp.spawnSync(process.env.PYTHON||'python3',['setup-source.py'],{cwd:dir,encoding:'utf8'});}

test('setup restores a complete snapshot around tracked modular edits without overwriting them',()=>{
 const dir=fixture();try{const edited=path.join(dir,'source','dist','coach-guide.js');fs.mkdirSync(path.dirname(edited),{recursive:true});fs.writeFileSync(edited,'local modular edit\n');let result=run(dir);assert.equal(result.status,0,result.stderr);assert.match(result.stdout,/139 restored, 1 preserved/);assert.equal(fs.readFileSync(edited,'utf8'),'local modular edit\n');assert.equal(files(path.join(dir,'source')),140);assert.equal(fs.existsSync(path.join(dir,'source','build.cjs')),true);result=run(dir);assert.equal(result.status,0,result.stderr);assert.match(result.stdout,/0 restored, 140 preserved/);assert.equal(fs.readFileSync(edited,'utf8'),'local modular edit\n');}finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test('checksum failure refuses restoration and retains an existing edit',()=>{
 const dir=fixture(false);try{const edited=path.join(dir,'source','keep.txt');fs.mkdirSync(path.dirname(edited),{recursive:true});fs.writeFileSync(edited,'keep');fs.appendFileSync(path.join(dir,'football-source-v22.zip'),'changed');const result=run(dir);assert.notEqual(result.status,0);assert.match(result.stderr,/checksum mismatch/i);assert.equal(fs.readFileSync(edited,'utf8'),'keep');assert.equal(files(path.join(dir,'source')),1);}finally{fs.rmSync(dir,{recursive:true,force:true});}
});
console.log('Validated '+groups+' source setup groups, including partial checkouts and checksum safety.');
