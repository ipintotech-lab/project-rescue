import * as D from './draw.js';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const KEY='firstlight-v1',SKEY='firstlight-scenario-v1';
const get=k=>{try{return JSON.parse(localStorage.getItem(k))}catch{return null}};
const put=(k,v)=>{try{v==null?localStorage.removeItem(k):localStorage.setItem(k,JSON.stringify(v))}catch(e){console.warn('Storage unavailable',e)}};

const SRC={eo:'EO',thermal:'TH',co2:'CO₂',acoustic:'AC',canine:'K9',field:'FR'};
const SRCN={eo:'EO camera',thermal:'Thermal camera',co2:'CO₂ sensor',acoustic:'Acoustic · two-way mic',canine:'Canine team',field:'Field report'};
const LAYERS=[['l1','1','Pre-disaster aerial','Offline · loaded before departure',3],['l2','2','GIS & building plans','Roads, water, power, footprints',3],['l3','3','Drone photo','Baseline T+18 · refreshed via Starlink',4],['l4','4','Sensor indications','Source · time · strength',5],['l5','5','Digital twin','3D model of collapsed structures',6]];
const P2=[['score','Survivability score','AI suggestion · unverified · per structure'],['imsi','IMSI handset density','Regulatory approval pending'],['bio','Layer 6 · Biometric','Vital-sign sensing']];
const ROLES={owner:['Platform owner','Global','Everything','Approves access'],coord:['Incident coordinator','One event','The whole event','Resolves conflicts'],team:['SAR team','Its work area','The whole map','Adds data in its area only'],device:['Device','Its own team','No map','Sends to its own team']};
const MY='tfa';
// Evidence classes: what a sensor or image shows, what people on the ground report, and what is computed.
const CLS={obs:'Observed',hum:'Human report',ai:'AI suggestion'};
const EV={eo:'obs',thermal:'obs',co2:'obs',acoustic:'obs',canine:'hum',field:'hum'};
const cls=k=>`<span class="cls ${k}">${CLS[k]}</span>`;
const OV=[['sectors','Search sectors','Team work areas'],['hazards','Reported hazards','Human report · unverified'],['routes','Access routes','Human report · not verified safe']];
const SLOTS={before:'Layer 1 · pre-disaster',after:'Layer 3 · drone, top-down',drone:'Drone media · current scene'};
const VER={unverified:'Unverified',confirmed:'Confirmed by team',superseded:'Superseded'};

function invalid(s){
  if(!s||typeof s!=='object')return'Top level must be an object';
  for(const k of['steps','roads','buildings','teams','indications','conflicts','stations','hazards','c2','imsi'])if(!Array.isArray(s[k]))return`"${k}" must be an array`;
  if(s.steps.length!==7)return'"steps" needs exactly 7 entries';
  if(!s.epicenter||!s.site?.epicenter||!s.response)return'"epicenter", "site.epicenter" and "response" are required';
  for(const i of s.indications)if(!SRC[i.source])return`Indication ${i.id}: unknown source "${i.source}"`;
  return'';
}
const BASE=await(await fetch('scenario.json')).json();

// Uploaded imagery stays in this browser (IndexedDB) so it survives a reload; nothing is sent to the server.
const idb=(mode,fn)=>new Promise((ok,no)=>{const r=indexedDB.open('firstlight-media',1);r.onupgradeneeded=()=>r.result.createObjectStore('m');r.onerror=()=>no(r.error);r.onsuccess=()=>{const t=r.result.transaction('m',mode),q=fn(t.objectStore('m'));t.oncomplete=()=>ok(q.result);t.onerror=()=>no(t.error)}});
const M={};
for(const k of Object.keys(SLOTS)){const m=await idb('readonly',s=>s.get(k)).catch(e=>console.warn('Media storage unavailable',e));if(m)M[k]={...m,url:URL.createObjectURL(m.blob)}}
const saveMedia=k=>idb('readwrite',s=>{const m=M[k];return m?s.put({blob:m.blob,type:m.type,name:m.name,source:m.source,time:m.time,ver:m.ver},k):s.delete(k)}).catch(e=>{console.warn('Media storage unavailable',e);toast('Not kept after reload · storage unavailable')});
const imgOf=k=>M[k]?.url||sc.images?.[k];
const metaOf=k=>M[k]?`${M[k].source||'Source not set'} · ${M[k].time?'captured '+M[k].time:'capture time not set'} · ${VER[M[k].ver]}`:sc.images?.[k]?'Scenario file · capture time not set · Unverified':'Illustration · no imagery loaded · upload below the map';
let sc=get(SKEY),L,art,dirty=false;
if(invalid(sc))sc=BASE;
function build(){L=D.layout(sc);art={before:D.aerial(sc,L,false,imgOf('before')),after:D.aerial(sc,L,true,imgOf('after'))}}
build();

const defaults=i=>({l1:i>=3,l2:i===3,l3:i>=4,l4:i>=5,l5:i>=6});
const S={view:'national',step:0,role:'coord',phase:'all',resolved:{},approved:false,added:[],log:[],plan:{b:'b1',f:0},holo:false,...get(KEY),mode:'map',slider:50,src:new Set(Object.keys(SRC)),p2:{score:false,imsi:false,bio:false},refresh:0,sel:null,rtext:'',present:false,focus:false,ov:{sectors:true,hazards:true,routes:true}};
S.step=Math.max(0,Math.min(sc.steps.length-1,S.step|0));
S.layers=defaults(S.step);
const persist=()=>put(KEY,{view:S.view,step:S.step,role:S.role,phase:S.phase,resolved:S.resolved,approved:S.approved,added:S.added,log:S.log,plan:S.plan,holo:S.holo});

