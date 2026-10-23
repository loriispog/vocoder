// Streaming spectral-envelope shifter. Frequency bins and phases stay in place:
// only the smoothed envelope is resampled, so the harmonic spacing stays intact.
export class FormantShifter {
  constructor(rate, size=1024) {
    this.size=size;this.hop=size/4;this.rate=rate;this.cursor=0;this.outputCursor=0;this.count=0;this.shift=0;
    this.input=new Float32Array(size);this.output=new Float32Array(size*4);
    this.real=new Float64Array(size);this.imag=new Float64Array(size);
    this.envelope=new Float64Array(size/2+1);this.power=new Float64Array(size/2+1);
    this.window=Float64Array.from({length:size},(_,i)=>Math.sqrt(0.5-0.5*Math.cos(2*Math.PI*i/size)));
    this.reverse=new Uint16Array(size);const bits=Math.log2(size);
    for(let i=0;i<size;i++){let n=i,r=0;for(let b=0;b<bits;b++){r=(r<<1)|(n&1);n>>=1;}this.reverse[i]=r;}
    this.cos=Float64Array.from({length:size/2},(_,i)=>Math.cos(2*Math.PI*i/size));
    this.sin=Float64Array.from({length:size/2},(_,i)=>Math.sin(2*Math.PI*i/size));
  }
  fft(inverse=false) {
    const {size:n,real:r,imag:im}=this;
    for(let i=0;i<n;i++){const j=this.reverse[i];if(j>i){let v=r[i];r[i]=r[j];r[j]=v;v=im[i];im[i]=im[j];im[j]=v;}}
    for(let width=2;width<=n;width*=2){const half=width/2,step=n/width;
      for(let start=0;start<n;start+=width)for(let j=0;j<half;j++){
        const c=this.cos[j*step],s=this.sin[j*step]*(inverse?1:-1),a=start+j,b=a+half;
        const tr=r[b]*c-im[b]*s,ti=r[b]*s+im[b]*c;
        r[b]=r[a]-tr;im[b]=im[a]-ti;r[a]+=tr;im[a]+=ti;
      }
    }
    if(inverse)for(let i=0;i<n;i++){r[i]/=n;im[i]/=n;}
  }
  frame() {
    const n=this.size,half=n/2,r=this.real,im=this.imag;
    for(let i=0;i<n;i++){r[i]=this.input[(this.cursor+i)%n]*this.window[i];im[i]=0;}
    if(Math.abs(this.shift)>0.001){
      this.fft();
      for(let i=0;i<=half;i++)this.power[i]=r[i]*r[i]+im[i]*im[i];
      // ~560 Hz smoothing at 48 kHz: follow vocal resonances rather than each harmonic.
      const radius=Math.max(2,Math.round(280*n/this.rate));
      let sum=0;for(let i=0;i<=radius;i++)sum+=this.power[i];
      for(let i=0;i<=half;i++){
        if(i>0){if(i+radius<=half)sum+=this.power[i+radius];if(i-radius-1>=0)sum-=this.power[i-radius-1];}
        this.envelope[i]=Math.sqrt(Math.max(0,sum)/(Math.min(half,i+radius)-Math.max(0,i-radius)+1)+1e-12);
      }
      const factor=2**(this.shift/12);
      for(let i=0;i<=half;i++){
        const source=Math.min(half,i/factor),lo=Math.floor(source),f=source-lo;
        const desired=this.envelope[lo]*(1-f)+this.envelope[Math.min(half,lo+1)]*f;
        const gain=Math.max(0.15,Math.min(6,desired/this.envelope[i]));
        r[i]*=gain;im[i]*=gain;if(i>0&&i<half){r[n-i]*=gain;im[n-i]*=gain;}
      }
      this.fft(true);
    }
    for(let i=0;i<n;i++)this.output[(this.outputCursor+1+i)%this.output.length]+=r[i]*this.window[i]*0.5;
  }
  process(sample,semitones) {
    const result=this.output[this.outputCursor];this.output[this.outputCursor]=0;
    this.input[this.cursor]=sample;this.cursor=(this.cursor+1)%this.size;
    this.shift+=(Math.max(-6,Math.min(6,semitones))-this.shift)*0.001;
    if(++this.count%this.hop===0)this.frame();
    this.outputCursor=(this.outputCursor+1)%this.output.length;
    return result;
  }
}
