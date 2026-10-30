// Procedural SVG for the simulated site, the US station map, the digital twin and the layered building plans.
// Everything is drawn locally so the demo runs with no network.
const f1=n=>Math.round(n*10)/10;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function rng(a){return()=>{a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const pick=(r,a)=>a[Math.floor(r()*a.length)];
const overlaps=(a,b,m)=>a.x-m<b.x+b.w&&b.x<a.x+a.w+m&&a.y-m<b.y+b.h&&b.y<a.y+a.h+m;
const roadBox=d=>({x:Math.min(d.x1,d.x2)-d.w/2,y:Math.min(d.y1,d.y2)-d.w/2,w:Math.abs(d.x2-d.x1)+d.w,h:Math.abs(d.y2-d.y1)+d.w});
const seg=(d,w,c,dash='')=>`<line x1="${d.x1}" y1="${d.y1}" x2="${d.x2}" y2="${d.y2}" stroke="${c}" stroke-width="${w}"${dash&&` stroke-dasharray="${dash}"`}/>`;
const rect=(b,attrs)=>`<rect x="${f1(b.x)}" y="${f1(b.y)}" width="${f1(b.w)}" height="${f1(b.h)}" ${attrs}/>`;
// Real-map geometry (sc.osm): polygons and polylines as [[x,y],...].
const pg=(pts,attrs)=>`<polygon points="${pts.map(p=>p.join(',')).join(' ')}" ${attrs}/>`;
const pl=(pts,w,c,dash='',attrs='')=>`<polyline points="${pts.map(p=>p.join(',')).join(' ')}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"${dash&&` stroke-dasharray="${dash}"`}${attrs}/>`;
const shape=(b,attrs)=>b.pts?pg(b.pts,attrs):rect(b,attrs);
const box=pts=>{const xs=pts.map(p=>p[0]),ys=pts.map(p=>p[1]),x=Math.min(...xs),y=Math.min(...ys);return{x,y,w:Math.max(...xs)-x,h:Math.max(...ys)-y}};
const inside=(pts,x,y)=>{let c=false;for(let i=0,j=pts.length-1;i<pts.length;j=i++){const[x1,y1]=pts[i],[x2,y2]=pts[j];if((y1>y)!==(y2>y)&&x<x1+(y-y1)*(x2-x1)/(y2-y1))c=!c}return c};
const segDist=(x,y,[x1,y1],[x2,y2])=>{const dx=x2-x1,dy=y2-y1,t=Math.max(0,Math.min(1,((x-x1)*dx+(y-y1)*dy)/(dx*dx+dy*dy||1)));return Math.hypot(x-x1-t*dx,y-y1-t*dy)};
const nearLine=(pts,x,y,d)=>pts.slice(1).some((p,i)=>segDist(x,y,pts[i],p)<d);
const shade=(h,k)=>'#'+[1,3,5].map(i=>Math.min(255,Math.round(parseInt(h.slice(i,i+2),16)*k)).toString(16).padStart(2,'0')).join('');
export const lvl=s=>s>=.7?'hi':s>=.45?'md':'lo';
const LVL={hi:'#ff4d3d',md:'#ffa53a',lo:'#f3d65c'};
const ROOFS=['#b49a7e','#9c8f83','#c4bcae','#8f6b55','#a3a5a6','#7d7f78'];

export const defs=`<defs>
<filter id="grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" seed="4"/><feColorMatrix values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 .22 0"/></filter>
<filter id="soft"><feGaussianBlur stdDeviation="6"/></filter>
<radialGradient id="hot"><stop offset="0" stop-color="#ff3b1f" stop-opacity=".95"/><stop offset=".45" stop-color="#ffb000" stop-opacity=".55"/><stop offset="1" stop-color="#ffd84a" stop-opacity="0"/></radialGradient>
<filter id="hudtint" color-interpolation-filters="sRGB"><feColorMatrix values=".03 .06 .01 0 0  .1 .26 .06 0 .015  .05 .12 .03 0 .01  0 0 0 1 0"/></filter>
<filter id="wglow" x="-5%" y="-5%" width="110%" height="110%"><feGaussianBlur stdDeviation="2.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
<clipPath id="clipBefore"><rect id="clipRect" width="500" height="600"/></clipPath>
</defs>`;

// House lots and trees, generated once so the before and after images line up.
export function layout(sc){
  const r=rng(11),lots=[],trees=[],roads=sc.roads.map(roadBox);
  if(sc.osm){
    for(const l of sc.osm.lots)lots.push({...box(l.pts),pts:l.pts,g:l.g,roof:pick(r,ROOFS)});
    const wet=sc.osm.water.map(w=>w.pts);
    for(let i=0;i<900;i++){
      const t={x:r()*1000,y:r()*600,w:1,h:1,s:3+r()*5};
      if(!sc.osm.streets.some(d=>nearLine(d.pts,t.x,t.y,d.w/2+t.s))&&!wet.some(w=>inside(w,t.x,t.y))&&![...lots,...sc.buildings].some(b=>overlaps(t,b,t.s)))trees.push(t);
    }
    return{lots,trees};
  }
  const blocked=[...roads.map(b=>[b,7]),...sc.buildings.map(b=>[b,14])];
  for(let y=12;y<588;y+=34)for(let x=12;x<988;x+=36){
    const h={x:x+r()*5,y:y+r()*4,w:17+r()*7,h:12+r()*6,roof:pick(r,ROOFS),pool:r()<.3,hit:r()};
    if(!blocked.some(([k,m])=>overlaps({...h,h:h.h+8},k,m)))lots.push(h);
    const t={x:x+r()*32,y:y+r()*30,w:1,h:1,s:3+r()*5};
    if(!roads.some(b=>overlaps(t,b,t.s))&&!sc.buildings.some(b=>overlaps(t,b,t.s))&&!lots.some(l=>overlaps(t,{...l,h:l.h+8},1)))trees.push(t);
  }
  return{lots,trees};
}

function rubble(b,r,n,dust){
  const o=[],j=()=>(r()-.5)*8;
  if(dust)o.push(`<ellipse cx="${f1(b.x+b.w/2)}" cy="${f1(b.y+b.h/2)}" rx="${f1(b.w*.75)}" ry="${f1(b.h*.8)}" fill="#c8b897" opacity=".35" filter="url(#soft)"/>`);
  const edge=[[0,0],[.5,0],[1,0],[1,.5],[1,1],[.5,1],[0,1],[0,.5]];
  o.push(`<polygon points="${edge.map(([u,v])=>`${f1(b.x+u*b.w+j())},${f1(b.y+v*b.h+j())}`).join(' ')}" fill="#776e61"/>`);
  for(let i=0;i<n;i++){
    const x=b.x-4+r()*(b.w+8),y=b.y-4+r()*(b.h+8),s=2+r()*6,k=3+(r()*3|0);
    o.push(`<polygon points="${Array.from({length:k},(_,a)=>{const t=a/k*6.283+r();return`${f1(x+Math.cos(t)*s)},${f1(y+Math.sin(t)*s)}`}).join(' ')}" fill="${pick(r,['#9b9284','#857c6f','#b3aa9b','#5f584f','#a08a74','#c9c3b8'])}"/>`);
  }
  return o.join('');
}
function cracks(b,r){
  let o='';
  for(let i=0;i<3;i++){let x=b.x+r()*b.w,y=b.y;const p=[];for(let k=0;k<6;k++){p.push(`${f1(x)},${f1(y)}`);x=Math.max(b.x,Math.min(b.x+b.w,x+(r()-.5)*24));y+=b.h/5}o+=`<polyline points="${p.join(' ')}" fill="none" stroke="#2a2622" stroke-width="1.4"/>`}
  return o;
}

// Layer 1 (after=false) and layer 3 (after=true). img, when set, is laid over the procedural drawing.
export function aerial(sc,L,after,img){
  const g=rng(2),r=rng(after?5:3),e=sc.site.epicenter,o=['<rect width="1000" height="600" fill="#5a6049"/>'];
  for(let i=0;i<70;i++)o.push(`<circle cx="${f1(g()*1000)}" cy="${f1(g()*600)}" r="${f1(20+g()*70)}" fill="${g()<.5?'#666c52':'#4e5540'}" opacity=".45"/>`);
  for(const d of sc.roads)o.push(seg(d,d.w+7,'#a29d8f'),seg(d,d.w,'#3a3b3d'),d.w>=20?seg(d,1.2,'#d9c25a','12 10'):'');
  if(sc.osm){
    for(const z of sc.osm.green)o.push(pg(z.pts,`fill="${z.k==='beach'?'#cdb98a':'#4f6b3a'}"`));
    for(const z of sc.osm.water)o.push(pg(z.pts,'fill="#2f5f73"'));
    for(const d of sc.osm.streets)o.push(pl(d.pts,d.w+7,'#a29d8f'));
    for(const d of sc.osm.streets)o.push(pl(d.pts,d.w,'#3a3b3d'),d.w>=20?pl(d.pts,1.2,'#d9c25a','12 10'):'');
    for(const p of sc.osm.pools)o.push(pg(p,`fill="${after?'#7d9c9c':'#43b4d4'}"`));
  }
  for(const h of L.lots){
    if(after&&(h.g!=null?h.g===3:h.hit<.24-Math.hypot(h.x-e.x,h.y-e.y)/2400)){o.push(rubble(h,r,Math.max(9,Math.round(h.w*h.h/60)),false));continue}
    o.push(shape(h,'fill="#0006" transform="translate(2.5 2.5)"'),shape(h,`fill="${h.roof}"`));
    if(!h.pts)o.push(`<line x1="${f1(h.x+2)}" y1="${f1(h.y+h.h/2)}" x2="${f1(h.x+h.w-2)}" y2="${f1(h.y+h.h/2)}" stroke="#0003"/>`);
    if(after&&h.g===2)o.push(cracks(h,r));
    if(h.pool)o.push(rect({x:h.x+2,y:h.y+h.h+3,w:h.w*.55,h:5},`rx="2" fill="${after?'#7d9c9c':'#43b4d4'}"`));
  }
  for(const t of L.trees)o.push(`<circle cx="${f1(t.x+1)}" cy="${f1(t.y+1)}" r="${f1(t.s)}" fill="#203519"/><circle cx="${f1(t.x)}" cy="${f1(t.y)}" r="${f1(t.s*.6)}" fill="#3b5932"/>`);
  for(const b of sc.buildings){
    const s=after?b.status:'standing';
    if(s==='collapsed'){o.push(rubble(b,r,Math.round(b.w*b.h/45),true));continue}
    const q=rng(b.x*31+b.y);
    o.push(shape(b,'fill="#0007" transform="translate(6 6)"'),shape(b,`fill="${b.roof||'#a9acae'}" stroke="#d6d6d0" stroke-width="2"`));
    for(let i=0;i<5;i++)o.push(rect({x:b.x+8+q()*(b.w-26),y:b.y+8+q()*(b.h-24),w:10,h:8},'fill="#d5d7d6" stroke="#6d6f70" stroke-width=".6"'));
    if(s==='partial')o.push(rubble({x:b.x+b.w*.5,y:b.y,w:b.w*.5,h:b.h},r,Math.round(b.w*b.h/90),true));
    if(s==='partial'||s==='damaged')o.push(cracks(b,r));
  }
  if(after)o.push('<rect width="1000" height="600" fill="#d9c6a0" opacity=".1"/>');
  o.push('<rect width="1000" height="600" filter="url(#grain)"/>');
  if(img)o.push(`<image href="${esc(img)}" width="1000" height="600" preserveAspectRatio="xMidYMid slice"/>`);
  return o.join('');
}

// HUD style: every footprint as a glowing wireframe, focus buildings extruded by floor count.
export function wire(sc,L){
  const o=['<g class="wire" filter="url(#wglow)">'];
  for(const d of sc.osm?sc.osm.streets:[])o.push(pl(d.pts,.8,'#39f59a55','3 6'));
  for(const h of L.lots)o.push(shape(h,'fill="#39f59a0d" stroke="#39f59a" stroke-width=".7" stroke-opacity=".55"'));
  for(const b of sc.buildings){
    const k=Math.min(b.floors,8)*2.2,up=p=>p.map(([x,y])=>[x,f1(y-k)]),base=b.pts||[[b.x,b.y],[b.x+b.w,b.y],[b.x+b.w,b.y+b.h],[b.x,b.y+b.h]];
    o.push(pg(base,'fill="#39f59a14" stroke="#39f59a" stroke-width="1.2"'),pg(up(base),'fill="none" stroke="#b8ffd9" stroke-width="1.2"'));
    for(const[x,y]of base)o.push(`<line x1="${x}" y1="${y}" x2="${x}" y2="${f1(y-k)}" stroke="#39f59a" stroke-opacity=".6" stroke-width=".7"/>`);
  }
  o.push('</g>');
  return o.join('');
}

// Layer 2: street centerlines, water mains, power lines and building footprints.
export function gis(sc,L){
  const o=[];
  for(const d of sc.roads){
    const v=d.x1===d.x2,k=d.w/2+5,sh=n=>({...d,x1:d.x1+(v?n:0),x2:d.x2+(v?n:0),y1:d.y1+(v?0:n),y2:d.y2+(v?0:n)});
    o.push(seg(sh(k),1.6,'#4cc3ff','7 4'),seg(sh(-k),1.4,'#ff9f43','2 5'),seg(d,2,'#ffd84a'));
    o.push(v?`<text class="gl" transform="translate(${d.x1-k-4} 590) rotate(-90)">${esc(d.name)}</text>`:`<text class="gl" x="8" y="${d.y1-k-4}">${esc(d.name)}</text>`);
  }
  if(sc.osm){
    const named=new Map();
    for(const d of sc.osm.streets){
      o.push(pl(d.pts,1.6,'#4cc3ff','7 4',' transform="translate(4 4)"'),pl(d.pts,1.4,'#ff9f43','2 5',' transform="translate(-4 -4)"'),pl(d.pts,2,'#ffd84a'));
      // Label each street once, on its longest on-screen segment.
      d.pts.slice(1).forEach((q,i)=>{const p=d.pts[i],m=[(p[0]+q[0])/2,(p[1]+q[1])/2],n=Math.hypot(q[0]-p[0],q[1]-p[1]);if(d.name&&m[0]>40&&m[0]<960&&m[1]>20&&m[1]<580&&n>(named.get(d.name)?.n||0))named.set(d.name,{p,q,m,n})});
    }
    for(const[name,{p,q,m}]of named){let a=Math.atan2(q[1]-p[1],q[0]-p[0])*180/Math.PI;if(a>90)a-=180;if(a<-90)a+=180;o.push(`<text class="gl" text-anchor="middle" transform="translate(${f1(m[0])} ${f1(m[1])}) rotate(${f1(a)}) translate(0 -9)">${esc(name)}</text>`)}
  }
  for(const h of L.lots)o.push(shape(h,'fill="none" stroke="#5ee0e6" stroke-width=".7" opacity=".5"'));
  for(const b of sc.buildings)o.push(shape(b,'fill="#5ee0e61f" stroke="#5ee0e6" stroke-width="1.6"'),`<text class="gl" x="${b.x+4}" y="${b.y+14}">${esc(b.name)} · ${b.floors} fl</text>`);
  return o.join('');
}

export const change=sc=>sc.buildings.filter(b=>b.status==='collapsed'||b.status==='partial').map(b=>rect({x:b.x-7,y:b.y-7,w:b.w+14,h:b.h+14},'fill="none" stroke="#ff4d3d" stroke-width="2.5" stroke-dasharray="7 4"')+`<text class="cl" x="${b.x-7}" y="${b.y+b.h+21}">OBSERVED · ${b.status==='collapsed'?'COLLAPSED':'PARTIAL COLLAPSE'} · Δ vs layer 1</text>`).join('');

export const areas=teams=>teams.filter(t=>t.area).map(t=>{const[x,y,w,h]=t.area;return rect({x,y,w,h},`fill="${t.color}" fill-opacity=".08" stroke="${t.color}" stroke-width="2.5" stroke-dasharray="10 6"`)+`<rect x="${x+4}" y="${y+h-24}" width="${f1(t.name.length*6.6+14)}" height="19" rx="3" fill="${t.color}"/><text class="tl" x="${x+11}" y="${y+h-10}">${esc(t.name)}</text>`}).join('');

// Human reports from teams on the ground: hazards and access routes. Never drawn as verified or safe.
export function field(f,on){
  let o='';
  if(on.routes)for(const r of f.routes){
    const bl=r.kind==='blocked',m=r.pts[Math.floor((r.pts.length-1)/2)],n=r.pts[Math.floor((r.pts.length-1)/2)+1],a=Math.atan2(n[1]-m[1],n[0]-m[0])*180/Math.PI,ang=a>90?a-180:a<-90?a+180:a;
    o+=`<g class="rt${bl?' bl':''}"><title>Human report · ${esc(r.label)} · not verified safe</title>${pl(r.pts,9,'#000','',' opacity=".45"')}${pl(r.pts,4,bl?'#ff4d3d':'#3ddc84',bl?'4 6':'14 8')}<text class="rl" text-anchor="middle" transform="translate(${f1((m[0]+n[0])/2)} ${f1((m[1]+n[1])/2)}) rotate(${f1(ang)}) translate(0 ${bl?-12:18})">${bl?'✕ ':''}${esc(r.label)} · REPORTED${bl?'':' · NOT VERIFIED SAFE'}</text></g>`;
  }
  if(on.hazards)for(const h of f.hazards)o+=`<g class="hz" transform="translate(${h.x} ${h.y})"><title>Human report · ${esc(h.note)} · unverified</title><path d="M0 -15 L14 10 L-14 10 Z"/><text class="hm" y="7">!</text><text class="hl" x="17" y="4">${esc(h.label)} · REPORTED</text></g>`;
  return o;
}

// Published news photos: a camera marker per photo; dashed when the location is approximate.
export const photos=(list,sel)=>list.map(p=>`<g class="nph${p.approx?' ap':''}${sel===p.id?' sel':''}" data-id="${p.id}" transform="translate(${p.x} ${p.y})"><title>${esc(p.kind)} · ${esc(p.outlet)} · opens at source</title><rect x="-13" y="-10" width="26" height="20" rx="4"/><rect x="-5" y="-14" width="10" height="5" rx="1"/><circle r="5.5"/><text class="pl" x="18" y="4">${esc(p.label)}${p.approx?' · APPROX.':''}</text></g>`).join('');

export const heat=inds=>inds.map(i=>`<circle cx="${i.x}" cy="${i.y}" r="${f1(28+60*i.strength)}" fill="url(#hot)" opacity="${f1(.3+.6*i.strength)}"/>`).join('');

export function p2(sc,on){
  let o='';
  if(on.score)for(const b of sc.buildings)o+=`<g class="p2b"><rect x="${b.x+b.w-112}" y="${b.y+b.h-24}" width="108" height="20" rx="3"/><text x="${b.x+b.w-106}" y="${b.y+b.h-10}">AI · score ${esc(b.score)}</text></g>`;
  if(on.imsi)for(const c of sc.imsi)o+=`<circle cx="${c.x}" cy="${c.y}" r="${18+c.n*3}" class="p2c"/><text class="p2t" x="${c.x}" y="${c.y+4}" text-anchor="middle">~${c.n} handsets</text>`;
  return o;
}

// Lower-48 outline (lon, lat), simplified; illustrative only.
const US=[[-124.7,48.4],[-123.3,49],[-95.2,49],[-95.2,49.4],[-94.8,49.3],[-89.6,48],[-84.8,46.5],[-83.5,46],[-82.4,43],[-83.1,42],[-79,42.8],[-79.2,43.4],[-76.4,44.2],[-74.9,45],[-71.5,45],[-70,46.7],[-69.2,47.4],[-67.8,47.1],[-67.8,45.7],[-67,44.9],[-68.8,44.3],[-70.2,43.6],[-70.7,42.6],[-70,41.8],[-70.6,41.5],[-71.9,41.3],[-73.6,40.9],[-74,40.6],[-74.1,39.8],[-74.9,38.9],[-75.1,38.4],[-75.9,37.2],[-75.5,35.8],[-75.6,35.2],[-76.6,34.7],[-77.9,33.9],[-79.2,33.2],[-80.9,32],[-81.4,30.7],[-81,29.3],[-80,26.8],[-80.4,25.2],[-81.1,25.1],[-81.8,26.1],[-82.7,27.5],[-82.8,29.2],[-84,30.1],[-85.4,29.7],[-86.5,30.4],[-88,30.4],[-89.6,30.2],[-89.4,29],[-90.2,29.1],[-91.3,29.3],[-93.3,29.8],[-94.7,29.4],[-96.6,28],[-97.4,27.3],[-97.2,25.9],[-99.1,26.4],[-99.5,27.5],[-100.3,28.3],[-101.4,29.8],[-102.4,29.8],[-103.1,29],[-104.5,29.6],[-106.5,31.8],[-108.2,31.8],[-108.2,31.3],[-111.1,31.3],[-114.8,32.5],[-114.7,32.7],[-117.1,32.5],[-117.3,33.1],[-118.4,33.8],[-119.2,34.2],[-120.6,34.6],[-120.9,35.4],[-121.9,36.6],[-122.4,37.2],[-122.5,37.8],[-123,38],[-123.7,38.9],[-123.8,39.8],[-124.4,40.4],[-124.1,41],[-124.2,42],[-124.5,42.8],[-124,44.6],[-123.9,46.2],[-124.1,46.9]];
const LAKES=[[[-87.8,42],[-87.5,43.5],[-87,45.5],[-85.6,45.8],[-86.3,44],[-86.4,42.5]],[[-83.5,46],[-84.6,45.8],[-83.4,45.1],[-83.3,44.2],[-82.4,43]]];
const PJ=(lon,lat)=>[f1((lon+125.5)*15+10),f1((49.8-lat)*19+10)];
export function usMap(sc,{phase,step}){
  const pts=a=>a.map(([lon,lat])=>PJ(lon,lat).join(',')).join(' ');
  const o=[`<polygon points="${pts(US)}" class="land"/>`,...LAKES.map(l=>`<polygon points="${pts(l)}" class="lake"/>`)];
  for(const z of sc.hazards){const[x,y]=PJ(z.lon,z.lat);o.push(`<ellipse cx="${x}" cy="${y}" rx="${z.rx}" ry="${z.ry}" transform="rotate(${z.rot||0} ${x} ${y})" fill="${z.color}" fill-opacity=".13" stroke="${z.color}" stroke-opacity=".55" stroke-dasharray="4 4"/>`);if(z.label)o.push(`<text class="hz" x="${f1(x+(z.lx||0))}" y="${f1(y+(z.ly||0))}" fill="${z.color}" text-anchor="middle">${esc(z.label)}</text>`)}
  for(const s of sc.stations){const[x,y]=PJ(s.lon,s.lat),dim=phase!=='all'&&s.phase!==phase;o.push(`<g class="st${dim?' dim':''}"><circle cx="${x}" cy="${y}" r="23" class="ring"/><circle cx="${x}" cy="${y}" r="${2.5+s.units}" class="dot"/><title>${esc(s.id)} · ${esc(s.city)} · ${s.units} unit${s.units>1?'s':''} · ${esc(s.phase)}</title></g>`)}
  for(const c of sc.c2){const[x,y]=PJ(c.lon,c.lat);o.push(`<g class="c2"><rect x="${x-6}" y="${y-6}" width="12" height="12" transform="rotate(45 ${x} ${y})"/><text x="${x+11}" y="${y+4}">${esc(c.name)}</text></g>`)}
  if(step>=1){
    // An event outside the lower 48 sits on the frame edge, with the deployment leg from the responding station.
    const[ex,ey]=PJ(sc.epicenter.lon,sc.epicenter.lat),off=ex<0||ex>900||ey<0||ey>500;
    const x=off?Math.min(880,Math.max(20,ex)):ex,y=off?Math.min(480,Math.max(20,ey)):ey,s=off&&sc.stations.find(s=>s.id===sc.response.station);
    if(s){const[sx,sy]=PJ(s.lon,s.lat);o.push(`<path d="M${sx} ${sy}Q${f1((sx+x)/2)} ${f1(Math.min(sy,y)-70)} ${x} ${y}" class="leg"/>`)}
    const[tx,ty]=off?[x-10,y-120]:[x+74,y+74],a=off?' text-anchor="end"':'';
    o.push(`<g class="epi"><circle cx="${x}" cy="${y}" r="8" class="p1"/><circle cx="${x}" cy="${y}" r="8" class="p2"/><circle cx="${x}" cy="${y}" r="5" class="core"/><line x1="${x}" y1="${y}" x2="${off?x-4:x+70}" y2="${off?y-112:y+70}"/><text x="${tx}" y="${ty}"${a}>${esc(sc.epicenter.label)}${off?' ↘':''}</text><text x="${tx}" y="${ty+16}" class="sub"${a}>${esc(sc.response.text)}</text></g>`);
  }
  return o.join('');
}

// Layer 5: isometric twin of a collapsed building with sensor indications placed in 3D.
export function twin(inds){
  const s=40,Q=([x,y,z])=>[f1(400+(x-y)*s*.866),f1(260+(x+y)*s*.5-z*s*.95)],P=p=>Q(p).join(',');
  const poly=(p,c)=>`<polygon points="${p.map(P).join(' ')}" fill="${c}" stroke="#0009" stroke-width=".7"/>`;
  const box=(x0,x1,y0,y1,za,zb,t,c)=>poly([[x0,y1,za],[x1,y1,zb],[x1,y1,zb+t],[x0,y1,za+t]],shade(c,.78))+poly([[x1,y0,zb],[x1,y1,zb],[x1,y1,zb+t],[x1,y0,zb+t]],shade(c,.58))+poly([[x0,y0,za+t],[x1,y0,zb+t],[x1,y1,zb+t],[x0,y1,za+t]],c);
  const o=[poly([[-2,-2,0],[9,-2,0],[9,7,0],[-2,7,0]],'#2b261f')];
  for(let f=0;f<6;f++)o.push(box(0,3,0,4,f,f,1,'#8f949a'),poly([[.2,4,f+.35],[2.8,4,f+.35],[2.8,4,f+.72],[.2,4,f+.72]],'#22272e'));
  for(let f=0;f<6;f++)o.push(box(3,6.4,0,4,.15+f*.42,f*.13,.2,'#a8a196'));
  const r=rng(9),top=x=>x<=6.4?2.45-(x-3)*.47:0,bits=[];
  for(let i=0;i<70;i++){const x=3+r()*4.4,y=-.2+r()*4.8,w=.15+r()*.35;bits.push([x,y,w,y>=0&&y<=4?top(x):0])}
  bits.sort((a,b)=>a[0]+a[1]-b[0]-b[1]);
  for(const[x,y,w,z]of bits)o.push(box(x,x+w,y,y+w*.8,z,z,w*.5,pick(r,['#8c8478','#b2aa9c','#6d665c','#9c8a76'])));
  inds.filter(i=>i.twin).forEach((i,n)=>{const[x,y]=Q(i.twin),ly=70+n*52,c=LVL[lvl(i.strength)];o.push(`<g class="tw"><circle cx="${x}" cy="${y}" r="16" fill="${c}" class="glow"/><circle cx="${x}" cy="${y}" r="6" fill="${c}" stroke="#fff" stroke-width="2"/><polyline points="${x},${y} ${x+30},${ly} 740,${ly}" fill="none" stroke="#fff8"/><text x="745" y="${ly+4}">${esc(i.short||i.note)}</text></g>`)});
  return o.join('');
}

// Layered (exploded) view: the street and neighbouring footprints at the bottom, each floor plan of one building stacked above.
export function plans(sc,L,b,inds,focus){
  const pad=(b.w+b.h)*.35,W={x:b.x-pad,y:b.y-pad,w:b.w+pad*2,h:b.h+pad*2},u=(b.w+b.h)/29,X=W.w/u,Y=W.h/u,F=b.floors,gap=Math.max(3,(b.w+b.h)/u*.14),top=[];
  const s=20,cx=0,cy=0;
  const Q=(x,y,z)=>[f1(cx+(x-y)*s*.866),f1(cy+(x+y)*s*.5-z*s*.95)],P=(x,y,z)=>Q(x,y,z).join(',');
  const loc=m=>({x:(m.x-W.x)/u,y:(m.y-W.y)/u,w:m.w/u,h:m.h/u});
  const clip=m=>{const x0=Math.max(m.x,W.x),y0=Math.max(m.y,W.y),x1=Math.min(m.x+m.w,W.x+W.w),y1=Math.min(m.y+m.h,W.y+W.h);return x1>x0&&y1>y0?{x:x0,y:y0,w:x1-x0,h:y1-y0}:null};
  const quad=(r,z,attrs)=>`<polygon points="${[[r.x,r.y],[r.x+r.w,r.y],[r.x+r.w,r.y+r.h],[r.x,r.y+r.h]].map(([x,y])=>P(x,y,z)).join(' ')}" ${attrs}/>`;
  const ln=(x1,y1,x2,y2,z,attrs)=>`<line x1="${Q(x1,y1,z)[0]}" y1="${Q(x1,y1,z)[1]}" x2="${Q(x2,y2,z)[0]}" y2="${Q(x2,y2,z)[1]}" ${attrs}/>`;
  const vx=f1(-Y*s*.866-90),vy=f1(Math.min(0,Q((b.x-W.x)/u,(b.y-W.y)/u,F*gap)[1])-40),vw=f1((X+Y)*s*.866+290),vh=f1((X+Y)*s*.5-vy+50),H=vy+vh,o=[`<rect x="${vx}" y="${vy}" width="${vw}" height="${vh}" fill="#0f0d0a"/>`];
  // Street level
  o.push(quad({x:0,y:0,w:X,h:Y},0,'fill="#3d4234" stroke="#6b5d45"'));
  for(const d of sc.roads){const c=clip(roadBox(d));if(c)o.push(quad(loc(c),0,'fill="#2b2c2e"'))}
  for(const d of sc.roads){const c=clip(roadBox(d));if(!c)continue;const r=loc(c),v=d.x1===d.x2;o.push(v?ln(r.x+r.w/2,r.y,r.x+r.w/2,r.y+r.h,0,'stroke="#ffd84a" stroke-width="1.5"'):ln(r.x,r.y+r.h/2,r.x+r.w,r.y+r.h/2,0,'stroke="#ffd84a" stroke-width="1.5"'));const[tx,ty]=v?Q(r.x+r.w/2,r.y+r.h*.8,0):Q(r.x+r.w*.8,r.y+r.h/2,0);top.push(`<text x="${tx}" y="${ty}" fill="#ffe27a" font-size="12" font-weight="700" font-family="sans-serif" paint-order="stroke" stroke="#000" stroke-width="3">${esc(d.name)}</text>`)}
  // Real-map geometry is projected whole and clipped to the street-level plate.
  const iso=pts=>pts.map(([x,y])=>P((x-W.x)/u,(y-W.y)/u,0)).join(' '),cut=[`<clipPath id="plate"><polygon points="${iso([[W.x,W.y],[W.x+W.w,W.y],[W.x+W.w,W.y+W.h],[W.x,W.y+W.h]])}"/></clipPath><g clip-path="url(#plate)">`];
  if(sc.osm){
    for(const z of sc.osm.green)cut.push(`<polygon points="${iso(z.pts)}" fill="${z.k==='beach'?'#cdb98a55':'#4f6b3a'}"/>`);
    for(const z of sc.osm.water)cut.push(`<polygon points="${iso(z.pts)}" fill="#2f5f73"/>`);
    for(const d of sc.osm.streets)cut.push(`<polyline points="${iso(d.pts)}" fill="none" stroke="#2b2c2e" stroke-width="${f1(d.w/u*s*.8)}" stroke-linejoin="round"/><polyline points="${iso(d.pts)}" fill="none" stroke="#ffd84a" stroke-width="1.5"/>`);
    const named=new Set();
    for(const d of sc.osm.streets){const on=d.pts.filter(([x,y])=>x>W.x&&x<W.x+W.w&&y>W.y&&y<W.y+W.h);if(!d.name||!on.length||named.has(d.name))continue;named.add(d.name);const[x,y]=on[on.length>>1],[tx,ty]=Q((x-W.x)/u,(y-W.y)/u,0);top.push(`<text x="${tx}" y="${ty}" fill="#ffe27a" font-size="12" font-weight="700" font-family="sans-serif" paint-order="stroke" stroke="#000" stroke-width="3">${esc(d.name)}</text>`)}
  }
  for(const m of[...L.lots,...sc.buildings.filter(k=>k.id!==b.id)]){const c=clip(m);if(c)cut.push(m.pts?`<polygon points="${iso(m.pts)}" fill="#5ee0e622" stroke="#5ee0e6" stroke-width=".8"/>`:quad(loc(c),0,'fill="#5ee0e622" stroke="#5ee0e6" stroke-width=".8"'))}
  o.push(cut.join('')+'</g>');
  const B=loc(b);
  const foot='fill="#d4a52a33" stroke="#f0c75a" stroke-width="2"';
  o.push(b.pts?`<polygon points="${iso(b.pts)}" ${foot}/>`:quad(B,0,foot));
  // Corner guides tie every floor back to its footprint on the street.
  for(const[x,y]of[[B.x,B.y],[B.x+B.w,B.y],[B.x+B.w,B.y+B.h],[B.x,B.y+B.h]])o.push(`<line x1="${Q(x,y,0)[0]}" y1="${Q(x,y,0)[1]}" x2="${Q(x,y,F*gap)[0]}" y2="${Q(x,y,F*gap)[1]}" stroke="#f0c75a66" stroke-dasharray="4 4"/>`);
  // Floor plans: double-loaded corridor along the long side, stair core and lift at one end, units either side.
  const long=B.w>=B.h,cw=1.6,core=2.6,dmg=b.status==='collapsed'?1:b.status==='partial'?.5:0;
  for(let f=1;f<=F;f++){
    const z=f*gap,dim=focus&&focus!==f,a=dim?.18:1,g=`<g opacity="${a}">`;
    const lines=[];
    const L2=(x1,y1,x2,y2,w=1.2)=>lines.push(ln(B.x+x1,B.y+y1,B.x+x2,B.y+y2,z,`stroke="#e9f6ff" stroke-width="${w}"`));
    const len=long?B.w:B.h,dep=long?B.h:B.w,c0=dep/2-cw/2,c1=dep/2+cw/2,A=(p,q)=>long?[p,q]:[q,p];
    lines.push(quad(B,z,`fill="#0b1a2470" stroke="#5ee0e6" stroke-width="2"`));
    L2(...A(core,c0),...A(len,c0));L2(...A(core,c1),...A(len,c1));
    for(let p=core+3.6;p<len-.5;p+=3.6){L2(...A(p,0),...A(p,c0),.8);L2(...A(p,c1),...A(p,dep),.8)}
    L2(...A(core,0),...A(core,dep));
    lines.push(quad({x:B.x+(long?.2:0),y:B.y+(long?0:.2),...(long?{w:core-.4,h:dep*.55}:{w:dep*.55,h:core-.4})},z,'fill="#f0c75a55" stroke="#f0c75a"'));
    const[sx,sy]=Q(B.x+(long?core/2:dep*.27),B.y+(long?dep*.27:core/2),z);lines.push(`<text x="${sx}" y="${sy}" fill="#f0c75a" font-size="10" font-weight="700" font-family="sans-serif" text-anchor="middle">STAIR</text>`);
    if(dmg&&(dmg===1||f>F/2))lines.push(quad({x:B.x+B.w*(long?.5:0),y:B.y+B.h*(long?0:.5),w:B.w*(long?.5:1),h:B.h*(long?1:.5)},z,'fill="#ff4d3d40" stroke="#ff4d3d" stroke-dasharray="5 3"'));
    const[lx,ly]=Q(B.x,B.y+B.h,z);
    lines.push(`<text x="${f1(lx-14)}" y="${f1(ly+4)}" fill="${dim?'#a1978a':'#f0c75a'}" font-size="14" font-weight="800" font-family="sans-serif" text-anchor="end">F${f}</text>`);
    if(!dim)for(const i of inds.filter(i=>i.building===b.id&&(i.floor||1)===f)){const[px,py]=Q((i.x-W.x)/u,(i.y-W.y)/u,z),c=LVL[lvl(i.strength)];top.push(`<circle cx="${px}" cy="${py}" r="11" fill="${c}" opacity=".35"/><circle cx="${px}" cy="${py}" r="5.5" fill="${c}" stroke="#fff" stroke-width="2"/><text x="${f1(px+10)}" y="${f1(py-9)}" fill="#fff" font-size="11" font-weight="700" font-family="sans-serif" paint-order="stroke" stroke="#000" stroke-width="3">${esc(i.short||i.note)}</text>`)}
    o.push(g+lines.join('')+'</g>');
  }
  o.push(...top);
  const[gx,gy]=Q(B.x,B.y+B.h,0);
  o.push(`<text x="${f1(gx-14)}" y="${f1(gy+4)}" fill="#f0c75a" font-size="12" font-weight="700" font-family="sans-serif" text-anchor="end" paint-order="stroke" stroke="#000" stroke-width="3">STREET LEVEL</text>`);
  o.push(`<text x="${vx+16}" y="${f1(H-14)}" fill="#a1978a" font-size="12" font-family="sans-serif">${esc(b.name)} · ${F} floors · pre-event plans (simulated) · SARA demo</text>`);
  if(sc.osm)o.push(`<text x="${vx+16}" y="${f1(H-32)}" fill="#a1978a" font-size="11" font-family="sans-serif">${esc(sc.osm.attribution)}</text>`);
  return`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vx} ${vy} ${vw} ${vh}">${o.join('')}</svg>`;
}
