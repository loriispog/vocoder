export const scales = { major:[0,2,4,5,7,9,11], minor:[0,2,3,5,7,8,10], dorian:[0,2,3,5,7,9,10], pentatonic:[0,2,4,7,9], chromatic:[0,1,2,3,4,5,6,7,8,9,10,11] };
export function harmonyMidi(midi, degree, root, scale) {
  const notes = scales[scale] || scales.major;
  let index=0, best=Infinity;
  for(let i=-21;i<100;i++) {
    const n=root+12*Math.floor(i/notes.length)+notes[((i%notes.length)+notes.length)%notes.length];
    if(Math.abs(n-midi)<best){best=Math.abs(n-midi);index=i;}
  }
  index+=degree;
  return root+12*Math.floor(index/notes.length)+notes[((index%notes.length)+notes.length)%notes.length];
}
export function detectPitch(buffer, rate) {
  let power=0; for(const x of buffer)power+=x*x;
  if(Math.sqrt(power/buffer.length)<0.008)return null;
  // Normalized difference with the first local minimum avoids octave selection
  // by the global autocorrelation maximum on periodic signals.
  const max=Math.min(Math.floor(rate/75),Math.floor(buffer.length/2));
  const min=Math.floor(rate/1000), diff=new Float32Array(max+1);let sum=0;
  for(let lag=1;lag<=max;lag++){
    let d=0;for(let i=0;i<buffer.length-max;i++){const v=buffer[i]-buffer[i+lag];d+=v*v;}
    sum+=d;diff[lag]=sum?d*lag/sum:1;
  }
  for(let lag=min;lag<max-1;lag++)if(diff[lag]<0.15){
    while(lag+1<max&&diff[lag+1]<diff[lag])lag++;
    const a=diff[lag-1],b=diff[lag],c=diff[lag+1];
    const delta=(a-c)/(2*(a-2*b+c))||0;
    return rate/(lag+Math.max(-0.5,Math.min(0.5,delta)));
  }
  return null;
}
