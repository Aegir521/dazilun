'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
type Word={id:string,name:string,score:number};
type Placed=Word & {x:number,y:number,size:number,width:number,height:number,echo:boolean,vertical:boolean,tone:string};
const tones=['#ffe3b3','#d8d0ef','#e1c5bb','#c7ccde','#e3c999'];
function pack(words:Word[],aspect:number){
 const result:Placed[]=[];
 const count=words.length;
 if(!count)return result;
 const rand=randomGenerator();
 const total=Math.max(count,Math.round(48/aspect));
 for(let i=0;i<total;i++){
   const w=words[i%count],echo=i>=count;
   const emphasis=Math.min(1,w.score/(words[0].score||1));
   const size=(echo?2.5+rand()*2:Math.min(17,4+13*Math.pow(emphasis,1.3),72/w.name.length))*Math.min(1,Math.sqrt(16/count));
   const vertical=w.name.length<=5 && (echo ? i%4===1 : i>=2 && i%4===2);
   const line=size*w.name.length+.6, thickness=size*1.14;
   const width=(vertical?thickness:line)*aspect, height=vertical?line:thickness;
   // Fill from the centre out; a small bias breaks ties without opening gaps.
   let best:{x:number,y:number,d:number}|undefined;
   const bearing=i*2.39996;
   const anchorX=4*Math.cos(bearing),anchorY=4*Math.sin(bearing);
   for(let j=0;j<1900;j++){
     const r=47*Math.sqrt(rand()),theta=rand()*2*Math.PI;
     const x=r*Math.cos(theta),y=r*Math.sin(theta);
     if(Math.hypot(Math.abs(x)+width/2,Math.abs(y)+height/2)>49)continue;
     if(result.some(b=>Math.abs(x-b.x)<(width+b.width)/2&&Math.abs(y-b.y)<(height+b.height)/2))continue;
     const d=(x-anchorX)**2+(y-anchorY)**2;
     if(!best||d<best.d)best={x,y,d};
   }
   if(best)result.push({...w,x:best.x,y:best.y,width,height,size:size*aspect,echo,vertical,tone:tones[i%tones.length]});
 }
 return result;
}
function randomGenerator(){
 let state=32789;
 return ()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296};
}
function paintOrbit(root:HTMLDivElement,canvas:HTMLCanvasElement,onAspect:(value:number)=>void){
 const ctx=canvas.getContext('2d');if(!ctx)return;
 const motion=matchMedia('(prefers-reduced-motion: reduce)');
 let width=0,height=0,frame=0,px=-9999,py=-9999;
 const tilt=-9*Math.PI/180;
 const disturbances:{x:number,y:number,t:number,strength:number,reach:number,duration:number}[]=[];
 let major=1,minor=1,lastMove=0,lastX=0,lastY=0,lastEmit=-Infinity;
 let overBand=false;
 const vapor=document.createElement('canvas');
 let fogPixels:ImageData,shiftedFog:ImageData;
 const still=document.createElement('canvas');
 const haze=document.createElement('canvas');
 const backdrop=document.createElement('canvas');
 let dots:{x:number,y:number,r:number,color:string}[]=[];
 function resize(){
   width=root.clientWidth;height=root.clientHeight;
   const dpr=Math.min(2,window.devicePixelRatio||1);
   canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);ctx!.setTransform(dpr,0,0,dpr,0,0);
   const rand=randomGenerator();
   const aspect=width<600?.90:.63;
   const a=Math.min(width*.447,height*.445/aspect),b=a*aspect;
   const cos=Math.cos(tilt),sin=Math.sin(tilt);
   major=a;minor=b;
   function project(theta:number,r:number){
     const x=a*r*Math.cos(theta),y=b*r*Math.sin(theta);
     return {x:width/2+x*cos-y*sin,y:height/2+x*sin+y*cos};
   }
   const density=(theta:number)=>(.5+.5*Math.cos(2*(theta+.62)))**1.25;
   const hole=.61;
   const clearance=Math.max(17,b*.081);
   const core=root.querySelector<HTMLElement>('.word-core')!;
   const scale=Math.max(.1,1-clearance/(b*hole));
   core.style.width=2*a*hole*scale+'px';
   core.style.height=2*b*hole*scale+'px';
   core.style.clipPath='ellipse(50% 50%)';
   onAspect(aspect);
   root.dataset.innerX=String(a*hole);root.dataset.innerY=String(b*hole);
   dots=[];
   for(let i=0;i<width*height/3000;i++){
     dots.push({x:rand()*width,y:rand()*height,r:.35+rand()*.55,color:'rgba(220,212,225,'+(.07+rand()*.29)+')'});
   }
   const grains=Math.round(.2*Math.max(10000,Math.min(72000,a*b*.43)));
   for(let i=0;i<grains;i++){
     const theta=rand()*2*Math.PI;
     const cluster=density(theta);
     const radius=.83+(.12+.13*cluster)*(rand()+rand()+rand()-1.5);
     const warm=(1+Math.cos(theta+1.12))/2;
     const hue=[173+78*warm,153+56*warm,247-79*warm].map(Math.round).join(',');
     const medium=rand()>.91;
     const alpha=(medium?.40+rand()*.43:.12+rand()*.34)*(.47+.53*cluster);
     const scale=Math.max(.66,Math.min(1.35,a/450));
     dots.push({...project(theta,radius),
       r:scale*(medium?.72+rand()*.63:.22+rand()*.46),color:'rgba('+hue+','+alpha+')'});
   }
   // Very faint motes carry the ring colours across the gap between words.
   for(let i=0;i<5;i++){
     const theta=rand()*Math.PI*2,radius=Math.sqrt(rand())*.71;
     dots.push({...project(theta,radius),
       r:.45+rand()*.38,color:'rgba(231,208,231,'+(.18+rand()*.20)+')'});
   }
   haze.width=Math.ceil(width/3);haze.height=Math.ceil(height/3);
   const fog=haze.getContext('2d')!;
   const pixels=fog.createImageData(haze.width,haze.height);
   for(let y=0;y<haze.height;y++){
     for(let x=0;x<haze.width;x++){
       const screenX=(x+.5)*width/haze.width-width/2,screenY=(y+.5)*height/haze.height-height/2;
       const dx=(screenX*cos+screenY*sin)/a,dy=(-screenX*sin+screenY*cos)/b;
       const radius=Math.hypot(dx,dy);
       if(radius<.34||radius>1.24)continue;
       const theta=Math.atan2(dy,dx);
       const cluster=density(theta);
       const spine=.825+.008*Math.sin(theta*3+.6);
       const distance=radius-spine;
       const warmInnerArc=distance<0 ? Math.max(0,Math.cos(theta+.42))**4 : 0;
       const falloff=(.07+.088*cluster)*(1+.08*warmInnerArc);
       const envelope=Math.exp(-((distance/falloff)**2));
       const folds=distance*35+1.35*Math.sin(theta*4+distance*13)+.7*Math.sin(theta*7);
       const wisps=.49+.51*(.5+.5*Math.sin(folds))**2;
       const warm=(1+Math.cos(theta+1.12))/2,idx=(y*haze.width+x)*4;
       pixels.data[idx]=162+88*warm+20*Math.sin(Math.PI*warm);pixels.data[idx+1]=140+60*warm;pixels.data[idx+2]=249-92*warm;
       pixels.data[idx+3]=(16+92*cluster)*envelope*wisps;
     }
   }
   fog.putImageData(pixels,0,0);
   fogPixels=pixels;
   vapor.width=haze.width;vapor.height=haze.height;
   shiftedFog=new ImageData(new Uint8ClampedArray(pixels.data),pixels.width,pixels.height);
   // A few pinpoint cores with soft radial bloom, distributed around the whole band.
   const beacons=width<600?6:10;
   backdrop.width=canvas.width;backdrop.height=canvas.height;
   const stars=backdrop.getContext('2d')!;
   stars.setTransform(dpr,0,0,dpr,0,0);

   stars.save();stars.translate(width/2,height/2);stars.scale(a,b);
   const innerLight=stars.createRadialGradient(0,0,0,0,0,.78);
   innerLight.addColorStop(0,'rgba(99,87,198,.045)');innerLight.addColorStop(.64,'rgba(99,87,198,.033)');innerLight.addColorStop(1,'rgba(99,87,198,0)');
   stars.fillStyle=innerLight;stars.fillRect(-1,-1,2,2);stars.restore();
   for(let i=0;i<beacons;i++){
     const t=(i+.22+rand()*.48)*Math.PI*2/beacons,radius=.79+rand()*.12;
     const {x,y}=project(t,radius);
     const accent=i===1||i===4||(beacons>6&&i===8);
     const size=accent?6:3.6;
     const rgb=Math.cos(t+1.12)>0?'255,215,174':'208,190,255';
     const glow=stars.createRadialGradient(x,y,0,x,y,size);
     glow.addColorStop(0,'rgba('+rgb+',.46)');glow.addColorStop(.33,'rgba('+rgb+',.13)');glow.addColorStop(1,'rgba('+rgb+',0)');
     stars.fillStyle=glow;stars.fillRect(x-size,y-size,size*2,size*2);
     if(accent){
       stars.strokeStyle='rgba(249,240,255,.48)';stars.lineWidth=.52;
       stars.beginPath();stars.moveTo(x-4.2,y);stars.lineTo(x+4.2,y);stars.moveTo(x,y-5);stars.lineTo(x,y+5);stars.stroke();
     }
     stars.fillStyle='#fff';stars.beginPath();stars.arc(x,y,accent?.9:.55,0,Math.PI*2);stars.fill();
   }
   still.width=canvas.width;still.height=canvas.height;
   const layer=still.getContext('2d')!;
   layer.setTransform(dpr,0,0,dpr,0,0);
   layer.drawImage(backdrop,0,0,width,height);
   layer.globalCompositeOperation='lighter';
   for(const p of dots){layer.fillStyle=p.color;layer.fillRect(p.x,p.y,p.r*1.35,p.r*1.35)}
   resetAnimation();
 }
 type Front={x:number,y:number,reach:number,radius:number,amplitude:number,hover?:boolean};
 function hoverWave(distance:number,time:number){
   return distance<140?8*(1-distance/140)**2*Math.sin(distance/15-time/230):0;
 }
 function drawMist(c:CanvasRenderingContext2D,time:number,fronts:Front[]){
   let texture=haze;
   if(fronts.length){
     const w=haze.width,h=haze.height,sx=w/width,sy=h/height;
     const original=fogPixels.data,out=shiftedFog.data;
     out.set(original);
     const cell=5,cols=Math.ceil(w/cell)+1,rows=Math.ceil(h/cell)+1;
     const vx=new Float32Array(cols*rows),vy=new Float32Array(cols*rows);
     let left=w,right=0,top=h,bottom=0;
     for(const f of fronts){
       const radius=f.hover?f.reach:f.radius+58;
       const l=Math.max(0,Math.floor((f.x-radius)*sx/cell)),r=Math.min(cols-1,Math.ceil((f.x+radius)*sx/cell));
       const t=Math.max(0,Math.floor((f.y-radius)*sy/cell)),b=Math.min(rows-1,Math.ceil((f.y+radius)*sy/cell));
       left=Math.min(left,l*cell);right=Math.max(right,r*cell);top=Math.min(top,t*cell);bottom=Math.max(bottom,b*cell);
       for(let j=t;j<=b;j++)for(let i=l;i<=r;i++){
         const dx=i*cell/sx-f.x,dy=j*cell/sy-f.y,d=Math.hypot(dx,dy),phase=(d-f.radius)/25;
         const shift=f.hover?hoverWave(d,time):f.amplitude*Math.exp(-.62*phase*phase)*Math.cos(1.75*phase);
         const push=.88*shift/Math.max(5,d);
         vx[j*cols+i]+=dx*push*sx;vy[j*cols+i]+=dy*push*sy;
       }
     }
     // Sample the original mist from displaced coordinates; the falloff is interpolated
     // across grid cells so a wave bends a wisp without introducing a visible seam.
     const mix=(a:number,b:number,t:number)=>a+(b-a)*t;
     for(let y=top;y<Math.min(h,bottom);y++)for(let x=left;x<Math.min(w,right);x++){
       const i=Math.floor(x/cell),j=Math.floor(y/cell),n=j*cols+i,tx=x/cell-i,ty=y/cell-j;
       const offset=(v:Float32Array)=>mix(mix(v[n],v[n+1],tx),mix(v[n+cols],v[n+cols+1],tx),ty);
       const u=Math.min(w-1.001,Math.max(0,x-Math.max(-5,Math.min(5,offset(vx))))),v=Math.min(h-1.001,Math.max(0,y-Math.max(-5,Math.min(5,offset(vy)))));
       const ix=Math.floor(u),iy=Math.floor(v),base=4*(iy*w+ix)+3;
       out[4*(y*w+x)+3]=mix(mix(original[base],original[base+4],u-ix),mix(original[base+w*4],original[base+w*4+4],u-ix),v-iy);
     }
     vapor.getContext('2d')!.putImageData(shiftedFog,0,0);texture=vapor;
   }
   const breath=motion.matches?0:Math.sin(time*Math.PI*2/5700);
   const expansion=1+.015*breath;
   c.save();c.globalCompositeOperation='destination-over';
   c.translate(width/2,height/2);c.scale(expansion,1+.023*breath);
   c.globalAlpha=.89+.11*breath;c.drawImage(texture,-width/2,-height/2,width,height);
   c.restore();
 }
 function draw(time:number){
   const c=ctx!;c.clearRect(0,0,width,height);
   c.drawImage(still,0,0,width,height);
   if(!width||!height)return;
   for(let i=disturbances.length-1;i>=0;i--){
     if(time-disturbances[i].t>=disturbances[i].duration)disturbances.splice(i,1);
   }
   if((!disturbances.length&&!overBand)||motion.matches){drawMist(c,time,[]);return}
   const fronts:Front[]=disturbances.map(p=>{
     const life=Math.max(0,(time-p.t)/p.duration);
     return {...p,radius:p.reach*(1-Math.exp(-2.2*life)),amplitude:p.strength*(1-life)**1.45};
   });
   if(overBand)fronts.push({x:px,y:py,reach:140,radius:0,amplitude:8,hover:true});
   // Repaint only the affected regions, with the same grains and colours as the resting image.
   c.save();c.beginPath();
   for(const pulse of fronts){
     const edge=pulse.reach+18;
     c.rect(pulse.x-edge,pulse.y-edge,2*edge,2*edge);
   }
   c.clip();c.clearRect(0,0,width,height);c.drawImage(backdrop,0,0,width,height);
   c.globalCompositeOperation='lighter';
   for(const p of dots){
     let ox=0,oy=0,near=false;
     for(const f of fronts){
       const dx=p.x-f.x,dy=p.y-f.y;
       if(Math.abs(dx)>f.reach+20||Math.abs(dy)>f.reach+20)continue;
       near=true;
       const dist=Math.hypot(dx,dy),phase=(dist-f.radius)/19;
       if(!f.hover&&Math.abs(phase)>3.4)continue;
       // One compressed front and its restoring trough displace existing grains radially.
       const shift=f.hover?hoverWave(dist,time):f.amplitude*Math.exp(-phase*phase*.57)*Math.cos(phase*2.05);
       ox+=shift*dx/Math.max(5,dist);oy+=shift*dy/Math.max(5,dist);
     }
     if(!near)continue;
     const dx=p.x-width/2,dy=p.y-height/2;
     const ring=Math.hypot((dx*Math.cos(tilt)+dy*Math.sin(tilt))/major,(-dx*Math.sin(tilt)+dy*Math.cos(tilt))/minor);
     const band=Math.max(0,Math.min(1,(ring-.61)/.13,(1.13-ring)/.13));
     const limit=band/Math.max(1,Math.hypot(ox,oy)/15);
     c.fillStyle=p.color;c.fillRect(p.x+ox*limit,p.y+oy*limit,p.r*1.35,p.r*1.35);
   }
   c.restore();
   drawMist(c,time,fronts);
 }
 function animate(time:number){draw(time);frame=requestAnimationFrame(animate)}
 function resetAnimation(){
   cancelAnimationFrame(frame);disturbances.length=0;leave();
   if(!width||!height)return;
   draw(performance.now());if(!document.hidden&&!motion.matches)frame=requestAnimationFrame(animate);
 }
 function sample(x:number,y:number,t:number){
   if(px>-9000){
     const dx=x-px,dy=y-py,dist=Math.hypot(dx,dy);
     if(dist<.5)return;
     const speed=dist/Math.max(2,Math.min(80,t-lastMove));
     const power=1-Math.exp(-speed/1.05);
     const steps=Math.max(1,Math.ceil(dist/30));
     for(let i=1;i<=steps;i++){
       const sx=px+dx*i/steps,sy=py+dy*i/steps;
       const u=sx-width/2,v=sy-height/2;
       const r=Math.hypot((u*Math.cos(tilt)+v*Math.sin(tilt))/major,(-u*Math.sin(tilt)+v*Math.cos(tilt))/minor);
       if(r<.62||r>1.1||Math.hypot(sx-lastX,sy-lastY)<22&&t-lastEmit<110)continue;
       disturbances.push({x:sx,y:sy,t,strength:2.3+12.7*power,reach:40+125*power,duration:500+1450*power});
       if(disturbances.length>10)disturbances.shift();
       lastX=sx;lastY=sy;lastEmit=t;
     }
   }
   px=x;py=y;lastMove=t;
   const u=x-width/2,v=y-height/2;
   const ring=Math.hypot((u*Math.cos(tilt)+v*Math.sin(tilt))/major,(-u*Math.sin(tilt)+v*Math.cos(tilt))/minor);
   overBand=ring>=.62 && ring<=1.1;
 }
 function move(e:PointerEvent){
   if(e.pointerType==='touch'||motion.matches)return;
   const box=root.getBoundingClientRect();
   for(const p of e.getCoalescedEvents?.()??[])sample(p.clientX-box.left,p.clientY-box.top,p.timeStamp);
   sample(e.clientX-box.left,e.clientY-box.top,e.timeStamp);
 }
 function leave(){px=-9999;lastEmit=-Infinity;overBand=false}
 const observer=new ResizeObserver(resize);observer.observe(root);
 root.addEventListener('pointermove',move);root.addEventListener('pointerleave',leave);
 motion.addEventListener('change',resetAnimation);document.addEventListener('visibilitychange',resetAnimation);
 return ()=>{observer.disconnect();cancelAnimationFrame(frame);root.removeEventListener('pointermove',move);root.removeEventListener('pointerleave',leave);motion.removeEventListener('change',resetAnimation);document.removeEventListener('visibilitychange',resetAnimation)};
}
export default function Cloud({words,onSelect}:{words:Word[],onSelect:(id:string)=>void}){
 const ref=useRef<HTMLDivElement>(null);
 const [aspect,setAspect]=useState(.63);
 const spots=useMemo(()=>pack(words,aspect),[words,aspect]);
 useEffect(()=>paintOrbit(ref.current!,ref.current!.querySelector('canvas')!,setAspect),[]);
 return <div className="orbit-field" ref={ref}><canvas aria-hidden="true"/><div className="word-core">{spots.map((w,i)=><button key={w.id+'-'+i} tabIndex={w.echo?-1:0} aria-hidden={w.echo||undefined} className={w.echo?'star-word echo':'star-word'} data-x={w.x} data-y={w.y} style={{left:(50+w.x)+'%',top:(50+w.y)+'%',writingMode:w.vertical?'vertical-rl':'horizontal-tb',textOrientation:'upright',fontSize:w.size+'cqw',color:w.tone,textShadow:i===0?'0 0 .34em rgba(255,211,150,.32)':undefined}} onClick={()=>onSelect(w.id)}>{w.name}</button>)}</div></div>
}
