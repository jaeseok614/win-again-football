'use strict';
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),crypto=require('node:crypto'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),android=path.join(root,'android');
const defaultOutput=path.join(android,'app/src/main/assets/game');
function buildAndroid(output=defaultOutput){
 output=path.resolve(output);fs.mkdirSync(output,{recursive:true});
 const temp=path.join(output,'index.build.html');
 const built=cp.spawnSync(process.execPath,[path.join(__dirname,'build.cjs'),temp],{cwd:root,encoding:'utf8'});
 if(built.status!==0)throw Error(built.stdout+built.stderr);
 let html=fs.readFileSync(temp,'utf8');fs.unlinkSync(temp);
 // The native package is self-contained and updates through Play. Never register
 // the website service worker or show a browser installation prompt in the app.
 const pwa=fs.readFileSync(path.join(__dirname,'dist/pwa-ui.js'),'utf8').replace(/\r\n/g,'\n');
 const pwaScript='<script>'+pwa.replaceAll('</script','<\\/script')+'</script>';
 if(html.split(pwaScript).length!==2)throw Error('Expected exactly one shared PWA module in the offline build.');
 html=html.replace(pwaScript,'');
 const adapter=fs.readFileSync(path.join(android,'web/android-adapter.js'),'utf8').replace(/\r\n/g,'\n');
 new vm.Script(adapter,{filename:'android-adapter.js'});
 if(html.includes('WinAgainAndroid'))throw Error('The native adapter must only be injected once.');
 const csp="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src 'self' data:; font-src data:; connect-src 'none'; object-src 'none'; frame-src 'none'; base-uri 'none'; form-action 'none'; worker-src 'none'";
 html=html.replace('<head>','<head><meta http-equiv="Content-Security-Policy" content="'+csp+'">');
 html=html.replace('</body>','<script>'+adapter.replaceAll('</script','<\\/script')+'</script></body>');
 if(/<script src=|<link rel="(?:stylesheet|manifest)"|navigator\.serviceWorker\.register/.test(html))throw Error('Native app contains a network or PWA bootstrap dependency.');
 // Reject forgotten relative artwork instead of shipping broken faces offline.
 if(/(?:src|url\()=["']?assets\//.test(html)||/url\(["']?assets\//.test(html))throw Error('The offline game has an unbundled artwork dependency.');
 const bytes=Buffer.byteLength(html),sha256=crypto.createHash('sha256').update(html).digest('hex');
 const metadata={schema:1,applicationId:'com.jaeseok614.winagainfootball',versionName:'1.0.0',versionCode:1,saveKey:'win-again-season-v17',bytes,sha256};
 fs.writeFileSync(path.join(output,'index.html'),html);
 fs.writeFileSync(path.join(output,'build-info.json'),JSON.stringify(metadata,null,2)+'\n');
 return {output,...metadata};
}
module.exports={buildAndroid};
if(require.main===module)console.log('Built Android offline assets: '+JSON.stringify(buildAndroid(process.argv[2])));
