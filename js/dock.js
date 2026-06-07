"use strict";
import {state, WNAME, FAMILY} from './state.js';
import {scheduleDraw, invalidateRotCache, getRotated} from './draw.js';
import {invalidateAdjCache, generateFilterThumbs, COLOR_FILTERS} from './filters.js';
import {pushHistory} from './history.js';
import {enterCrop} from './crop.js';
import {enterMarkup} from './markup.js';

const $=id=>document.getElementById(id);
export let curTool=null, trackW=0;
const STRIP=1400;
export let chipEls={};

export function toast(msg){const t=$('toast');t.textContent=msg;t.classList.add('show');clearTimeout(t._t);t._t=setTimeout(()=>t.classList.remove('show'),2400);}

function adjFmt(v){const d=Math.round(v)-100;return d===0?'±0':(d>0?'+':'')+d;}
function adjSet(key,v){state.adj[key]=Math.round(v);invalidateAdjCache();}

export const TOOLS=[
  {id:'fontPct',label:'文字サイズ',glyph:'字',min:0.8,max:6,step:0.1,dec:1,unit:'%',get:()=>state.style.fontPct,set:v=>state.style.fontPct=v},
  {id:'weight',label:'文字の太さ',glyph:'太',min:300,max:800,step:100,unit:'',fmt:v=>WNAME[v]||v,get:()=>parseInt(state.style.weight),set:v=>state.style.weight=String(v)},
  {id:'pad',label:'バーの厚み',glyph:'枠',min:0.4,max:6,step:0.1,dec:1,unit:'%',get:()=>state.style.pad,set:v=>state.style.pad=v},
  {id:'bgOpacity',label:'背景の濃さ',glyph:'濃',min:0,max:100,step:1,unit:'%',get:()=>state.style.bgOpacity*100,set:v=>state.style.bgOpacity=v/100},
  {id:'lineW',label:'線の太さ',glyph:'線',min:0,max:10,step:1,unit:'px',get:()=>state.style.lineW,set:v=>state.style.lineW=v},
];

export const IMAGE_TOOLS=[
  {id:'rotL',label:'左回転',glyph:'↺',action:true,onTap:()=>rotateImg(-90)},
  {id:'rotR',label:'右回転',glyph:'↻',action:true,onTap:()=>rotateImg(90)},
  {id:'brightness',label:'明るさ',glyph:'明',min:0,max:200,step:1,unit:'',fmt:adjFmt,get:()=>state.adj.brightness,set:v=>adjSet('brightness',v)},
  {id:'contrast',label:'コントラスト',glyph:'比',min:0,max:200,step:1,unit:'',fmt:adjFmt,get:()=>state.adj.contrast,set:v=>adjSet('contrast',v)},
  {id:'saturation',label:'彩度',glyph:'彩',min:0,max:200,step:1,unit:'',fmt:adjFmt,get:()=>state.adj.saturation,set:v=>adjSet('saturation',v)},
  {id:'zoom',label:'ズーム',glyph:'拡',min:100,max:400,step:1,dec:0,unit:'%',get:()=>Math.round(state.zoom*100),set:v=>{state.zoom=v/100;state.crop=null;}},
  {id:'filter',label:'フィルタ',glyph:'🎨',action:true,onTap:()=>showFilterPanel()},
  {id:'crop',label:'トリミング',glyph:'切',action:true,onTap:()=>enterCrop()},
  {id:'markup',label:'マークアップ',glyph:'✏',action:true,onTap:()=>enterMarkup()},
];

const QUALITY_TOOL={id:'quality',label:'画質',min:50,max:100,step:1,unit:'',get:()=>Math.round(state.out.quality*100),set:v=>state.out.quality=v/100};

function rotateImg(deg){
  pushHistory();
  state.rotate=(state.rotate+deg+360)%360;
  state.crop=null; invalidateRotCache();
  scheduleDraw(); toast(['0°','90°','180°','270°'][state.rotate/90]+'に回転');
  renderTools();
}

