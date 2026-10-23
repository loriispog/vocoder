import {mkdir,cp,readFile,rename} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
await mkdir('public/mediapipe/wasm',{recursive:true});
await cp('node_modules/@mediapipe/tasks-vision/wasm','public/mediapipe/wasm',{recursive:true});
await mkdir('public/models',{recursive:true});
const path='public/models/hand_landmarker.task';
// Version 1 official model: SHA-256 pinned after verified HTTPS download and
// matching Google's x-goog-hash MD5 metadata (15318430ea3851670fe9914116a9cfad).
// MediaPipe task bundles have a prefix before the ZIP header.
async function valid(file){try{const b=await readFile(file);return createHash('sha256').update(b).digest('hex')==='fbc2a30080c3c557093b5ddfc334698132eb341044ccee322ccf8bcf3607cde1';}catch{return false;}}
if(!await valid(path)){
 const result=spawnSync('curl',['--fail','--location','--retry','2','--max-time','120','https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task','--output',path+'.tmp'],{stdio:'inherit'});
 if(result.status!==0||!await valid(path+'.tmp')){console.error('Official hand model download or SHA-256 verification failed. Allow storage.googleapis.com in environment settings and rerun npm run setup. Audio/manual control work; browser hand tracking requires access to the official model URL.');process.exit(1);}
 await rename(path+'.tmp',path);
}
console.log('Local MediaPipe WASM and hand model are prepared. Restart Vite after preparing assets.');
