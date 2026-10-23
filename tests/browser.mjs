import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const base=process.env.TEST_URL||'http://localhost:5173';
fs.mkdirSync('.test-results',{recursive:true});
// This generated tone is a fixture for fake microphone capture, not the app's sound source.
const rate=48000, samples=rate*30, wav=Buffer.alloc(44+samples*2);
wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(rate,24);wav.writeUInt32LE(rate*2,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(samples*2,40);for(let i=0;i<samples;i++)wav.writeInt16LE(Math.round(6000*Math.sin(i*2*Math.PI*220/rate)),44+i*2);fs.writeFileSync('.test-results/mic.wav',wav);
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream',`--use-file-for-fake-audio-capture=${process.cwd()}/.test-results/mic.wav`,'--autoplay-policy=no-user-gesture-required']});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1180}});const errors=[],consoleErrors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&m.text()!=='INFO: Created TensorFlow Lite XNNPACK delegate for CPU.')consoleErrors.push(m.text());});
 await page.addInitScript(()=>{const Original=window.AudioWorkletNode;window.AudioWorkletNode=class extends Original{constructor(...args){super(...args);window.testWorklet=this;window.testAudio=args[0];const send=this.port.postMessage.bind(this.port);this.port.postMessage=data=>{window.lastSettings={...window.lastSettings,...data};send(data);};window.processorFailed=false;this.addEventListener('processorerror',()=>window.processorFailed=true);}};});
 await page.route('**/__test/audio-effects.js',r=>r.fulfill({path:'src/audio-effects.js',contentType:'text/javascript'}));
 await page.goto(base);await page.getByRole('heading',{name:/A choir/}).waitFor();
 const backgrounds=new Set();
 for(const theme of ['forest','midnight','amethyst','ember','daylight']){
  await page.getByRole('combobox',{name:'Color theme'}).selectOption(theme);
  assert.equal(await page.locator('html').getAttribute('data-theme'),theme);
  backgrounds.add(await page.evaluate(()=>getComputedStyle(document.documentElement).backgroundColor));
  await page.setViewportSize({width:390,height:844});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`No mobile overflow in ${theme}`);
 }
 assert.equal(backgrounds.size,5,'Themes must produce distinct palettes');
 await page.reload();assert.equal(await page.locator('html').getAttribute('data-theme'),'daylight');assert.equal(await page.locator('#theme').inputValue(),'daylight');
 const github=page.getByRole('link',{name:'GitHub',exact:true});assert.equal(await github.getAttribute('href'),'https://github.com/loriispog/vocoder');assert.equal(await github.getAttribute('target'),'_blank');
 await page.getByRole('combobox',{name:'Color theme'}).selectOption('amethyst');await page.screenshot({path:'.test-results/theme-mobile.png',fullPage:true});
 await page.setViewportSize({width:1440,height:1180});await page.screenshot({path:'.test-results/theme-desktop.png',fullPage:true});
 await page.getByRole('combobox',{name:'Color theme'}).selectOption('forest');console.log('Five distinct themes, saved preference, GitHub link, and mobile layout verified.');
