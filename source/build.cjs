'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const dist=path.join(__dirname,'dist');
let html=fs.readFileSync(path.join(dist,'index.html'),'utf8');
html=html.replace(/<link rel="stylesheet" href="([^?]+)\?v=[^"]+">/g,(_,file)=>'<style>'+require('./compact-css.cjs')(fs.readFileSync(path.join(dist,file),'utf8'))+'</style>');
for(const tag of [...html.matchAll(/<script src="([^?]+)\?v=[^"]+"><\/script>/g)]){const file=tag[1];
 const source=fs.readFileSync(path.join(dist,file),'utf8');new vm.Script(source,{filename:file});
 html=html.replace(tag[0],'<script>'+source.replaceAll('</script','<\\/script')+'</script>');
}
if(html.includes('assets/stadium-v10.png?v=10')){
 const stadium='data:image/png;base64,'+fs.readFileSync(path.join(dist,'assets','stadium-v10.png')).toString('base64');
 html=html.replaceAll('assets/stadium-v10.png?v=10',stadium);
}
for(const asset of [...new Set(html.match(/assets\/(?:(?:player-faces-v\d+[.](?:png|jpe?g|webp)|coach-faces-v\d+[.]webp)\?v=\d+|club-(?:scenes|promotion|growth|chapters|moments|deadball)-v\d+[.]webp\?v=\d+|app-icon-192[.]png|launch-stadium[.]webp)/g)||[])]){const file=asset.split('?')[0],type=file.endsWith('.webp')?'webp':/\.jpe?g$/.test(file)?'jpeg':'png',data='data:image/'+type+';base64,'+fs.readFileSync(path.join(dist,file)).toString('base64');html=html.replaceAll(asset,data);}
if(!process.argv.includes('--pwa'))html=html.replace(/<link rel="(?:manifest|apple-touch-icon)"[^>]+>/g,'');
if(/<script src=|<link rel="stylesheet"/.test(html))throw Error('The offline bundle is missing a required file.');
html=html.replace(/\r\n/g,'\n');
if(process.argv.includes('--pwa')){
 if(!html.includes('</head>')||html.includes('name="win-again-inline-shell"'))throw Error('The PWA shell requires one generated build marker.');
 const hash=crypto.createHash('sha256').update(html,'utf8').digest('hex');
 html=html.replace('</head>','<meta name="win-again-inline-shell" content="v22:'+hash+'"></head>');
}
const output=path.resolve(process.argv[2]||path.join(__dirname,'standalone.html'));
fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,html);console.log('Built '+Buffer.byteLength(html)+' bytes.');