let filterPanelEl=null;
function showFilterPanel(){
  if(filterPanelEl){hideFilterPanel();return;}
  if(!state.image) return;
  const rotated = getRotated();
  const thumbs = generateFilterThumbs(rotated);

  filterPanelEl=document.createElement('div');
  filterPanelEl.style.cssText='position:fixed;bottom:calc(160px + env(safe-area-inset-bottom,0px));left:0;right:0;z-index:20;overflow-x:auto;display:flex;gap:10px;padding:12px 16px;scrollbar-width:none;-webkit-overflow-scrolling:touch;';
  filterPanelEl.addEventListener('touchstart',e=>e.stopPropagation(),{passive:true});

  thumbs.forEach(({id,label,thumb})=>{
    const wrap=document.createElement('button');
    wrap.style.cssText='flex:0 0 auto;display:flex;flex-direction:column;align-items:center;gap:5px;';
    const active=state.adj.colorFilter===id;
    const img=document.createElement('canvas');
    img.width=thumb.width; img.height=thumb.height;
    img.getContext('2d').drawImage(thumb,0,0);
    const TH=60;
    img.style.cssText=`width:${Math.round(TH*thumb.width/thumb.height)}px;height:${TH}px;border-radius:8px;border:2.5px solid ${active?'#007aff':'transparent'};transition:.14s;`;
    const lbl=document.createElement('div');
    lbl.style.cssText=`font-size:10px;color:${active?'#007aff':'var(--muted)'};font-weight:${active?700:500};white-space:nowrap;`;
    lbl.textContent=label;
    wrap.append(img,lbl);
    wrap.addEventListener('click',()=>{
      pushHistory();
      state.adj.colorFilter=id;
      invalidateAdjCache();
      scheduleDraw();
      filterPanelEl.querySelectorAll('canvas').forEach((c,i)=>{
        c.style.borderColor=thumbs[i].id===id?'#007aff':'transparent';
      });
      filterPanelEl.querySelectorAll('div').forEach((d,i)=>{
        d.style.color=thumbs[i].id===id?'#007aff':'var(--muted)';
        d.style.fontWeight=thumbs[i].id===id?700:500;
      });
    });
    filterPanelEl.appendChild(wrap);
  });

  document.getElementById('app').appendChild(filterPanelEl);
}


export function renderTools(){
  const t=$('tools'); t.innerHTML=''; t.classList.remove('chips');
  hideFilterPanel();

  if(state.tab==='bar'){
    TOOLS.forEach(tool=>{
      const el=makeTool(tool.glyph,tool.label,state.tool===tool.id&&!tool.action,false);
      el.addEventListener('click',()=>{state.tool=tool.id;renderTools();bindScrub(tool);el.scrollIntoView({inline:'center',block:'nearest',behavior:'smooth'});});
      t.appendChild(el);
    });
    dockShow('scrub');
    const cur=TOOLS.find(x=>x.id===state.tool)||TOOLS[0];
    state.tool=cur.id; bindScrub(cur);

  } else if(state.tab==='items'){
    t.classList.add('chips'); chipEls={};
    if(!state.fields.length){const c=document.createElement('div');c.className='chip';c.textContent='EXIFなし — ⚙でカスタム追加';t.appendChild(c);}
    else{state.fields.forEach(f=>{const c=document.createElement('button');c.className='chip'+(f.enabled?' on':'')+(f.id===state.focusId?' focus':'');c.innerHTML=`<span class="dotg"></span>${f.jp||f.name}`;c.title=f.custom?(f.value||'(未入力)'):(f.display||'');c.addEventListener('click',()=>{f.enabled=!f.enabled;if(f.enabled)state.focusId=f.id;else if(state.focusId===f.id){const e=state.fields.find(x=>x.enabled);state.focusId=e?e.id:null;}refreshChips();updateItemCtl();scheduleDraw();});chipEls[f.id]=c;t.appendChild(c);});if(!state.focusId){const e=state.fields.find(x=>x.enabled);state.focusId=e?e.id:null;}}
    dockShow('item'); updateItemCtl();

  } else if(state.tab==='color'){
    [['color','文字色'],['bg','背景色'],['lineColor','線色']].forEach(([k,lbl])=>{
      const el=document.createElement('div'); el.className='tool';
      const inp=document.createElement('input'); inp.type='color'; inp.className='swatch'; inp.value=state.style[k];
      inp.addEventListener('input',e=>{state.style[k]=e.target.value;scheduleDraw();});
      const lab=document.createElement('div'); lab.className='tlabel'; lab.textContent=lbl;
      el.appendChild(inp); el.appendChild(lab); t.appendChild(el);
    });
    dockShow('hint','色をタップして変更します（背景の濃さは「バー」タブ）');

  } else if(state.tab==='image'){
    const imgScrubs=IMAGE_TOOLS.filter(x=>!x.action);
    if(!imgScrubs.find(x=>x.id===state.tool)) state.tool='brightness';
    IMAGE_TOOLS.forEach(tool=>{
      const el=makeTool(tool.glyph,tool.label,!tool.action&&state.tool===tool.id,tool.action);
      el.addEventListener('click',()=>{
        if(tool.action){tool.onTap();}
        else{state.tool=tool.id;renderTools();bindScrub(tool);el.scrollIntoView({inline:'center',block:'nearest',behavior:'smooth'});}
      });
      t.appendChild(el);
    });
    dockShow('scrub');
    const cur=IMAGE_TOOLS.find(x=>!x.action&&x.id===state.tool)||imgScrubs[0];
    if(cur) bindScrub(cur);

  } else if(state.tab==='export'){
    t.classList.add('chips');
    [['jpeg','JPEG'],['png','PNG'],['webp','WebP']].forEach(([v,lbl])=>{const c=document.createElement('button');c.className='chip'+(state.out.format===v?' on':'');c.textContent=lbl;c.addEventListener('click',()=>{state.out.format=v;renderTools();});t.appendChild(c);});
    if(state.out.format==='png') dockShow('hint','PNGは可逆圧縮のため画質設定はありません');
    else{dockShow('scrub');bindScrub(QUALITY_TOOL);}
  }
}