const now=()=>sc.steps[S.step].t;
const log=text=>S.log.push({t:now(),text});
const team=id=>sc.teams.find(t=>t.id===id);
const teams=()=>sc.teams.filter(t=>S.step>=t.joins&&(!t.pending||S.approved));
const allInds=()=>[...sc.indications,...S.added].filter(i=>i.step<=S.step);
const inds=()=>allInds().filter(i=>S.src.has(i.source));
const building=()=>sc.buildings.find(b=>b.id===S.plan.b)||sc.buildings[0];
function status(i){let s='active';for(const c of sc.conflicts){const k=S.resolved[c.id];if(k==null)continue;for(const e of c.options[k].effects)if(e.ind===i.id)s=e.status}return s}
let tt;const toast=m=>{const e=$('#toast');e.textContent=m;e.classList.add('on');clearTimeout(tt);tt=setTimeout(()=>e.classList.remove('on'),2600)};
const download=(name,blob)=>{const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)};
const locked=m=>`<div class="locked"><span>LOCKED</span><p>${esc(m)}</p></div>`;

function setStep(i){
  i=Math.max(0,Math.min(sc.steps.length-1,i));if(i===S.step)return;
  S.step=i;S.layers=defaults(i);S.view=sc.steps[i].view;S.sel=null;if(i<5)S.refresh=0;
  render();
}
function restart(){Object.assign(S,{step:0,layers:defaults(0),view:'national',resolved:{},approved:false,added:[],log:[],sel:null,refresh:0,mode:'map'});render()}

function render(){
  const st=sc.steps[S.step];
  document.body.classList.toggle('present',S.present);document.body.classList.toggle('focus',S.focus);document.body.classList.toggle('holo',S.holo);
  $('#present').textContent=S.present?'Exit present':'Present';$('#holo').classList.toggle('on',S.holo);
  $$('#nav button').forEach(b=>b.classList.toggle('on',b.dataset.view===S.view));
  $$('.view').forEach(v=>v.hidden=v.id!=='v-'+S.view);
  const net=S.step===0?['Standby','']:S.step<5?['Offline · local only','off']:['Starlink connected','on'];
  $('#net').textContent=net[0];$('#net').className='chip '+net[1];
  $('#role').value=S.role;
  $('#stepper').innerHTML=sc.steps.map((s,i)=>`<button data-step="${i}" class="${i===S.step?'on':i<S.step?'done':''}"><i>${i}</i><b>${esc(s.title)}</b><small>${esc(s.t)}</small></button>`).join('');
  $('#nhead').textContent=st.head;$('#ntext').textContent=st.text;
  $('#prev').disabled=S.step===0;$('#next').disabled=S.step===sc.steps.length-1;
  ({national:renderNational,event:renderEvent,teams:renderTeams,scenario:renderScenario})[S.view]();
  persist();
}

function renderNational(){
  const n=p=>sc.stations.filter(s=>p==='all'||s.phase===p);
  const units=p=>n(p).reduce((a,s)=>a+s.units,0);
  $('#usmap').innerHTML=D.usMap(sc,{phase:S.phase,step:S.step});
  $('#phases').innerHTML=['all',...new Set(sc.stations.map(s=>s.phase))].map(p=>`<button data-phase="${esc(p)}" class="${S.phase===p?'on':''}">${p==='all'?'All phases':esc(p)}<b>${units(p)} units</b></button>`).join('');
  $('#natstats').innerHTML=[[units(S.phase),'drone units'],[n(S.phase).length,'stations'],[sc.c2.length,'remote-pilot C2 centers'],['60 min','to any disaster zone']].map(([a,b])=>`<div class="big"><b>${esc(a)}</b><span>${b}</span></div>`).join('');
  const r=sc.reports;$('#natrep').innerHTML=r&&S.step>=r.step?`<h3>${esc(r.title)}</h3>${r.items.map(i=>`<div class="big rep"><b>${esc(i.n)}</b><span>${esc(i.what)}</span><small>${esc(i.src)}</small></div>`).join('')}<p class="hint">${esc(r.note)} ${esc(r.via)}.</p>`:'';
}

function renderEvent(){
  renderKpis();
  $('#devmask').hidden=S.role!=='device';
  $$('#modes [data-mode]').forEach(b=>b.classList.toggle('on',b.dataset.mode===S.mode));
  $('#stage').hidden=S.mode!=='map';$('#plans').hidden=S.mode!=='plans';$('#twin').hidden=S.mode!=='twin';$('#drone').hidden=S.mode!=='drone';
  $('#focus').textContent=S.focus?'Exit focus':'Focus imagery';
  $('#planctl').innerHTML=S.mode==='plans'&&S.step>=3?planCtl():'';
  $('#live').textContent=S.step>=5?`● LIVE · imagery refresh #${1+S.refresh}`:'';
  $('#mapdata').hidden=S.mode!=='map';if(S.mode==='map')$('#mapdata').innerHTML=mapData();
  ({map:renderMap,plans:renderPlans,twin:renderTwin,drone:renderDrone})[S.mode]();
  renderRail();
}

