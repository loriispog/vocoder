import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdirSync,existsSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
mkdirSync('.test-results',{recursive:true});
for(const [name,remote]of [['open','right_hands'],['closed','fist']]){
 const path=`.test-results/${name}.jpg`;
 if(!existsSync(path)){
  const r=spawnSync('curl',['--fail','--location','--max-time','30',`https://storage.googleapis.com/mediapipe-assets/${remote}.jpg`,'-o',path],{stdio:'inherit'});assert.equal(r.status,0,'Official MediaPipe image fixture download');
 }
}
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream','--autoplay-policy=no-user-gesture-required']});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1100}});const errors=[],consoleErrors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&m.text()!=='INFO: Created TensorFlow Lite XNNPACK delegate for CPU.')consoleErrors.push(m.text());});
 for(const name of ['open','closed'])await page.route(`**/__test/${name}.jpg`,r=>r.fulfill({path:`.test-results/${name}.jpg`,contentType:'image/jpeg'}));
 await page.addInitScript(()=>{
  const original=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
  navigator.mediaDevices.getUserMedia=async constraints=>{
   if(!constraints.video)return original(constraints);
   const canvas=document.createElement('canvas');canvas.width=640;canvas.height=480;const g=canvas.getContext('2d');const images={};
   for(const name of ['open','closed']){const img=new Image();img.src=`/__test/${name}.jpg`;await img.decode();images[name]=img;}
   let state='open';window.setTestHand=s=>state=s;
   function draw(){g.fillStyle='white';g.fillRect(0,0,640,480);const img=images[state];if(img){const ratio=Math.min(640/img.width,480/img.height);g.drawImage(img,(640-img.width*ratio)/2,(480-img.height*ratio)/2,img.width*ratio,img.height*ratio);}}
   draw();setInterval(draw,66);return canvas.captureStream(15);
  };
 });
 await page.goto(process.env.TEST_URL||'http://localhost:5173');await page.locator('#start').click();
 await page.waitForFunction(()=>document.querySelector('#message').textContent.startsWith('Ready.'),null,{timeout:60000});
 await page.waitForFunction(()=>parseInt(document.querySelector('#openValue').textContent)>70,null,{timeout:20000});
 assert.match(await page.locator('#tracking').innerText(),/HAND CONNECTED/);assert.equal(await page.locator('#manual').isChecked(),false);
 const pixels=await page.locator('#landmarks').evaluate(c=>{const data=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let count=0;for(let i=3;i<data.length;i+=4)if(data[i])count++;return count;});assert.ok(pixels>100,'Real model landmarks must be drawn');
 console.log('Open-hand image: real MediaPipe inference, landmark overlay, openness',await page.locator('#openValue').innerText());
 await page.screenshot({path:'.test-results/hand-open.png',fullPage:true});
 await page.evaluate(()=>window.setTestHand('closed'));
 await page.waitForFunction(()=>parseInt(document.querySelector('#openValue').textContent)<5,null,{timeout:20000});assert.match(await page.locator('#tracking').innerText(),/HAND CONNECTED/);
 console.log('Closed-fist image: real MediaPipe inference, openness',await page.locator('#openValue').innerText());
 await page.screenshot({path:'.test-results/hand-closed.png',fullPage:true});
 await page.evaluate(()=>window.setTestHand('blank'));await page.waitForFunction(()=>document.querySelector('#tracking').textContent.includes('WAITING'),null,{timeout:20000});await page.waitForFunction(()=>parseInt(document.querySelector('#openValue').textContent)<2);
 await page.locator('#start').click();assert.deepEqual(errors,[]);assert.deepEqual(consoleErrors,[]);
 console.log('PASS: actual MediaPipe inference on official recorded image fixtures, open/closed gesture mapping, loss-of-hand fade, and clean browser console. Physical webcam NOT tested.');
}finally{await browser.close();}
