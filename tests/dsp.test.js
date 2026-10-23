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

import {FormantShifter} from '../public/formant.js';
function toneRender(options={}) {
 const p=new Processor();Object.assign(p.settings,{voices:2,degrees:[2,4],amount:1,mix:1,humanize:0},options.settings);
 const channels=[[],[],[]],frequency=options.frequency||225;
 for(let b=0;b<600;b++){
  const input=Float32Array.from({length:128},(_,i)=>.2*Math.sin(2*Math.PI*frequency*(b*128+i)/48000));
  const out=[[new Float32Array(128),new Float32Array(128)],[new Float32Array(128)]];
  p.process([[input]],out);
  if(b>400){channels[0].push(...out[0][0]);channels[1].push(...out[0][1]);channels[2].push(...out[1][0]);}
  assert.ok(out.flat().every(a=>a.every(Number.isFinite)));
 }
 return channels;
}
const rms=a=>Math.sqrt(a.reduce((s,v)=>s+v*v,0)/a.length);
test('stereo separation collapses to mono and spreads distinct harmony voices',()=>{
 const mono=toneRender({settings:{width:0}}),wide=toneRender({settings:{width:1}});
 assert.ok(rms(mono[0].map((x,i)=>x-mono[1][i]))<1e-5);
 assert.ok(rms(wide[0].map((x,i)=>x-wide[1][i]))>0.02);
});
test('hard correction replaces the lead with the nearest selected-scale pitch',()=>{
 const bypass=toneRender()[2],locked=toneRender({settings:{hardTune:true}})[2],otherKey=toneRender({settings:{hardTune:true,root:1}})[2];
 assert.ok(Math.abs(detectPitch(bypass.slice(0,4096),48000)-225)<1);
 assert.ok(Math.abs(detectPitch(locked.slice(0,4096),48000)-220)<2);
 assert.ok(Math.abs(detectPitch(otherKey.slice(0,4096),48000)-233.08)<2);
});
function vowel(shift,rate=48000){
 const processor=new FormantShifter(rate),result=[],fundamental=120;
 for(let i=0;i<rate;i++){
  let x=0;for(let h=1;h<=40;h++){const f=h*fundamental;const amplitude=(Math.exp(-(((f-700)/220)**2))+0.6*Math.exp(-(((f-1700)/300)**2))+0.25*Math.exp(-(((f-2800)/400)**2)))/10;x+=amplitude*Math.sin(2*Math.PI*f*i/rate);}
  const out=processor.process(x,shift);assert.ok(Number.isFinite(out));if(i>rate/2)result.push(out);
 }
 return result;
}
function spectralCenter(audio,rate=48000){
 let weighted=0,power=0;
 for(let h=2;h<=35;h++){const f=h*120;let re=0,im=0;
  for(let i=0;i<audio.length;i++){const w=0.5-0.5*Math.cos(2*Math.PI*i/audio.length);re+=audio[i]*w*Math.cos(2*Math.PI*f*i/rate);im+=audio[i]*w*Math.sin(2*Math.PI*f*i/rate);}
  const energy=re*re+im*im;weighted+=energy*f;power+=energy;
 }
 return weighted/power;
}
test('formant envelope moves in both directions while fundamental pitch stays fixed',()=>{
 const neutral=vowel(0),deep=vowel(-6),bright=vowel(6);
 const centers=[deep,neutral,bright].map(a=>spectralCenter(a));
 assert.ok(centers[0]<centers[1]-80&&centers[2]>centers[1]+80,`Spectral centers: ${centers}`);
 for(const audio of [deep,neutral,bright])assert.ok(Math.abs(detectPitch(audio.slice(0,4096),48000)-120)<2);
 assert.ok(rms(bright)<rms(neutral)*5);
});
test('formant neutral path reconstructs input at 44.1 kHz and silence remains silent',()=>{
 const rate=44100,p=new FormantShifter(rate);let maxError=0;
 for(let i=0;i<10000;i++){const x=.2*Math.sin(2*Math.PI*220*i/rate),out=p.process(x,0);if(i>3000)maxError=Math.max(maxError,Math.abs(out-.2*Math.sin(2*Math.PI*220*(i-1024)/rate)));}
 assert.ok(maxError<1e-6,`Reconstruction error: ${maxError}`);
 const silent=new FormantShifter(rate);for(let i=0;i<10000;i++)assert.equal(silent.process(0,6),0);
});
