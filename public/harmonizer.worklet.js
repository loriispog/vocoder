import {detectPitch,harmonyMidi} from './dsp.js';
import {FormantShifter} from './formant.js';
class Harmonizer extends AudioWorkletProcessor {
  constructor(){
    super();this.buffer=new Float32Array(16384);this.write=0;
    this.phase=[0,0.23,0.51,0.76,0];this.ratios=[1,1,1,1,1];
    this.envelope=0;this.frames=0;this.totalFrames=0;this.analysisWrite=0;
    this.analysis=new Float32Array(2048);this.pitchFrame=new Float32Array(2048);
    this.pitch=0;this.voiced=false;this.tick=0;this.width=0.7;this.leadCorrection=0;
    this.formant=new FormantShifter(sampleRate);
    this.settings={root:0,scale:'major',degrees:[2,4,7,9],voices:3,amount:0,mix:0.55,humanize:0.3,formant:0,width:0.7,hardTune:false};
    this.port.onmessage=({data})=>Object.assign(this.settings,data);
  }
  read(delay){const p=(this.write-delay+this.buffer.length)%this.buffer.length;const i=Math.floor(p),f=p-i;return this.buffer[i]*(1-f)+this.buffer[(i+1)%this.buffer.length]*f;}
  shifted(voice,ratio,window,speed){
    this.ratios[voice]+=(ratio-this.ratios[voice])*speed;
    this.phase[voice]=(this.phase[voice]+(1-this.ratios[voice])/window+1)%1;
    const p=this.phase[voice],q=(p+0.5)%1,w=0.5-0.5*Math.cos(2*Math.PI*p);
    return this.read(128+p*window)*w+this.read(128+q*window)*(1-w);
  }
  process(inputs,outputs){
    const input=inputs[0]?.[0],out=outputs[0],lead=outputs[1]?.[0];if(!input)return true;
    const s=this.settings,window=sampleRate*0.045;
    const midi=this.pitch?69+12*Math.log2(this.pitch/440):null;
    const targets=[1,1,1,1];
    if(midi!==null)for(let v=0;v<s.voices;v++)targets[v]=2**((harmonyMidi(midi,s.degrees[v],s.root,s.scale)-midi)/12);
    const leadRatio=midi!==null&&this.voiced?2**((harmonyMidi(midi,0,s.root,s.scale)-midi)/12):1;
    for(let i=0;i<input.length;i++){
      this.buffer[this.write]=this.formant.process(input[i],s.formant);
      this.analysis[this.analysisWrite]=input[i];this.analysisWrite=(this.analysisWrite+1)%2048;
      this.frames++;this.totalFrames++;
      this.envelope+=(s.amount-this.envelope)*0.00065;
      this.width+=(s.width-this.width)*0.001;
      let left=0,right=0;
      for(let v=0;v<s.voices;v++){
        let target=targets[v];
        if(!s.hardTune)target*=2**((Math.sin(this.tick/(sampleRate*(0.8+v*0.23))+v*2)*s.humanize*7)/1200);
        const voice=this.shifted(v,target,window,s.hardTune?0.01:0.001);
        const pan=s.voices===1?0:(v/(s.voices-1)*2-1)*this.width;
        left+=voice*Math.sqrt((1-pan)/2);right+=voice*Math.sqrt((1+pan)/2);
      }
      const gain=this.envelope*s.mix/Math.sqrt(s.voices);
      out[0][i]=left*gain;out[1][i]=right*gain;
      // The optional corrected lead replaces the original. Crossfade modes to
      // prevent toggle clicks. The uncorrected lead bypasses the granular delay.
      if(lead){
        const corrected=this.shifted(4,leadRatio,window,0.01);
        this.leadCorrection+=((s.hardTune?1:0)-this.leadCorrection)*0.003;
        lead[i]=this.buffer[this.write]*(1-this.leadCorrection)+corrected*this.leadCorrection;
      }
      this.write=(this.write+1)%this.buffer.length;this.tick++;
    }
    const interval=s.hardTune?1024:4096;
    if(this.frames>=interval&&this.totalFrames>=2048){
      this.frames=0;for(let i=0;i<2048;i++)this.pitchFrame[i]=this.analysis[(this.analysisWrite+i)%2048];
      const pitch=detectPitch(this.pitchFrame,sampleRate);this.voiced=!!pitch;if(pitch)this.pitch=pitch;
      let power=0;for(const x of this.pitchFrame)power+=x*x;
      this.port.postMessage({pitch,level:Math.sqrt(power/2048)});
    }
    return true;
  }
}
registerProcessor('halo-harmonizer',Harmonizer);