function renderKpis(){
  const st=S.step;
  $('#kpis').innerHTML=[['First aerial picture',st>=4?'18 min':'—'],['Indications fused',allInds().length],['Teams on the map',teams().length],['Imagery refreshes',st>=5?1+S.refresh:0],['Area imaged',sc.steps[st].area]].map(([a,b])=>`<div><b>${esc(b)}</b><span>${a}</span></div>`).join('');
}

const grid=()=>`<rect width="1000" height="600" fill="#15120d"/><g stroke="#2a241b">${Array.from({length:21},(_,i)=>`<line x1="${i*50}" y1="0" x2="${i*50}" y2="600"/>`).join('')}${Array.from({length:13},(_,i)=>`<line x1="0" y1="${i*50}" x2="1000" y2="${i*50}"/>`).join('')}</g>`;
const pin=i=>`<g class="pin ${EV[i.source]} ${D.lvl(i.strength)} ${status(i)}${S.sel===i.id?' sel':''}" data-id="${i.id}" transform="translate(${i.x} ${i.y})"><circle r="14"/><text y="4">${SRC[i.source]}</text></g>`;

function renderMap(){
  const st=S.step,Ly=S.layers,both=Ly.l1&&Ly.l3&&st>=4;
  let h=D.defs;
  if(st<3||!(Ly.l1||Ly.l3&&st>=4))h+=grid()+(st<2?'<text class="blank" x="500" y="300" text-anchor="middle">No active event</text>':`<rect x="20" y="20" width="960" height="560" fill="none" stroke="#d4a52a" stroke-width="2" stroke-dasharray="12 8"/><text class="blank" x="500" y="290" text-anchor="middle">Event boundary set · working offline</text><text class="blank s" x="500" y="318" text-anchor="middle">${st<3?'Preloaded layers open at step 3':'All image layers are hidden'}</text>`);
  else{
    // HUD style tints the aerial; Focus imagery keeps true colour.
    const tint=S.holo&&!S.focus?' filter="url(#hudtint)"':'';
    if(Ly.l1)h+=`<g${tint}>${art.before}</g>`;
    if(Ly.l3&&st>=4)h+=`<g${both?' clip-path="url(#clipBefore)"':''}><g${tint}>${art.after}</g></g>`;
    if(S.holo)h+=D.wire(sc,L);
  }
  if(Ly.l2&&st>=3)h+=D.gis(sc,L);
  if(Ly.l3&&st>=4)h+=D.change(sc);
  if(st>=6&&S.ov.sectors)h+=D.areas(teams());
  if(st>=6&&sc.field)h+=D.field({hazards:sc.field.hazards.filter(x=>x.step<=st),routes:sc.field.routes.filter(x=>x.step<=st)},S.ov);
  if(Ly.l4&&st>=5){const v=inds();h+=`<g class="heat">${D.heat(v.filter(i=>status(i)==='active'||status(i)==='priority'))}</g>`+v.map(pin).join('')}
  if(st>=6)h+=sc.conflicts.filter(c=>c.step<=st&&S.resolved[c.id]==null).map(c=>`<g class="cf" data-cf="${c.id}" transform="translate(${c.x} ${c.y})"><title>${esc(c.title)}</title><circle r="13"/><text y="6">!</text></g>`).join('');
  h+=D.p2(sc,S.p2);
  if(sc.osm&&st>=3&&(Ly.l1||Ly.l2||Ly.l3))h+=`<text class="attr" x="994" y="592" text-anchor="end">${esc(sc.osm.attribution)}</text>`;
  // Every image side is captioned with its source, capture time and verification status.
  const cap=(x,a,k,title)=>`<text class="cmp" x="${x}" y="24" text-anchor="${a}">${title}</text><text class="cmp s${imgOf(k)?'':' ph'}" x="${x}" y="42" text-anchor="${a}">${esc(metaOf(k))}</text>`;
  const t1='LAYER 1 · PRE-DISASTER',t3=`LAYER 3 · DRONE ${st>=5?'· LIVE':'T+18'}`;
  if(st>=3)h+=both?cap(14,'start','before',t1)+cap(986,'end','after',t3):Ly.l3&&st>=4?cap(14,'start','after',t3):Ly.l1?cap(14,'start','before',t1):'';
  if(both)h+=`<g id="divider"><line x1="0" x2="0" y1="0" y2="600"/><circle cy="300" r="15"/><text y="305" text-anchor="middle">⇔</text></g>`;
  $('#map').innerHTML=h;
  $('#slider').hidden=!both;
  $('#p2banner').hidden=!(S.p2.score||S.p2.imsi||S.p2.bio);
  $('#bio').hidden=!S.p2.bio;
  if(both)setSlider();
  pop();
}
function setSlider(){const x=S.slider*10,r=$('#clipRect');if(!r)return;r.setAttribute('x',x);r.setAttribute('width',1000-x);$('#divider')?.setAttribute('transform',`translate(${x} 0)`)}

