import {detectPitch,harmonyMidi} from './dsp.js';
class Harmonizer extends AudioWorkletProcessor {
  constructor(){
    super();this.buffer=new Float32Array(16384);this.write=0;this.phase=[0,0.23,0.51,0.76];this.ratios=[1,1,1,1];this.envelope=0;this.frames=0;this.analysis=new Float32Array(2048);this.pitch=0;this.tick=0;
    this.settings={root:0,scale:'major',degrees:[2,4,7,9],voices:3,amount:0,mix:0.55,humanize:0.3};
    this.port.onmessage=({data})=>Object.assign(this.settings,data);
  }
  read(delay){const p=(this.write-delay+this.buffer.length)%this.buffer.length;const i=Math.floor(p),f=p-i;return this.buffer[i]*(1-f)+this.buffer[(i+1)%this.buffer.length]*f;}
  process(inputs,outputs){
    const input=inputs[0]?.[0],out=outputs[0];if(!input)return true;
    const s=this.settings,window=sampleRate*0.045;
    for(let i=0;i<input.length;i++){
      this.buffer[this.write]=input[i];this.analysis[this.frames%2048]=input[i];this.frames++;
      this.envelope+=(s.amount-this.envelope)*0.00065;
      let left=0,right=0;
      for(let v=0;v<s.voices;v++){
        let target=1;
        if(this.pitch){const midi=69+12*Math.log2(this.pitch/440);target=2**((harmonyMidi(midi,s.degrees[v],s.root,s.scale)-midi)/12);}
        target*=2**((Math.sin(this.tick/(sampleRate*(0.8+v*0.23))+v*2)*s.humanize*7)/1200);
        this.ratios[v]+=(target-this.ratios[v])*0.001;
        this.phase[v]=(this.phase[v]+(1-this.ratios[v])/window+1)%1;
        const p=this.phase[v],q=(p+0.5)%1,w=0.5-0.5*Math.cos(2*Math.PI*p);
        const voice=this.read(128+p*window)*w+this.read(128+q*window)*(1-w);
        const pan=s.voices===1?0:v/(s.voices-1)*1.4-0.7;
        left+=voice*Math.sqrt((1-pan)/2);right+=voice*Math.sqrt((1+pan)/2);
      }
      const gain=this.envelope*s.mix/Math.sqrt(s.voices);
      out[0][i]=left*gain;out[1][i]=right*gain;
      this.write=(this.write+1)%this.buffer.length;this.tick++;
    }
    // Pitch analysis ~12 Hz; message only estimates, never raw microphone audio.
    if(this.frames>=4096){this.frames=0;const pitch=detectPitch(this.analysis,sampleRate);if(pitch)this.pitch=pitch;this.port.postMessage({pitch,level:Math.sqrt(this.analysis.reduce((a,x)=>a+x*x,0)/2048)});}
    return true;
  }
}
registerProcessor('halo-harmonizer',Harmonizer);
