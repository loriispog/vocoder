export function handOpenness(points){
  const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
  const palm=dist(points[0],points[9]);if(palm<0.001)return 0;
  let extension=0;
  for(const [tip,pip] of [[8,6],[12,10],[16,14],[20,18]])extension+=Math.max(0,Math.min(1,(dist(points[tip],points[0])-dist(points[pip],points[0]))/palm/0.65));
  return extension/4;
}