function pop(){
  const p=$('#pop'),i=allInds().find(i=>i.id===S.sel);
  if(!i||S.mode!=='map'){p.hidden=true;return}
  const b=sc.buildings.find(b=>b.id===i.building),s=status(i),f=i.floor||1;
  p.innerHTML=`<button class="x" data-close aria-label="Close">×</button><div class="src ${D.lvl(i.strength)}">${SRC[i.source]} · ${esc(SRCN[i.source])}</div><p>${esc(i.note)}</p><dl><dt>Evidence</dt><dd>${cls(EV[i.source])}</dd><dt>Time</dt><dd>${esc(i.time)}</dd><dt>Strength</dt><dd>${Math.round(i.strength*100)}%</dd><dt>Source team</dt><dd>${esc(team(i.team)?.name)}</dd>${b?`<dt>Location</dt><dd>${esc(b.name)} · floor ${f}</dd>`:''}${s!=='active'?`<dt>Status</dt><dd class="stt">${s}</dd>`:''}</dl>${b?`<button class="btn" data-plan="${b.id}" data-floor="${f}">Open building plans · floor ${f}</button>`:''}`;
  p.style.left=Math.min(i.x/10,68)+'%';p.style.top=Math.min(i.y/6,52)+'%';p.hidden=false;
}

function planCtl(){
  const b=building();if(S.plan.f>b.floors)S.plan.f=0;
  return`<select id="pb" aria-label="Building">${sc.buildings.map(x=>`<option value="${x.id}"${x.id===b.id?' selected':''}>${esc(x.name)} · ${x.floors} fl</option>`).join('')}</select><span class="fl">${['All floors',...Array.from({length:b.floors},(_,i)=>'F'+(i+1))].map((t,i)=>`<button data-floor="${i}" class="${S.plan.f===i?'on':''}">${t}</button>`).join('')}</span><button id="ppng" class="btn ghost">Save PNG</button><button id="psvg" class="btn ghost">Save SVG</button>`;
}
function mapData(){
  const st=S.step,seen=st>=4,v=allInds(),on=teams(),open=sc.conflicts.filter(c=>c.step<=st&&S.resolved[c.id]==null).length;
  const hit=b=>seen&&b.status!=='standing',inArea=a=>sc.buildings.filter(b=>{const x=b.x+b.w/2,y=b.y+b.h/2;return x>=a[0]&&x<=a[0]+a[2]&&y>=a[1]&&y<=a[1]+a[3]});
  const stats=[[seen?sc.buildings.length:'–','Structures mapped'],[seen?sc.buildings.filter(hit).length:'–','Collapsed or damaged'],[st>=5?v.filter(i=>i.strength>=.7).length:'–','Strong indications ≥70%'],[on.length,'Teams on the map'],[open,'Open conflicts']];
  const rows=sc.teams.map(t=>{
    const area=t.area?inArea(t.area):null,n=v.filter(i=>i.team===t.id).length;
    const stt=st<t.joins?'<em>Not joined</em>':t.pending&&!S.approved?'<span class="partial">Pending approval</span>':'<em class="ok">On the map</em>';
    return`<tr><td><b style="color:${esc(t.color)}">■</b> <b>${esc(t.name)}</b>${S.role==='team'&&t.id===MY?' <span class="sc">you</span>':''}</td><td>${esc(t.type)}</td><td>${area?area.map(b=>`<span class="${hit(b)?b.status:''}">${esc(b.name)}</span>`).join(', ')||'Open ground':'Whole event'}</td><td>${st>=5?n:'–'}</td><td>${stt}</td></tr>`;
  }).join('');
  return`<div class="tdata">${mediaTable(['before','after'])}<p class="hint">Before/after images must be top-down, north up and cropped to the mapped area (600 × 360 m) so footprints, sectors and routes line up. Oblique photos and video go in Drone media.</p>${sc.buildings.some(b=>b.sv)?`<p class="hint">Street View · pre-event: ${sc.buildings.map(b=>svLink(b,esc(b.id.toUpperCase()))).join(' ')}</p>`:''}<div class="tstats" style="grid-template-columns:repeat(${stats.length},1fr)">${stats.map(([v,l])=>`<div><b>${v}</b><span>${l}</span></div>`).join('')}</div><table><thead><tr><th>Team</th><th>Type</th><th>Work area</th><th>Indications</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}
// Google Street View still shows these streets before the earthquake; linked out, never embedded.
const svUrl=b=>b.sv&&`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${b.sv.lat},${b.sv.lon}&heading=${b.sv.heading}`;
const svLink=(b,t)=>b.sv?`<a class="sv" href="${esc(svUrl(b))}" target="_blank" rel="noopener" title="Opens Google Maps Street View · imagery from before the earthquake">${t} ↗</a>`:'';
const DMG={collapsed:'Collapsed',partial:'Partial collapse',damaged:'Damaged',standing:'No visible collapse'};
function plansData(b){
  const st=S.step,pre=st>=3,seen=st>=4,live=st>=5,F=b.floors,units=pre?Math.max(2,Math.round(Math.max(b.w,b.h)/40))*2:null;
  const ins=live?allInds().filter(i=>i.building===b.id):[];
  const cond=f=>!seen?'<em>Awaiting baseline</em>':b.status==='collapsed'?'<span class="collapsed">Collapsed · half footprint</span>':b.status==='partial'?(f>F/2?'<span class="partial">Partial collapse</span>':'<span class="standing">No visible collapse</span>'):b.status==='damaged'?'<span class="damaged">Damaged</span>':'<span class="standing">No visible collapse</span>';
  const rows=Array.from({length:F},(_,k)=>F-k).map(f=>{
    const v=ins.filter(i=>(i.floor||1)===f),max=Math.max(0,...v.map(i=>i.strength));
    const pri=!live?'–':max>=.7?'<b class="collapsed">High</b>':v.length?'<span class="partial">Medium</span>':'<em>Low</em>';
    return`<tr data-pf="${f}" class="${S.plan.f===f?'on':''}"><td><b>F${f}</b></td><td>${units??'–'}</td><td>${cond(f)}</td><td>${live?(v.length?v.map(i=>`<span class="sc ${D.lvl(i.strength)}" title="${esc(i.note)}">${SRC[i.source]} ${Math.round(i.strength*100)}%</span>`).join(' '):'0'):'–'}</td><td>${pri}</td></tr>`;
  }).join('');
  const stats=[[F,'Floors'],[units?units*F:'–','Units (pre-event plans)'],[seen?DMG[b.status]||esc(b.status):'–','Damage'],[live?ins.length:'–','Indications'],...(S.p2.score?[[esc(b.score),'P2 · AI suggestion · survivability']]:[])];
  return`<div class="tdata"><div class="tstats" style="grid-template-columns:repeat(${stats.length},1fr)">${stats.map(([v,l])=>`<div><b>${v}</b><span>${l}</span></div>`).join('')}</div><table><thead><tr><th>Floor</th><th>Units</th><th>Condition</th><th>Indications</th><th title="Computed from sensor and field indications, not from imagery">Search priority ${cls('ai')}</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}