function hideFilterPanel(){if(filterPanelEl){filterPanelEl.remove();filterPanelEl=null;}}

function makeTool(glyph,label,active,isAction){
  const el=document.createElement('div');
  el.className='tool'+(active?' active':isAction?' act-tool':'');
  el.innerHTML=`<div class="tcircle">${glyph}</div><div class="tlabel">${label}</div>`;
  return el;
}

export function refreshChips(){for(const id in chipEls){const f=state.fields.find(x=>x.id===id);if(!f)continue;chipEls[id].classList.toggle('on',f.enabled);chipEls[id].classList.toggle('focus',f.id===state.focusId);}}

export function updateItemCtl(){
  const box=$('itemctl'); const f=state.fields.find(x=>x.id===state.focusId&&x.enabled);
  if(!f){box.innerHTML='<div class="ictl-empty">項目をオンにすると、配置(左/中/右)と段を編集できます</div>';return;}
  box.innerHTML='';
  const nav=document.createElement('div');nav.className='ictl-nav';
  const prev=document.createElement('button');prev.className='ictl-arrow';prev.textContent='‹';prev.onclick=()=>cycleFocus(-1);
  const name=document.createElement('span');name.className='ictl-name';name.textContent=f.custom?'カスタム':(f.jp||f.name);
  const next=document.createElement('button');next.className='ictl-arrow';next.textContent='›';next.onclick=()=>cycleFocus(1);
  nav.append(prev,name,next);
  const zone=makeSeg([['left','左'],['center','中'],['right','右']],f.zone,v=>{f.zone=v;scheduleDraw();});
  const rowc=makeSeg([[1,'1段'],[2,'2段']],f.row,v=>{f.row=v;scheduleDraw();});
  box.append(nav,zone,rowc);
}

function cycleFocus(dir){const en=state.fields.filter(x=>x.enabled);if(!en.length)return;let i=en.findIndex(x=>x.id===state.focusId);if(i<0)i=0;i=(i+dir+en.length)%en.length;state.focusId=en[i].id;refreshChips();updateItemCtl();if(chipEls[state.focusId])chipEls[state.focusId].scrollIntoView({inline:'center',block:'nearest',behavior:'smooth'});}

function dockShow(which,text){$('scrub').classList.toggle('hidden',which!=='scrub');$('hint').classList.toggle('hidden',which!=='hint');$('itemctl').classList.toggle('hidden',which!=='item');if(which==='hint'&&text)$('hint').textContent=text;}

export function makeSeg(opts,cur,onPick){const w=document.createElement('div');w.className='seg';opts.forEach(([v,lbl])=>{const b=document.createElement('button');b.textContent=lbl;b.className=cur===v?'on':'';b.addEventListener('click',()=>{[...w.children].forEach(c=>c.classList.remove('on'));b.classList.add('on');onPick(v);});w.appendChild(b);});return w;}

export function bindScrub(tool){curTool=tool;trackW=$('track').clientWidth||320;setStripFromValue();updateScrubVal();}
export function valClamp(v){return Math.min(curTool.max,Math.max(curTool.min,v));}
function valStep(v){const s=curTool.step||1;return Number((Math.round(v/s)*s).toFixed(4));}
export function setStripFromValue(){trackW=$('track').clientWidth||trackW||320;const v=valClamp(curTool.get()),range=curTool.max-curTool.min,pos=(v-curTool.min)/range*STRIP,tx=(trackW/2)-pos;$('ticks').style.width=STRIP+'px';$('ticks').style.transform=`translateY(-50%) translateX(${tx}px)`;}
function valFromTx(tx){const range=curTool.max-curTool.min;return valClamp(curTool.min+((trackW/2-tx)/STRIP)*range);}
export function updateScrubVal(){if(!curTool)return;const v=valStep(valClamp(curTool.get()));const disp=curTool.fmt?curTool.fmt(v):((curTool.dec!=null?v.toFixed(curTool.dec):String(Math.round(v)))+(curTool.unit||''));$('scrubval').innerHTML=`${curTool.label}<span class="v">${disp}</span>`;}

export function initScrub(){
  const track=$('track');let drag=false,startX=0,startTx=0;
  const minTx=()=>trackW/2-STRIP,maxTx=()=>trackW/2;
  track.addEventListener('pointerdown',e=>{if(!curTool)return;drag=true;track.setPointerCapture(e.pointerId);trackW=track.clientWidth;startX=e.clientX;startTx=(trackW/2)-((valClamp(curTool.get())-curTool.min)/(curTool.max-curTool.min))*STRIP;});
  track.addEventListener('pointermove',e=>{if(!drag||!curTool)return;let tx=startTx+(e.clientX-startX);tx=Math.min(maxTx(),Math.max(minTx(),tx));const v=valStep(valFromTx(tx));curTool.set(v);$('ticks').style.transform=`translateY(-50%) translateX(${tx}px)`;updateScrubVal();scheduleDraw();});
  const end=()=>{if(!drag)return;drag=false;setStripFromValue();};
  track.addEventListener('pointerup',end);track.addEventListener('pointercancel',end);
}
