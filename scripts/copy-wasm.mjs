import {mkdir,cp} from 'node:fs/promises';
await mkdir('public/mediapipe/wasm',{recursive:true});
await cp('node_modules/@mediapipe/tasks-vision/wasm','public/mediapipe/wasm',{recursive:true});