function renderPlans(){
  const el=$('#plans'),b=building();
  if(S.step<3){el.innerHTML=`<div class="cap"><b>Layered building plans · ${esc(b.name)}</b> · ${svLink(b,'Street View · pre-event')} · <span class="lk">LOCKED</span> plans preload with Layer 2 at step 3 · Preload data</div>`+plansData(b);return}
  const show=S.layers.l4&&S.step>=5;
  el.innerHTML=`<div class="cap"><b>Layered building plans · ${esc(b.name)}</b> · ${svLink(b,'Street View · pre-event')} · street plan at the base, each floor stacked above it · ${show?'sensor indications placed by floor':'indications appear with Layer 4 (step 5)'}</div>`+D.plans(sc,L,b,show?inds():[],S.plan.f)+plansData(b);
}
function savePlan(png){
  const s=$('#plans svg');if(!s)return;
  const name=`${building().id}-layered-plans${S.plan.f?'-F'+S.plan.f:''}`,svg=new Blob([s.outerHTML],{type:'image/svg+xml'});
  if(!png)return download(name+'.svg',svg);
  const vb=s.viewBox.baseVal,img=new Image(),url=URL.createObjectURL(svg);
  img.onload=()=>{const c=document.createElement('canvas');c.width=vb.width*2;c.height=vb.height*2;c.getContext('2d').drawImage(img,0,0,c.width,c.height);URL.revokeObjectURL(url);c.toBlob(b=>download(name+'.png',b))};
  img.onerror=()=>{URL.revokeObjectURL(url);toast('PNG export failed · use Save SVG')};
  img.src=url;
}

