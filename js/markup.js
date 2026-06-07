"use strict";
import {state} from './state.js';
import {canvas, scheduleDraw} from './draw.js';
import {pushHistory} from './history.js';

let overlayCanvas = null, overlayCtx = null, toolbarEl = null;
let currentStroke = null, markupTool = 'pen', markupColor = '#ff3b30', markupWidth = 4;
const COLORS = ['#ff3b30','#ff9f0a','#ffd60a','#30d158','#0a84ff','#bf5af2','#ffffff','#000000'];

function screenToNorm(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  return { nx: (clientX-rect.left)/rect.width, ny: (clientY-rect.top)/rect.height };
}

function redrawOverlay() {
  if(!overlayCtx) return;
  const W=overlayCanvas.width, H=overlayCanvas.height;
  overlayCtx.clearRect(0,0,W,H);
  if(currentStroke && currentStroke.type==='pen' && currentStroke.points?.length) {
    const pts=currentStroke.points;
    overlayCtx.save();
    overlayCtx.globalAlpha=currentStroke.opacity||1;
    overlayCtx.strokeStyle=currentStroke.color;
    overlayCtx.lineWidth=(currentStroke.width||3)*window.devicePixelRatio;
    overlayCtx.lineCap='round'; overlayCtx.lineJoin='round';
    overlayCtx.beginPath();
    overlayCtx.moveTo(pts[0].nx*W,pts[0].ny*H);
    for(let i=1;i<pts.length;i++){
      const p=pts[i-1],q=pts[i];
      overlayCtx.quadraticCurveTo(p.nx*W,p.ny*H,(p.nx+q.nx)/2*W,(p.ny+q.ny)/2*H);
    }
    if(pts.length>1){const l=pts[pts.length-1];overlayCtx.lineTo(l.nx*W,l.ny*H);}
    overlayCtx.stroke();
    overlayCtx.restore();
  }
}

function syncOverlaySize() {
  if(!overlayCanvas) return;
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio||1;
  overlayCanvas.style.left=rect.left+'px'; overlayCanvas.style.top=rect.top+'px';
  overlayCanvas.style.width=rect.width+'px'; overlayCanvas.style.height=rect.height+'px';
  overlayCanvas.width=rect.width*dpr; overlayCanvas.height=rect.height*dpr;
  overlayCtx.setTransform(dpr,0,0,dpr,0,0);
}

function buildToolbar() {
  toolbarEl = document.createElement('div');
  toolbarEl.id='markupToolbar';
  toolbarEl.style.cssText='position:fixed;bottom:calc(16px + env(safe-area-inset-bottom,0px));left:50%;transform:translateX(-50%);z-index:75;display:flex;flex-direction:column;align-items:center;gap:10px;';

  const colorRow = document.createElement('div');
  colorRow.style.cssText='display:flex;gap:8px;background:rgba(28,28,30,.85);padding:10px 14px;border-radius:22px;backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);';
  COLORS.forEach(c => {
    const btn=document.createElement('button');
    btn.style.cssText=`width:28px;height:28px;border-radius:50%;background:${c};border:2px solid ${c===markupColor?'#fff':'transparent'};transition:.14s;`;
    btn.dataset.color=c;
    btn.addEventListener('click',()=>{
      markupColor=c;
      colorRow.querySelectorAll('button').forEach(b=>b.style.borderColor=b.dataset.color===c?'#fff':'transparent');
    });
    colorRow.appendChild(btn);
  });

  const toolRow = document.createElement('div');
  toolRow.style.cssText='display:flex;gap:8px;background:rgba(28,28,30,.85);padding:8px 12px;border-radius:22px;backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);align-items:center;';

  const tools=[{id:'pen',lbl:'ペン'},{id:'arrow',lbl:'矢印'},{id:'text',lbl:'テキスト'},{id:'eraser',lbl:'消去'}];
  tools.forEach(({id,lbl})=>{
    const btn=document.createElement('button');
    btn.textContent=lbl;
    btn.style.cssText=`padding:8px 14px;border-radius:14px;font-size:13px;font-weight:600;color:${markupTool===id?'#1c1c1e':'#fff'};background:${markupTool===id?'#fff':'transparent'};transition:.14s;`;
    btn.dataset.tool=id;
    btn.addEventListener('click',()=>{
      markupTool=id;
      toolRow.querySelectorAll('button[data-tool]').forEach(b=>{
        b.style.background=b.dataset.tool===id?'#fff':'transparent';
        b.style.color=b.dataset.tool===id?'#1c1c1e':'#fff';
      });
    });
    toolRow.appendChild(btn);
  });

  const sep=document.createElement('div');sep.style.cssText='width:1px;height:24px;background:rgba(255,255,255,.2);margin:0 4px;';
  toolRow.appendChild(sep);

  const doneBtn=document.createElement('button');
  doneBtn.textContent='完了';
  doneBtn.style.cssText='padding:8px 16px;border-radius:14px;font-size:13px;font-weight:700;color:#1c1c1e;background:#ffd60a;transition:.14s;';
  doneBtn.addEventListener('click',()=>exitMarkup(true));
  toolRow.appendChild(doneBtn);

  const cancelBtn=document.createElement('button');
  cancelBtn.textContent='取消';
  cancelBtn.style.cssText='padding:8px 14px;border-radius:14px;font-size:13px;font-weight:600;color:#fff;background:transparent;transition:.14s;';
  cancelBtn.addEventListener('click',()=>exitMarkup(false));
  toolRow.appendChild(cancelBtn);

  toolbarEl.appendChild(colorRow);
  toolbarEl.appendChild(toolRow);
  document.body.appendChild(toolbarEl);
}

