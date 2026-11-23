import { TableRules } from '../../core/table-rules.js';
// All sector coordinates start at the safety gate. Index zero in the game is
// the next hole clockwise (base), so a complete lap branches at the gate.
export function makeBoardGeometry(seats) {
  const four=seats===4, sector=TableRules.sector;
  const length=TableRules.trackLength(seats);
  function rotate(s,[x,y]){
    const a=s*2*Math.PI/seats+(four?-Math.PI/4:0);
    return [400+x*Math.cos(a)-y*Math.sin(a),400+x*Math.sin(a)+y*Math.cos(a)];
  }
  function interpolate(a,b,t){return a.map((v,i)=>v+(b[i]-v)*t);}
  const vertices=[[-68,-352],[68,-352],[68,-172],[172,-68],[352,-68]];
  const perEdge=[4,5,4,5];
  const side=[];
  if(four){
    perEdge.forEach((count,e)=>{
      for(let i=0;i<count;i++)side.push(interpolate(vertices[e],vertices[e+1],i/count));
    });
  }else{
    const half=181;
    for(let i=0;i<sector;i++)side.push([-half+i*2*half/sector,-half*Math.sqrt(3)]);
  }
  const gate=four?2:8, base=gate+1;
  function track(i){
    const j=(i+base+length)%length;
    return rotate(Math.floor(j/sector),side[j%sector]);
  }
  function safe(s,i){
    const [x,y]=side[gate];
    return rotate(s,four?[x,y+34*(i+1)]:[x-Math.max(0,i-1)*22,y+22*Math.min(2,i+1)]);
  }
  function home(s,i){
    const origin=four?[120,-334]:[62,-252],gap=four?34:27;
    return rotate(s,[origin[0]+(i%2-.5)*gap,origin[1]+(Math.floor(i/2)-.5)*gap]);
  }
  return {length,track,safe,home,rotate};
}