function twinData(){
  const st=S.step,passes=[0,0,0,0,1,3,6][st],base=[0,0,0,0,35,75,100][st],all=allInds();
  const stats=[[passes,'Drone passes'],[passes*148,'Aerial photos'],[(passes*.8).toFixed(1)+'M','3D points'],[sc.steps[st].area,'Area imaged']];
  const rows=sc.buildings.map((b,i)=>{
    const pct=st>=6?100:Math.max(0,base-i*6),n=st>=5?all.filter(x=>x.building===b.id).length:null;
    const tw=pct>=100?'<em class="ok">Ready</em>':pct?`<span class="bar"><i style="width:${pct}%"></i></span>${pct}%`:'<em>Queued</em>';
    return`<tr${st>=3?` data-plan="${b.id}" data-floor="0" title="Open building plans"`:''}><td><b>${esc(b.name)}</b></td><td>${b.floors}</td><td class="${st>=4?b.status:''}">${st>=4?DMG[b.status]||esc(b.status):'Awaiting baseline'}</td><td>${n??'–'}</td><td>${tw}</td></tr>`;
  }).join('');
  return`<div class="tdata"><div class="tstats">${stats.map(([v,l])=>`<div><b>${v}</b><span>${l}</span></div>`).join('')}</div><table><thead><tr><th>Structure</th><th>Floors</th><th>Damage</th><th>Indications</th><th>Twin model</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}
function renderTwin(){
  const el=$('#twin');
  if(!S.layers.l5){el.innerHTML=`<div class="cap"><b>Layer 5 · Digital twin</b> · <span class="lk">LOCKED</span> ${S.step<6?'opens at step 6 · Teams join · model builds as drone passes come in':'turn on Layer 5 to show the 3D model'}</div>`+twinData();return}
  const b=sc.buildings.find(b=>sc.indications.some(i=>i.twin&&i.building===b.id));
  el.innerHTML=`<div class="cap"><b>Layer 5 · Digital twin${b?' · '+esc(b.name):''}</b> · rebuilt from drone passes · sensor indications placed in 3D</div><svg viewBox="0 -10 1000 610">${D.twin(inds())}</svg>`+twinData();
}

function mediaTable(keys){
  const row=k=>{const m=M[k];return`<tr><td><b>${SLOTS[k]}</b><small>${m?esc(m.name):'Illustration · no imagery loaded'}</small></td>${m?`<td><input data-meta="source" data-k="${k}" value="${esc(m.source)}" placeholder="Who captured it" aria-label="Source"></td><td><input data-meta="time" data-k="${k}" value="${esc(m.time)}" placeholder="e.g. 25 Jun 10:40 local" aria-label="Capture time"></td><td><select data-meta="ver" data-k="${k}" aria-label="Verification">${Object.entries(VER).map(([v,l])=>`<option value="${v}"${m.ver===v?' selected':''}>${l}</option>`).join('')}</select></td><td class="act"><button class="btn ghost" data-up="${k}">Replace</button> <button class="link" data-rm="${k}">Remove</button></td>`:`<td colspan="3"><em>No imagery loaded</em></td><td class="act"><button class="btn" data-up="${k}">Upload</button></td>`}</tr>`};
  return`<table class="media-t"><thead><tr><th>Imagery ${cls('obs')}</th><th>Source</th><th>Captured</th><th>Verification</th><th></th></tr></thead><tbody>${keys.map(row).join('')}</tbody></table>`;
}
function renderDrone(){
  const m=M.drone,el=$('#drone');
  const ph=msg=>`<div class="media ph"><b>${msg}</b><p>Upload a photo or video from your own flights. It stays in this browser.</p><button class="btn" data-up="drone">Upload image or video</button></div>`;
  el.innerHTML=`<div class="cap"><b>Drone media · current scene</b> · oblique photo or video, shown without map overlays · ${m?esc(metaOf('drone')):'no media loaded'}</div>`+(m?`<div class="media">${m.type.startsWith('video/')?`<video src="${m.url}" controls muted playsinline></video>`:`<img src="${m.url}" alt="${esc(m.source||'Uploaded drone image')}">`}</div>`:ph('No drone media loaded'))+`<div class="tdata">${mediaTable(['drone'])}<p class="hint">Imagery shows what is visible. It does not confirm trapped people, safe routes or structural stability; teams verify on the ground.</p></div>`;
  el.querySelector('.media img,.media video')?.addEventListener('error',()=>{el.querySelector('.media').outerHTML=ph('This file could not be loaded')});
}

function renderRail(){
  const st=S.step,v=inds();
  let h='<h3>Layers</h3>'+LAYERS.map(([k,n,name,sub,from])=>{const lock=st<from;return`<label class="ly${lock?' lock':''}"><input type="checkbox" data-layer="${k}"${S.layers[k]?' checked':''}${lock?' disabled':''}><i>${n}</i><span><b>${name}</b><small>${lock?'Available from step '+from:sub}</small></span></label>`}).join('');
  h+=`<h3>Overlays <em>${st<6?'from step 6':'human reports'}</em></h3>`+OV.map(([k,name,sub])=>{const lock=st<6;return`<label class="ly${lock?' lock':''}"><input type="checkbox" data-ov="${k}"${S.ov[k]?' checked':''}${lock?' disabled':''}><i>${k[0].toUpperCase()}</i><span><b>${name}</b><small>${sub}</small></span></label>`}).join('');
  h+=`<h3>Evidence</h3><ul class="ev"><li>${cls('obs')}<span>Sensor or imagery · EO, TH, CO₂, AC, damage outlines</span></li><li>${cls('hum')}<span>Teams on the ground · K9, FR, hazards, routes</span></li><li>${cls('ai')}<span>Computed, unverified · search priority, P2 score</span></li></ul>`;
  h+='<h3>Phase 2 preview <em>not in Phase 1</em></h3>'+P2.map(([k,name,sub])=>`<label class="ly p2"><input type="checkbox" data-p2="${k}"${S.p2[k]?' checked':''}><i>P2</i><span><b>${name}</b><small>${sub}</small></span></label>`).join('');
  h+=`<h3>Sources</h3><div class="chips">${Object.entries(SRC).map(([k,c])=>`<button data-src="${k}" class="${S.src.has(k)?'on':''}" title="${SRCN[k]}">${c}</button>`).join('')}</div>`;
  if(S.role==='team'&&st>=6)h+=`<h3>Field report · Task Force A</h3><input id="rtext" placeholder="e.g. Voices under the stairwell" maxlength="80" value="${esc(S.rtext)}"><p class="hint">Then click inside your work area on the map.</p>`;
  h+=`<h3>Indications <em>${st>=5?v.length:0}</em></h3>`+(st<5||!S.layers.l4?`<p class="hint">${st<5?'Sensor indications arrive once Starlink connects (step 5).':'Layer 4 is hidden.'}</p>`:`<ol class="inds">${[...v].sort((a,b)=>b.strength-a.strength).map(i=>`<li data-sel="${i.id}" class="${D.lvl(i.strength)} ${status(i)}${S.sel===i.id?' on':''}"><i>${SRC[i.source]}</i><span><b>${esc(i.short||i.note)}</b><small>${CLS[EV[i.source]]} · ${esc(i.time)} · ${Math.round(i.strength*100)}% · ${esc(team(i.team)?.name)}</small></span></li>`).join('')}</ol>`);
  $('#rail').innerHTML=h;
}

function renderTeams(){
  const st=S.step,can=S.role==='coord',cs=sc.conflicts.filter(c=>c.step<=st);
  $('#roles').innerHTML=`<table><thead><tr><th>Role</th><th>Scope</th><th>Can view</th><th>Can change</th></tr></thead><tbody>${Object.entries(ROLES).map(([k,r])=>`<tr class="${S.role===k?'on':''}">${r.map(c=>`<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  $('#conflicts').innerHTML=!cs.length?'<p class="hint">No conflicts yet. They appear when teams join (step 6).</p>':cs.map(c=>{const k=S.resolved[c.id];return`<div class="cfc${k!=null?' done':''}"><b>${esc(c.title)}</b><div class="vs"><div><small>${esc(team(c.a.team)?.name)}</small>${esc(c.a.claim)}</div><div><small>${esc(team(c.b.team)?.name)}</small>${esc(c.b.claim)}</div></div>${k!=null?`<p class="res">Resolved by the coordinator: ${esc(c.options[k].label)} · <button class="link" data-undo="${c.id}">undo</button></p>`:`<div class="opts">${c.options.map((o,j)=>`<button class="btn" data-resolve="${c.id}" data-opt="${j}"${can?'':' disabled'}>${esc(o.label)}</button>`).join('')}</div>${can?'':'<p class="hint">Only the incident coordinator resolves conflicts.</p>'}`}</div>`}).join('');
  $('#teamlist').innerHTML=sc.teams.map(t=>`<li style="--c:${esc(t.color)}"><i></i><span><b>${esc(t.name)}</b><small>${esc(t.type)}</small></span>${st<t.joins?'<em>Not joined</em>':!t.pending||S.approved?'<em class="ok">On the map</em>':S.role==='owner'?'<button class="btn" data-approve>Approve access</button>':'<em class="pend">Pending · owner approves</em>'}</li>`).join('');
  $('#log').innerHTML=[...sc.steps.slice(1,S.step+1).map(s=>({t:s.t,text:`${s.title} · ${s.head}`})),...S.log].map(l=>`<li><b>${esc(l.t)}</b>${esc(l.text)}</li>`).join('')||'<li class="hint">Standby. No event yet.</li>';
}

function renderScenario(){if(!dirty)$('#json').value=JSON.stringify(sc,null,2)}

// Events
$('#nav').addEventListener('click',e=>{const b=e.target.closest('[data-view]');if(b){S.view=b.dataset.view;S.sel=null;render()}});
$('#stepper').addEventListener('click',e=>{const b=e.target.closest('[data-step]');if(b)setStep(+b.dataset.step)});
$('#prev').onclick=()=>setStep(S.step-1);
$('#next').onclick=()=>setStep(S.step+1);
$('#role').onchange=e=>{S.role=e.target.value;S.sel=null;toast('Viewing as '+e.target.selectedOptions[0].text);render()};
$('#present').onclick=()=>togglePresent();
$('#holo').onclick=()=>toggleHolo();
$('#phases').addEventListener('click',e=>{const b=e.target.closest('[data-phase]');if(b){S.phase=b.dataset.phase;renderNational();persist()}});
$('#modes').addEventListener('click',e=>{
  const m=e.target.closest('[data-mode]'),f=e.target.closest('[data-floor]');
  if(m){S.mode=m.dataset.mode;S.sel=null;renderEvent()}
  else if(f){S.plan.f=+f.dataset.floor;renderEvent();persist()}
  else if(e.target.id==='ppng'||e.target.id==='psvg')savePlan(e.target.id==='ppng');
  else if(e.target.id==='focus'){S.focus=!S.focus;render()}
});
$('#modes').addEventListener('change',e=>{if(e.target.id==='pb'){S.plan={b:e.target.value,f:0};renderEvent();persist()}});
$('#slider').oninput=e=>{S.slider=+e.target.value;setSlider()};
$('#map').addEventListener('click',e=>{
  const g=e.target.closest('[data-id]'),c=e.target.closest('[data-cf]');
  if(g){S.sel=g.dataset.id;renderMap();renderRail();return}
  if(c){S.view='teams';render();return}
  if(S.role==='team'&&S.step>=6){
    const s=$('#map'),p=s.createSVGPoint();p.x=e.clientX;p.y=e.clientY;
    const{x,y}=p.matrixTransform(s.getScreenCTM().inverse()),[ax,ay,aw,ah]=team(MY).area;
    if(x<ax||x>ax+aw||y<ay||y>ay+ah)return toast('Outside your work area · Task Force A adds data only inside its area');
    const b=sc.buildings.find(b=>x>=b.x&&x<=b.x+b.w&&y>=b.y&&y<=b.y+b.h),txt=S.rtext.trim()||'Field report';
    const i={id:'r'+Date.now(),step:S.step,team:MY,source:'field',strength:.6,time:now(),x:Math.round(x),y:Math.round(y),building:b?.id,floor:1,short:txt.slice(0,28),note:txt};
    S.added.push(i);S.sel=i.id;S.rtext='';log(`Task Force A added a field report${b?' at '+b.name:''}: ${txt}`);toast('Field report shared with every team');render();return;
  }
  if(S.sel){S.sel=null;pop();renderRail()}
});
$('#pop').addEventListener('click',e=>{
  if(e.target.closest('[data-close]')){S.sel=null;pop();renderRail()}
  const b=e.target.closest('[data-plan]');
  if(b){S.mode='plans';S.plan={b:b.dataset.plan,f:+b.dataset.floor};S.sel=null;renderEvent();persist()}
});
$('#plans').addEventListener('click',e=>{
  const r=e.target.closest('[data-pf]');
  if(r){const f=+r.dataset.pf;S.plan.f=S.plan.f===f?0:f;renderEvent();persist()}
});
$('#twin').addEventListener('click',e=>{
  const r=e.target.closest('[data-plan]');
  if(r){S.mode='plans';S.plan={b:r.dataset.plan,f:0};renderEvent();persist()}
});
$('#rail').addEventListener('change',e=>{
  const t=e.target;
  if(t.dataset.layer){S.layers[t.dataset.layer]=t.checked;renderEvent()}
  else if(t.dataset.p2){S.p2[t.dataset.p2]=t.checked;renderEvent()}
  else if(t.dataset.ov){S.ov[t.dataset.ov]=t.checked;renderEvent()}
});
$('#rail').addEventListener('input',e=>{if(e.target.id==='rtext')S.rtext=e.target.value});
$('#rail').addEventListener('click',e=>{
  const s=e.target.closest('[data-src]'),i=e.target.closest('[data-sel]');
  if(s){const k=s.dataset.src;S.src.has(k)?S.src.delete(k):S.src.add(k);renderEvent()}
  else if(i){S.sel=i.dataset.sel;S.mode='map';renderEvent()}
});
$('#v-teams').addEventListener('click',e=>{
  const r=e.target.closest('[data-resolve]'),u=e.target.closest('[data-undo]');
  if(r){const c=sc.conflicts.find(c=>c.id===r.dataset.resolve),k=+r.dataset.opt;S.resolved[c.id]=k;log(`Coordinator resolved "${c.title}": ${c.options[k].label}`);toast('Decision pushed to every team');render()}
  else if(u){delete S.resolved[u.dataset.undo];render()}
  else if(e.target.closest('[data-approve]')){S.approved=true;log('Platform owner approved access for Mutual-aid USAR · Nevada');toast('Access approved · team joins the shared map');render()}
});
// Imagery upload, metadata and removal (map data panel and drone panel)
$('#v-event').addEventListener('click',e=>{
  const u=e.target.closest('[data-up]'),r=e.target.closest('[data-rm]');
  if(u){const f=$('#upfile');f.dataset.k=u.dataset.up;f.accept=u.dataset.up==='drone'?'image/*,video/*':'image/*';f.click()}
  else if(r){const k=r.dataset.rm;URL.revokeObjectURL(M[k].url);delete M[k];saveMedia(k);if(k!=='drone')build();renderEvent();toast('Imagery removed · placeholder shown')}
});
$('#v-event').addEventListener('change',e=>{
  const t=e.target.closest('[data-meta]');if(!t)return;
  M[t.dataset.k][t.dataset.meta]=t.value;saveMedia(t.dataset.k);
  if(S.mode==='map')renderMap();else $('#drone .cap').innerHTML=`<b>Drone media · current scene</b> · oblique photo or video, shown without map overlays · ${esc(metaOf('drone'))}`;
});
$('#upfile').onchange=e=>{
  const f=e.target.files[0],k=e.target.dataset.k;e.target.value='';if(!f)return;
  if(!(f.type.startsWith('image/')||k==='drone'&&f.type.startsWith('video/')))return toast(k==='drone'?'Use an image or video file':'Use an image file');
  if(M[k])URL.revokeObjectURL(M[k].url);
  M[k]={blob:f,type:f.type,name:f.name,source:'',time:'',ver:'unverified',url:URL.createObjectURL(f)};
  saveMedia(k);if(k!=='drone')build();renderEvent();toast('Loaded · add the source and capture time');
};
$('#json').oninput=()=>{dirty=true;$('#jmsg').textContent='Unsaved changes'};
$('#jsave').onclick=()=>{
  let o;try{o=JSON.parse($('#json').value)}catch(e){$('#jmsg').textContent='Invalid JSON: '+e.message;return}
  const err=invalid(o);if(err){$('#jmsg').textContent=err;return}
  sc=o;put(SKEY,o);build();dirty=false;$('#jmsg').textContent='Saved in this browser';render();
};
$('#jexport').onclick=()=>download('scenario.json',new Blob([$('#json').value],{type:'application/json'}));
$('#jreset').onclick=()=>{sc=BASE;put(SKEY,null);build();dirty=false;$('#jmsg').textContent='Reset to the default scenario';render()};

function toggleHolo(){S.holo=!S.holo;persist();render()}
function togglePresent(){S.present=!S.present;if(S.present)restart();else render()}
document.addEventListener('keydown',e=>{
  if(e.target.closest('input,textarea,select'))return;
  const k=e.key;
  if(k==='ArrowRight'||k==='PageDown'||k===' '){e.preventDefault();setStep(S.step+1)}
  else if(k==='ArrowLeft'||k==='PageUp'){e.preventDefault();setStep(S.step-1)}
  else if(k==='Home')restart();
  else if(k==='p'||k==='P')togglePresent();
  else if(k==='h'||k==='H')toggleHolo();
  else if(k==='f'||k==='F'){if(document.fullscreenElement)document.exitFullscreen();else document.documentElement.requestFullscreen().catch(()=>toast('Fullscreen is not available here'))}
  else if(k==='Escape'){if(S.present){S.present=false;render()}else if(S.sel){S.sel=null;pop();renderRail()}}
});

// Simulated Starlink refresh while connected
setInterval(()=>{
  if(S.step<5)return;
  S.refresh++;
  if(S.view==='event'){renderKpis();$('#live').textContent=`● LIVE · imagery refresh #${1+S.refresh}`}
  const n=$('#net');n.classList.remove('pulse');void n.offsetWidth;n.classList.add('pulse');
},15000);

render();
