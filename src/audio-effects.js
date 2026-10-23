// A single stereo compressor links all harmony voices before the room send.
export function createHarmonyBus(context) {
  const compressor=context.createDynamicsCompressor();
  compressor.channelCount=2;
  compressor.knee.value=12;
  compressor.attack.value=0.006;
  compressor.release.value=0.12;
  return {
    input:compressor,
    output:compressor,
    setAmount(amount) {
      const value=Math.max(0,Math.min(1,amount));
      compressor.threshold.setTargetAtTime(-6-24*value,context.currentTime,0.025);
      compressor.ratio.setTargetAtTime(1+7*value,context.currentTime,0.025);
    },
  };
}