let arrowStart=null, markupSnapshot=null;

export function enterMarkup() {
  if(!state.image){return;}
  state.markupActive=true;
  markupSnapshot=[...state.markup];

  overlayCanvas=document.createElement('canvas');
  overlayCanvas.style.cssText='position:fixed;z-index:72;touch-action:none;cursor:crosshair;';
  document.body.appendChild(overlayCanvas);
  overlayCtx=overlayCanvas.getContext('2d');
  syncOverlaySize();
  buildToolbar();
  window.addEventListener('resize',syncOverlaySize);

  overlayCanvas.addEventListener('pointerdown',onDown);
  overlayCanvas.addEventListener('pointermove',onMove);
  overlayCanvas.addEventListener('pointerup',onUp);
  overlayCanvas.addEventListener('pointercancel',onUp);
}

function onDown(e) {
  overlayCanvas.setPointerCapture(e.pointerId);
  const pt=screenToNorm(e.clientX,e.clientY);
  if(markupTool==='eraser'){
    if(state.markup.length){pushHistory();state.markup.pop();scheduleDraw();}
    return;
  }
  if(markupTool==='pen'){
    currentStroke={type:'pen',color:markupColor,width:markupWidth,opacity:1,points:[pt]};
  } else if(markupTool==='arrow'){
    arrowStart=pt;
    currentStroke={type:'arrow',color:markupColor,width:markupWidth,opacity:1,points:[pt,pt]};
  } else if(markupTool==='text'){
    const text=window.prompt('テキストを入力:','');
    if(text){
      pushHistory();
      state.markup.push({type:'text',color:markupColor,size:0.045,opacity:1,text,nx:pt.nx,ny:pt.ny});
      scheduleDraw();
    }
  }
}

function onMove(e) {
  if(!currentStroke) return;
  const pt=screenToNorm(e.clientX,e.clientY);
  if(markupTool==='pen'){
    currentStroke.points.push(pt);
    redrawOverlay();
  } else if(markupTool==='arrow' && arrowStart){
    currentStroke.points=[arrowStart,pt];
  }
}

function onUp() {
  if(currentStroke){
    pushHistory();
    state.markup.push(currentStroke);
    currentStroke=null;
    arrowStart=null;
    overlayCtx.clearRect(0,0,overlayCanvas.width,overlayCanvas.height);
    scheduleDraw();
  }
}

function exitMarkup(keep) {
  if(!keep) state.markup=markupSnapshot||[];
  state.markupActive=false;
  if(overlayCanvas){overlayCanvas.remove();overlayCanvas=null;overlayCtx=null;}
  if(toolbarEl){toolbarEl.remove();toolbarEl=null;}
  window.removeEventListener('resize',syncOverlaySize);
  currentStroke=null;arrowStart=null;
  scheduleDraw();
}
