import '@fontsource/dm-sans/400.css';
import '@fontsource/dm-sans/500.css';
import '@fontsource/dm-sans/600.css';
import '@fontsource/manrope/500.css';
import '@fontsource/manrope/800.css';
import './style.css';
import './themes.css';
import {themes, applyTheme, restoreTheme} from './themes.js';
import {handOpenness} from './gestures.js';
const $=s=>document.querySelector(s);
const initialTheme = restoreTheme();
$('#app').innerHTML=`
<header><a class="brand" href="#">✳ <span>HALO</span><small>VOCAL INSTRUMENT</small></a><div class="header-right"><span class="privacy-label"><span class="local-dot"></span> PROCESSED ON YOUR DEVICE</span> <label class="theme-picker"><span>Theme</span><select id="theme" aria-label="Color theme">${themes.map(([id,name])=>`<option value="${id}">${name}</option>`).join('')}</select></label> <a class="github-link" href="https://github.com/loriispog/vocoder" target="_blank" rel="noopener noreferrer"><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 .7a11.3 11.3 0 0 0-3.6 22c.6.1.8-.2.8-.5v-2c-3.3.7-4-1.4-4-1.4-.5-1.3-1.3-1.6-1.3-1.6-1.1-.8.1-.8.1-.8 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.7 1.3 3.4 1 .1-.8.4-1.3.7-1.6-2.7-.3-5.5-1.3-5.5-5.6 0-1.2.4-2.2 1.2-3-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.2 1.2a11 11 0 0 1 5.8 0c2.2-1.5 3.2-1.2 3.2-1.2.6 1.6.2 2.8.1 3.1.8.8 1.2 1.8 1.2 3 0 4.3-2.8 5.3-5.5 5.6.5.4.8 1.1.8 2.2v3c0 .3.2.6.8.5A11.3 11.3 0 0 0 12 .7Z"/></svg> GitHub</a> <a href="#guide" class="help">Quick guide ↗</a></div></header>
<main><section class="intro"><div><div class="eyebrow">YOUR VOICE. A LITTLE MORE HUMAN.</div><h1>A choir in the<br><em>palm of your hand.</em></h1><p>Sing a note. Open your hand. Make room for harmony.</p></div><div class="session"><span class="status-dot" id="sessionDot"></span><span id="sessionState">INSTRUMENT OFFLINE</span><div class="session-label">GESTURE-LED · REAL-TIME · ALL YOU</div></div></section>
<section class="instrument"><div class="vision-panel"><div class="panel-top"><span><span class="tiny-dot"></span> GESTURE STAGE</span><span id="cameraLabel">CAMERA STANDBY</span></div><div class="view"><video id="video" autoplay playsinline muted></video><canvas id="landmarks"></canvas><div class="corner tl"></div><div class="corner tr"></div><div class="corner bl"></div><div class="corner br"></div><div id="cameraPlaceholder"><div class="hand-orbit"><svg viewBox="0 0 100 120" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M31 67V38q0-9 7-9t7 9v22-39q0-9 7-9t7 9v38-33q0-8 7-8t7 8v37-23q0-8 7-8t7 8v40c0 24-15 35-31 35-14 0-23-9-32-22L11 75q-5-9 2-12t18 13"/><path d="M45 65q15-8 23 7"/></svg><span class="orbit o1"></span><span class="orbit o2"></span></div><h3>Your hands are the instrument.</h3><p>Allow camera access to bring your voice to life.</p></div><div class="view-bottom"><span id="tracking"><i></i> WAITING FOR YOUR HAND</span><span>01 / LIVE INPUT</span></div></div><div class="gesture-strip"><div class="gesture-symbol">✧</div><div><strong id="gestureName">Open to bloom</strong><p>Closed hand → solo voice · Open hand → choir</p></div><div class="openness"><span id="openValue">0%</span><div><i id="openBar"></i></div></div></div></div>
<aside class="control-panel"><div class="panel-top"><span>THE HARMONY</span><span class="tiny-star">✳</span></div><div class="pitch-row"><div><span class="label">YOUR NOTE</span><div class="note" id="note">—<small>—</small></div></div><div class="pitch-detail"><span id="frequency">Waiting for voice</span><div class="meter" id="meter">${'<i></i>'.repeat(16)}</div><span id="cents">MICROPHONE OFF</span></div></div><div class="divider"></div><div class="field-row"><label>ROOT NOTE<select id="root">${['C','C♯','D','E♭','E','F','F♯','G','A♭','A','B♭','B'].map((n,i)=>`<option value="${i}">${n}</option>`).join('')}</select></label><label>SCALE<select id="scale"><option value="major">Major</option><option value="minor">Natural minor</option><option value="dorian">Dorian</option><option value="pentatonic">Pentatonic</option><option value="chromatic">Chromatic</option></select></label></div><div class="field-title"><span>HARMONY VOICES</span><span id="voicesLabel">3 voices</span></div><div class="voice-buttons">${[1,2,3,4].map(n=>`<button data-voices="${n}" class="${n===3?'selected':''}">${n}<span>${n===1?'VOICE':'VOICES'}</span></button>`).join('')}</div><div class="intervals" id="intervals"></div><div class="slider-label"><label for="mix">Harmony blend</label><output id="mixValue">55%</output></div><input type="range" id="mix" min="0" max="100" value="55"><div class="range-captions"><span>SUBTLE</span><span>IMMERSIVE</span></div><div class="slider-label"><label for="humanize">Choir character <span class="info" title="Gentle independent pitch drift and stereo spread">ⓘ</span></label><output id="humanizeValue">30%</output></div><input type="range" id="humanize" min="0" max="100" value="30"><div class="range-captions"><span>PRECISE</span><span>HUMAN</span></div><label class="switch-row"><span>Room ambience<small>A little space for your choir</small></span><input type="checkbox" id="room" checked><span class="switch"></span></label></aside></section>
<section class="transport"><div class="headphones"><span>♬</span><div><strong>Headphones on. World off.</strong><p>Use headphones to prevent microphone feedback.</p></div></div><button id="start" class="primary"><span>◉</span> Start Camera & Microphone <span>↗</span></button><div class="latency"><i></i><span id="latency">LOW-LATENCY AUDIO</span><small>Web Audio · AudioWorklet</small></div></section><div id="message" role="status" aria-live="polite">Ready when you are. Your audio and video stay in this browser.</div>
<section class="manual"><label><input type="checkbox" id="manual"> Manual gesture control</label><input aria-label="Manual hand openness" id="manualAmount" type="range" min="0" max="100" value="0" disabled><span>Closed</span><span>Open</span></section>
<section id="guide" class="guide"><div class="guide-title"><span class="eyebrow">A SMALL GESTURE. A BIG FEELING.</span><h2>Find your harmony.</h2></div><article><b>01</b><h3>Connect your voice</h3><p>Put on headphones and allow access to your microphone and webcam.</p></article><article><b>02</b><h3>Choose your color</h3><p>Pick a key, a scale, and the voices that will sing alongside you.</p></article><article><b>03</b><h3>Open up</h3><p>Keep your palm in frame. Unfurl your fingers to let the harmonies bloom.</p></article></section><footer><span>✳ HALO</span><p>A little technology. A lot of you.</p><a class="footer-github" href="https://github.com/loriispog/vocoder" target="_blank" rel="noopener noreferrer">View source on GitHub ↗</a></footer></main>`;
$('#theme').value = initialTheme;
$('#theme').onchange = e => applyTheme(e.target.value);
let ctx,node,stream,cameraStream,tracker,source,dry,roomGain,frame,starting=false,active=false,generation=0,voices=3,degrees=[2,4,7,9],gesture=0,lastVideo=-1,trackingError=false,lastDetect=0,lastHandFrame=0;
const status=t=>$('#message').textContent=t;
function settings(){node?.port.postMessage({root:+$('#root').value,scale:$('#scale').value,voices,degrees,mix:+$('#mix').value/100,humanize:+$('#humanize').value/100});}
function renderIntervals(){ $('#intervals').innerHTML=degrees.slice(0,voices).map((d,i)=>`<label>V${i+1}<select aria-label="Voice ${i+1} interval" data-degree="${i}">${[[0,'Unison'],[2,'+ Third'],[4,'+ Fifth'],[7,'+ Octave'],[9,'+ Tenth'],[-2,'− Third'],[-4,'− Fifth'],[-7,'− Octave']].map(([v,t])=>`<option value="${v}" ${d===v?'selected':''}>${t}</option>`).join('')}</select></label>`).join(''); }
renderIntervals();
$('#intervals').onchange=e=>{degrees[+e.target.dataset.degree]=+e.target.value;settings();};
for(const id of ['root','scale','mix','humanize'])$('#'+id).oninput=()=>{if($('#'+id+'Value'))$('#'+id+'Value').textContent=$('#'+id).value+'%';settings();};
document.querySelectorAll('[data-voices]').forEach(b=>b.onclick=()=>{voices=+b.dataset.voices;document.querySelectorAll('[data-voices]').forEach(x=>x.classList.toggle('selected',x===b));$('#voicesLabel').textContent=voices+' '+(voices===1?'voice':'voices');renderIntervals();settings();});
$('#room').onchange=()=>roomGain?.gain.setTargetAtTime($('#room').checked?0.2:0,ctx.currentTime,0.1);
$('#manual').onchange=()=>{$('#manualAmount').disabled=!$('#manual').checked;if(!$('#manual').checked)setGesture(0);};
$('#manualAmount').oninput=()=>{if($('#manual').checked)setGesture(+$('#manualAmount').value/100);};
function setGesture(value){gesture=value;node?.port.postMessage({amount:value});$('#openValue').textContent=Math.round(value*100)+'%';$('#openBar').style.width=value*100+'%';$('#gestureName').textContent=value>0.65?'Let it bloom':value>0.15?'Finding harmony':'Open to bloom';}
function friendly(e,device){const map={NotAllowedError:`${device} permission was denied. Allow access in your browser’s site settings and try again.`,NotFoundError:`No ${device.toLowerCase()} was found. Connect a device and try again.`,NotReadableError:`The ${device.toLowerCase()} is unavailable or in use by another application.`,SecurityError:'Device access requires HTTPS or localhost.'};return map[e.name]||`${device}: ${e.message||e}`;}
function pitchMessage({pitch,level}){
 const bars=document.querySelectorAll('#meter i');bars.forEach((b,i)=>b.classList.toggle('lit',i<Math.min(16,level*90)));
 if(!pitch){$('#note').innerHTML='—<small>—</small>';$('#frequency').textContent='Listening for a note';$('#cents').textContent='SING A SUSTAINED NOTE';return;}
 const midi=69+12*Math.log2(pitch/440),rounded=Math.round(midi),names=['C','C♯','D','E♭','E','F','F♯','G','A♭','A','B'];
 $('#note').innerHTML=names[(rounded%12+12)%12]+`<small>${Math.floor(rounded/12)-1}</small>`;$('#frequency').textContent=pitch.toFixed(1)+' Hz';const cents=Math.round((midi-rounded)*100);$('#cents').textContent=(cents>=0?'+':'')+cents+' CENTS';
}
async function start(){
 if(starting||active){stop();return;}starting=true;const run=++generation;$('#start').innerHTML='Cancel startup';status('Requesting microphone access…');
 try{
  if(!window.isSecureContext||!navigator.mediaDevices?.getUserMedia)throw new Error('Use HTTPS or localhost in a browser that supports microphone capture.');
  ctx=new AudioContext({latencyHint:'interactive'});await ctx.resume();
  const captured=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false,channelCount:1},video:false});
  if(run!==generation){captured.getTracks().forEach(t=>t.stop());return;}stream=captured;
  await ctx.audioWorklet.addModule('/harmonizer.worklet.js');if(run!==generation)return;
  source=ctx.createMediaStreamSource(stream);node=new AudioWorkletNode(ctx,'halo-harmonizer',{numberOfInputs:1,numberOfOutputs:1,outputChannelCount:[2]});
  const compressor=ctx.createDynamicsCompressor();compressor.threshold.value=-8;compressor.knee.value=12;compressor.ratio.value=5;compressor.attack.value=0.003;compressor.release.value=0.15;
  dry=ctx.createGain();dry.gain.value=0.7;source.connect(dry).connect(compressor);source.connect(node).connect(compressor);
  const convolver=ctx.createConvolver(),impulse=ctx.createBuffer(2,ctx.sampleRate*0.8,ctx.sampleRate);
  for(let c=0;c<2;c++){const a=impulse.getChannelData(c);for(let i=0;i<a.length;i++)a[i]=(Math.random()*2-1)*Math.exp(-i/(ctx.sampleRate*0.15))*0.25;}
  convolver.buffer=impulse;roomGain=ctx.createGain();roomGain.gain.value=$('#room').checked?0.2:0;node.connect(convolver).connect(roomGain).connect(compressor);compressor.connect(ctx.destination);
  node.port.onmessage=e=>pitchMessage(e.data);settings();setGesture($('#manual').checked?+$('#manualAmount').value/100:0);
  active=true;starting=false;$('#start').innerHTML='■ &nbsp; Stop session';$('#sessionDot').classList.add('on');$('#sessionState').textContent='INSTRUMENT LIVE';$('#latency').textContent=`${Math.round(((ctx.baseLatency||0)+(ctx.outputLatency||0))*1000)} MS DEVICE BUFFER`;
  stream.getAudioTracks()[0].onended=()=>{stop();status('Microphone disconnected. Reconnect it and start a new session.');};
  status('Microphone connected. Requesting camera…');void startCamera(run);
 }catch(e){if(run!==generation)return;stop();status(friendly(e,'Microphone'));}
}
async function startCamera(run){
 try{
  const captured=await navigator.mediaDevices.getUserMedia({video:{width:{ideal:640},height:{ideal:480},frameRate:{ideal:30}},audio:false});
  if(run!==generation){captured.getTracks().forEach(t=>t.stop());return;}cameraStream=captured;$('#video').srcObject=captured;await $('#video').play();
  $('#cameraPlaceholder').hidden=true;$('#cameraLabel').textContent='CAMERA LIVE';status('Camera connected. Loading hand tracking…');
  const {FilesetResolver,HandLandmarker}=await import('@mediapipe/tasks-vision');
  const vision=await FilesetResolver.forVisionTasks('/mediapipe/wasm');
  const response=await fetch(__HAND_MODEL_URL__,{signal:AbortSignal.timeout(25000)});if(!response.ok)throw new Error('Hand model download failed ('+response.status+'). Allow storage.googleapis.com or run npm run setup to host the model locally.');
  const modelBuffer=new Uint8Array(await response.arrayBuffer());if(run!==generation)return;
  const loaded=await HandLandmarker.createFromOptions(vision,{baseOptions:{modelAssetBuffer:modelBuffer,delegate:'CPU'},runningMode:'VIDEO',numHands:1,minHandDetectionConfidence:0.6,minHandPresenceConfidence:0.6,minTrackingConfidence:0.6});
  if(run!==generation){loaded.close();return;}tracker=loaded;status('Ready. Sing a sustained note and open your hand to add harmony.');trackingError=false;lastVideo=-1;lastDetect=0;lastHandFrame=performance.now();loop();
 }catch(e){if(run!==generation)return;$('#cameraLabel').textContent=cameraStream?'TRACKING UNAVAILABLE':'CAMERA UNAVAILABLE';$('#manual').checked=true;$('#manualAmount').disabled=false;status(friendly(e,'Camera / hand tracking').slice(0,300)+' Microphone remains active; use manual gesture control.');}
}
const connections=[[0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],[5,9],[9,10],[10,11],[11,12],[9,13],[13,14],[14,15],[15,16],[13,17],[0,17],[17,18],[18,19],[19,20]];
function loop(){
 if(!active||!tracker)return;const video=$('#video'),canvas=$('#landmarks'),g=canvas.getContext('2d');
 try{if(video.readyState>=2&&video.currentTime!==lastVideo&&performance.now()-lastDetect>45){lastVideo=video.currentTime;lastDetect=performance.now();lastHandFrame=lastDetect;const result=tracker.detectForVideo(video,lastDetect);canvas.width=video.videoWidth;canvas.height=video.videoHeight;g.clearRect(0,0,canvas.width,canvas.height);const p=result.landmarks[0];
  if(p){g.strokeStyle='#c3e894';g.lineWidth=2;for(const [a,b]of connections){g.beginPath();g.moveTo(p[a].x*canvas.width,p[a].y*canvas.height);g.lineTo(p[b].x*canvas.width,p[b].y*canvas.height);g.stroke();}for(const point of p){g.beginPath();g.arc(point.x*canvas.width,point.y*canvas.height,3,0,Math.PI*2);g.fillStyle='#e0fbb9';g.fill();}if(!$('#manual').checked)setGesture(gesture*0.65+handOpenness(p)*0.35);}
  else if(!$('#manual').checked)setGesture(gesture*0.65);
  $('#tracking').innerHTML=`<i class="${p?'on':''}"></i> ${p?'HAND CONNECTED':'WAITING FOR YOUR HAND'}`;
 }}catch(e){if(!trackingError){status('Hand tracking interrupted: '+e.message+'. Use manual gesture control.');trackingError=true;}if(!$('#manual').checked)setGesture(0);}
 if(performance.now()-lastHandFrame>500&&!$('#manual').checked)setGesture(gesture*0.8);
 frame=requestAnimationFrame(loop);
}
function stop(){generation++;cancelAnimationFrame(frame);tracker?.close();tracker=null;stream?.getTracks().forEach(t=>t.stop());cameraStream?.getTracks().forEach(t=>t.stop());stream=null;cameraStream=null;node?.disconnect();node=null;ctx?.close().catch(()=>{});ctx=null;active=false;starting=false;$('#video').srcObject=null;$('#landmarks').getContext('2d').clearRect(0,0,$('#landmarks').width,$('#landmarks').height);$('#cameraPlaceholder').hidden=false;$('#cameraLabel').textContent='CAMERA STANDBY';$('#sessionDot').classList.remove('on');$('#sessionState').textContent='INSTRUMENT OFFLINE';$('#start').innerHTML='<span>◉</span> Start Camera & Microphone <span>↗</span>';$('#tracking').innerHTML='<i></i> WAITING FOR YOUR HAND';setGesture(0);pitchMessage({pitch:null,level:0});$('#cents').textContent='MICROPHONE OFF';status('Session stopped. Camera and microphone released.');}
$('#start').onclick=start;window.addEventListener('pagehide',stop);
