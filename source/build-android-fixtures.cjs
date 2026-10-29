'use strict';
// Synthetic historical save for read-only notebook tests. Built only into the
// instrumentation APK, never the game APK/AAB or the repository as a save file.
const fs=require('node:fs'),path=require('node:path'),S=require('./dist/season.js'),F=require('./dist/engine.js');
function build(output){
 let season=S.create(41);
 for(let year=0;year<2;year++){
  while(!S.ready(season)){
   while(season.match.phase!=='full'){if(!F.running(season.match))F.begin(season.match);F.finishSegment(season.match);}
   season=S.settle(season);
  }
  season=S.nextSeason(season);
 }
 season=S.restore(JSON.parse(JSON.stringify(season)));
 if(season.year!==3||season.round!==0||season.history.length!==2)throw Error('Invalid history fixture');
 fs.mkdirSync(output,{recursive:true});fs.writeFileSync(path.join(output,'notebook-history.json'),JSON.stringify(season));
 let trained=S.create(41,{startingClub:true,suspensions:true});
 while(!S.ready(trained)){
  if(trained.competition==='league'&&S.trainingPreview(trained,'technique').available)S.train(trained,'technique');
  while(trained.match.phase!=='full'){if(!F.running(trained.match))F.begin(trained.match);F.finishSegment(trained.match);}
  trained=S.settle(trained);
 }
 trained=S.nextSeason(trained);
 if(JSON.stringify(S.restore(JSON.parse(JSON.stringify(trained))))!==JSON.stringify(trained))throw Error('Invalid trained fixture');
 fs.writeFileSync(path.join(output,'trained-season.json'),JSON.stringify(trained));
 console.log('Built validated instrumentation-only notebook history.');
}
if(require.main===module){if(!process.argv[2])throw Error('Expected output directory');build(path.resolve(process.argv[2]));}
module.exports={build};
