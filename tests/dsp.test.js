import {test} from 'node:test';
import assert from 'node:assert/strict';
import {detectPitch,harmonyMidi} from '../public/dsp.js';
import {handOpenness} from '../src/gestures.js';
for(const f of [82.41,130.81,220,440,880])test(`pitch estimate ${f} Hz`,()=>{const a=Float32Array.from({length:2048},(_,i)=>0.25*Math.sin(2*Math.PI*f*i/48000)+0.1*Math.sin(4*Math.PI*f*i/48000));assert.ok(Math.abs(detectPitch(a,48000)-f)<2);});
test('silence does not produce a pitch',()=>assert.equal(detectPitch(new Float32Array(2048),48000),null));
test('scale degrees follow root and wrap octaves',()=>{assert.equal(harmonyMidi(60,2,0,'major'),64);assert.equal(harmonyMidi(60,2,0,'minor'),63);assert.equal(harmonyMidi(71,2,0,'major'),74);assert.equal(harmonyMidi(60,-2,0,'major'),57);assert.equal(harmonyMidi(62,4,2,'major'),69);});
test('hand openness distinguishes extension from fist and is scale invariant',()=>{const p=Array.from({length:21},()=>({x:0,y:0,z:0}));p[9]={x:0,y:1,z:0};for(const [tip,pip]of [[8,6],[12,10],[16,14],[20,18]]){p[pip]={x:0,y:1.3,z:0};p[tip]={x:0,y:2,z:0};}assert.ok(handOpenness(p)>.95);const scaled=p.map(v=>({x:v.x*2,y:v.y*2,z:0}));assert.equal(handOpenness(p),handOpenness(scaled));for(const tip of [8,12,16,20])p[tip]={x:0,y:.5,z:0};assert.equal(handOpenness(p),0);});
let Processor;
globalThis.sampleRate=48000;globalThis.AudioWorkletProcessor=class{constructor(){this.port={postMessage(){},onmessage:null};}};globalThis.registerProcessor=(_,p)=>Processor=p;
await import('../public/harmonizer.worklet.js');
function render(amount,degree){const p=new Processor();p.settings={...p.settings,voices:1,degrees:[degree],amount,mix:1,humanize:0};const rendered=[];for(let b=0;b<750;b++){const input=Float32Array.from({length:128},(_,i)=>.2*Math.sin(2*Math.PI*220*(b*128+i)/48000));const out=[new Float32Array(128),new Float32Array(128)];p.process([[input]],[out]);if(b>500)rendered.push(...out[0]);assert.ok(out.every(a=>a.every(Number.isFinite)));}return rendered;}
test('worklet actually shifts captured input to a scale harmony',()=>{const audio=render(1,4);const f=detectPitch(audio.slice(0,4096),48000);assert.ok(Math.abs(f-329.63)<5,`expected E4 ~330 Hz, got ${f}`);});
test('closed gesture silences wet voices',()=>{assert.ok(render(0,2).every(x=>x===0));});
test('worklet fades out without discontinuity',()=>{const p=new Processor();p.envelope=1;p.settings.amount=0;const a=new Float32Array(128).fill(.1);const out=[new Float32Array(128),new Float32Array(128)];p.process([[a]],[out]);assert.ok(p.envelope>.9&&p.envelope<1);for(let i=0;i<100;i++)p.process([[a]],[out]);assert.ok(p.envelope<.001);});