await page.screenshot({path:'.test-results/desktop.png',fullPage:true});
 const busResults=await page.evaluate(async()=>{
  const {createHarmonyBus}=await import('/__test/audio-effects.js');
  async function render(amount){const context=new OfflineAudioContext(2,48000,48000),buffer=context.createBuffer(2,48000,48000);
   for(let c=0;c<2;c++){const a=buffer.getChannelData(c);for(let i=0;i<a.length;i++)a[i]=(c===0?0.8:0.2)*Math.sin(2*Math.PI*220*i/48000);}
   const source=context.createBufferSource();source.buffer=buffer;const bus=createHarmonyBus(context);bus.setAmount(amount);source.connect(bus.input);bus.output.connect(context.destination);source.start();const audio=await context.startRendering();
   const energy=c=>Math.sqrt(audio.getChannelData(c).slice(24000).reduce((a,x)=>a+x*x,0)/24000);return [energy(0),energy(1)];}
  return {off:await render(0),glued:await render(1)};
 });assert.ok(busResults.glued[0]<busResults.off[0]*0.65,'Harmony bus compression reduces sustained peaks');assert.ok(Math.abs(busResults.glued[0]/busResults.glued[1]-4)<0.05,'Linked stereo compression preserves left/right balance');console.log('Actual Web Audio harmony bus compression and stereo linking verified.',busResults);
 await page.getByRole('button',{name:'4 VOICES',exact:true}).click();assert.equal(await page.locator('#intervals select').count(),4);
 await page.locator('#scale').selectOption('minor');await page.locator('#root').selectOption('2');
 await page.locator('#start').click();await page.waitForFunction(()=>document.querySelector('#sessionState').textContent==='INSTRUMENT LIVE');
 await page.waitForFunction(()=>document.querySelector('#frequency').textContent.includes('Hz'),null,{timeout:20000});assert.match(await page.locator('#note').innerText(),/A/);
 await page.waitForFunction(()=>/Ready\.|manual gesture control/.test(document.querySelector('#message').textContent),null,{timeout:60000});
 const tracking=await page.locator('#message').innerText();console.log('MediaPipe initialization:',tracking);assert.ok(tracking.startsWith('Ready.'),'Hand tracking must initialize: '+tracking);
 for(const [id,value] of [['formant','4'],['width','0'],['compression','85']])await page.locator('#'+id).evaluate((e,v)=>{e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}));},value);
 await page.locator('#hardTune').check();assert.equal(await page.locator('#humanize').isDisabled(),true);
 assert.deepEqual(await page.evaluate(()=>({formant:window.lastSettings.formant,width:window.lastSettings.width,hardTune:window.lastSettings.hardTune})),{formant:4,width:0,hardTune:true});
 await page.waitForTimeout(500);assert.equal(await page.evaluate(()=>window.processorFailed),false);
 await page.locator('#hardTune').uncheck();assert.equal(await page.locator('#humanize').isDisabled(),false);
 for(const [id,value] of [['formant','0'],['width','70'],['compression','35']])await page.locator('#'+id).evaluate((e,v)=>{e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}));},value);
 console.log('Formants, width, compression, and hard-correction controls update the running audio graph.');
 await page.locator('#manual').check();await page.locator('#manualAmount').evaluate(e=>{e.value=100;e.dispatchEvent(new Event('input',{bubbles:true}));});assert.equal(await page.locator('#openValue').innerText(),'100%');
 const wet=await page.evaluate(async()=>{const a=window.testAudio.createAnalyser();a.fftSize=2048;window.testWorklet.connect(a);await new Promise(r=>setTimeout(r,300));const data=new Float32Array(a.fftSize);a.getFloatTimeDomainData(data);window.testWorklet.disconnect(a);return {peak:Math.max(...data.map(Math.abs)),failed:window.processorFailed};});assert.ok(wet.peak>0.001,'Browser worklet must output processed microphone signal');assert.equal(wet.failed,false);
 await page.locator('#manualAmount').evaluate(e=>{e.value=0;e.dispatchEvent(new Event('input',{bubbles:true}));});await page.waitForTimeout(400);const silent=await page.evaluate(async()=>{const a=window.testAudio.createAnalyser();window.testWorklet.connect(a);await new Promise(r=>setTimeout(r,100));const data=new Float32Array(a.fftSize);a.getFloatTimeDomainData(data);window.testWorklet.disconnect(a);return Math.max(...data.map(Math.abs));});assert.ok(silent<0.0001,'Closed gesture must fade out wet audio');console.log('Browser wet output and closed-gesture silence verified.');
 await page.screenshot({path:'.test-results/active.png',fullPage:true});await page.locator('#start').click();assert.equal(await page.locator('#sessionState').innerText(),'INSTRUMENT OFFLINE');assert.equal(await page.locator('video').evaluate(v=>v.srcObject),null);
 // Startup can be repeated without orphaned AudioContexts or stale callbacks.
 await page.locator('#start').click();await page.waitForFunction(()=>document.querySelector('#sessionState').textContent==='INSTRUMENT LIVE');await page.locator('#start').click();
 assert.deepEqual(errors,[]);assert.deepEqual(consoleErrors,[]);console.log('Uncaught browser errors:',errors);console.log('Browser console errors:',consoleErrors);
 const denied=await browser.newPage();await denied.addInitScript(()=>{navigator.mediaDevices.getUserMedia=async()=>{throw new DOMException('Test denial','NotAllowedError');};});await denied.goto(base);await denied.locator('#start').click();await denied.waitForFunction(()=>document.querySelector('#message').textContent.includes('permission was denied'));assert.match(await denied.locator('#start').innerText(),/Start Camera/);console.log('Denied permission: actionable error and retry button verified.');
 const cancelled=await browser.newPage();await cancelled.addInitScript(()=>{const original=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);window.testTracks=[];navigator.mediaDevices.getUserMedia=async c=>{await new Promise(r=>setTimeout(r,600));const s=await original(c);window.testTracks.push(...s.getTracks());return s;};});await cancelled.goto(base);await cancelled.locator('#start').click();await cancelled.getByRole('button',{name:'Cancel startup'}).click();await cancelled.waitForTimeout(1200);assert.equal(await cancelled.locator('#sessionState').innerText(),'INSTRUMENT OFFLINE');assert.equal(await cancelled.evaluate(()=>window.testTracks.every(t=>t.readyState==='ended')),true);console.log('Startup cancellation releases delayed fake media tracks.');
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'.test-results/mobile.png',fullPage:true});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));console.log('PASS: fake microphone pitch capture, real AudioWorklet initialization, controls, stop/restart, denial, cancellation, responsive layout. Physical hardware NOT tested.');
}finally{await browser.close();}
