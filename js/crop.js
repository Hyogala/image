"use strict";
import {state} from './state.js';
import {getRotated, scheduleDraw} from './draw.js';
import {pushHistory} from './history.js';

let cropCvs=null,cropCtx2=null,cropUiEl=null,cropNorm={x:0,y:0,w:1,h:1},cropDrag=null;

function cropLayout(){
  const rot=getRotated(); if(!rot)return null;
  const W=window.innerWidth,H=window.innerHeight,PAD=48,BTN=90;
  const avW=W-2*PAD,avH=H-2*PAD-BTN,ar=rot.width/rot.height,sar=avW/avH;
  let iW,iH;if(ar>sar){iW=avW;iH=avW/ar;}else{iH=avH;iW=avH*ar;}
  const iX=(W-iW)/2,iY=(H-iH-BTN)/2;
  return{iX,iY,iW,iH,rW:rot.width,rH:rot.height};
}

function drawCropUI(){
  if(!cropCvs)return;
  const dpr=window.devicePixelRatio||1,W=window.innerWidth,H=window.innerHeight;
  cropCvs.width=W*dpr;cropCvs.height=H*dpr;cropCvs.style.width=W+'px';cropCvs.style.height=H+'px';
  const c=cropCtx2;c.setTransform(dpr,0,0,dpr,0,0);
  const rot=getRotated(),lay=cropLayout();if(!lay)return;
  const{iX,iY,iW,iH}=lay;
  c.fillStyle='rgba(0,0,0,0.88)';c.fillRect(0,0,W,H);
  c.save();c.globalAlpha=0.3;c.drawImage(rot,iX,iY,iW,iH);c.restore();
  const cx=iX+cropNorm.x*iW,cy=iY+cropNorm.y*iH,cw=cropNorm.w*iW,ch=cropNorm.h*iH;
  c.save();c.beginPath();c.rect(cx,cy,cw,ch);c.clip();c.globalAlpha=1;c.drawImage(rot,iX,iY,iW,iH);c.restore();
  c.strokeStyle='rgba(255,255,255,0.9)';c.lineWidth=1.5;c.strokeRect(cx,cy,cw,ch);
  c.save();c.strokeStyle='rgba(255,255,255,.18)';c.lineWidth=1;
  for(let i=1;i<3;i++){c.beginPath();c.moveTo(cx+cw*i/3,cy);c.lineTo(cx+cw*i/3,cy+ch);c.stroke();c.beginPath();c.moveTo(cx,cy+ch*i/3);c.lineTo(cx+cw,cy+ch*i/3);c.stroke();}
  c.restore();
  [[cx,cy],[cx+cw,cy],[cx,cy+ch],[cx+cw,cy+ch]].forEach(([hx,hy])=>{
    c.fillStyle='rgba(0,0,0,.4)';c.beginPath();c.arc(hx,hy,11,0,Math.PI*2);c.fill();
    c.fillStyle='#fff';c.beginPath();c.arc(hx,hy,7,0,Math.PI*2);c.fill();
  });
  const pxW=Math.max(1,Math.round(cropNorm.w*lay.rW)),pxH=Math.max(1,Math.round(cropNorm.h*lay.rH));
  const lbl=`${pxW} × ${pxH}`;c.font='bold 12px -apple-system,monospace';
  const lw=c.measureText(lbl).width+20;
  c.fillStyle='rgba(0,0,0,.6)';c.beginPath();
  if(c.roundRect)c.roundRect(cx+cw/2-lw/2,cy+ch/2-12,lw,24,6);else c.rect(cx+cw/2-lw/2,cy+ch/2-12,lw,24);
  c.fill();c.fillStyle='#fff';c.textAlign='center';c.textBaseline='middle';c.fillText(lbl,cx+cw/2,cy+ch/2);
}

function cropHandleAt(x,y){
  const lay=cropLayout();if(!lay)return null;
  const{iX,iY,iW,iH}=lay,T=22;
  const cx=iX+cropNorm.x*iW,cy=iY+cropNorm.y*iH,cw=cropNorm.w*iW,ch=cropNorm.h*iH;
  const corners=[{h:'tl',px:cx,py:cy},{h:'tr',px:cx+cw,py:cy},{h:'bl',px:cx,py:cy+ch},{h:'br',px:cx+cw,py:cy+ch}];
  for(const{h,px,py}of corners)if(Math.abs(x-px)<T&&Math.abs(y-py)<T)return h;
  if(x>cx-T&&x<cx+cw+T&&y>cy-T&&y<cy+ch+T)return 'move';
  return null;
}

export function enterCrop(){
  if(!state.image){return;}
  cropCvs=document.createElement('canvas');
  cropCvs.style.cssText='position:fixed;inset:0;z-index:70;touch-action:none;';
  document.body.appendChild(cropCvs);cropCtx2=cropCvs.getContext('2d');
  cropUiEl=document.createElement('div');
  cropUiEl.style.cssText='position:fixed;inset:0;z-index:71;pointer-events:none;';
  cropUiEl.innerHTML=`<div style="position:absolute;bottom:calc(28px + env(safe-area-inset-bottom,0px));left:0;right:0;display:flex;justify-content:center;align-items:center;padding:0 24px;pointer-events:all;gap:12px">
    <button id="cropCancelBtn" style="background:rgba(255,255,255,.14);color:#fff;border-radius:22px;padding:13px 28px;font-size:15px;font-weight:600;backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);">キャンセル</button>
    <button id="cropOkBtn" style="background:#fff;color:#111;border-radius:22px;padding:13px 28px;font-size:15px;font-weight:600;">確定</button>
  </div>`;
  document.body.appendChild(cropUiEl);
  const lay=cropLayout();
  if(state.crop&&lay){cropNorm={x:state.crop.x/lay.rW,y:state.crop.y/lay.rH,w:state.crop.w/lay.rW,h:state.crop.h/lay.rH};}
  else{cropNorm={x:0,y:0,w:1,h:1};}
  document.getElementById('cropCancelBtn').addEventListener('click',()=>exitCrop(false));
  document.getElementById('cropOkBtn').addEventListener('click',()=>exitCrop(true));
  cropCvs.addEventListener('pointerdown',e=>{
    const r=cropCvs.getBoundingClientRect(),h=cropHandleAt(e.clientX-r.left,e.clientY-r.top);
    if(h){cropDrag={h,sx:e.clientX,sy:e.clientY,sr:{...cropNorm}};cropCvs.setPointerCapture(e.pointerId);}
  });
  cropCvs.addEventListener('pointermove',e=>{
    if(!cropDrag)return;
    const lay=cropLayout();if(!lay)return;
    const dx=(e.clientX-cropDrag.sx)/lay.iW,dy=(e.clientY-cropDrag.sy)/lay.iH;
    const s=cropDrag.sr,MIN=0.05,h=cropDrag.h;let n={...s};
    if(h==='move'){n.x=Math.max(0,Math.min(1-s.w,s.x+dx));n.y=Math.max(0,Math.min(1-s.h,s.y+dy));}
    else if(h==='tl'){const nx=Math.max(0,Math.min(s.x+s.w-MIN,s.x+dx)),ny=Math.max(0,Math.min(s.y+s.h-MIN,s.y+dy));n={x:nx,y:ny,w:s.x+s.w-nx,h:s.y+s.h-ny};}
    else if(h==='tr'){const ny=Math.max(0,Math.min(s.y+s.h-MIN,s.y+dy));n={x:s.x,y:ny,w:Math.max(MIN,Math.min(1-s.x,s.w+dx)),h:s.y+s.h-ny};}
    else if(h==='bl'){const nx=Math.max(0,Math.min(s.x+s.w-MIN,s.x+dx));n={x:nx,y:s.y,w:s.x+s.w-nx,h:Math.max(MIN,Math.min(1-s.y,s.h+dy))};}
    else if(h==='br'){n={x:s.x,y:s.y,w:Math.max(MIN,Math.min(1-s.x,s.w+dx)),h:Math.max(MIN,Math.min(1-s.y,s.h+dy))};}
    cropNorm=n;drawCropUI();
  });
  cropCvs.addEventListener('pointerup',()=>{cropDrag=null;});
  cropCvs.addEventListener('pointercancel',()=>{cropDrag=null;});
  window.addEventListener('resize',drawCropUI);
  drawCropUI();
}

function exitCrop(apply){
  if(apply){
    const lay=cropLayout();
    if(lay){
      const x=Math.round(cropNorm.x*lay.rW),y=Math.round(cropNorm.y*lay.rH),w=Math.max(10,Math.round(cropNorm.w*lay.rW)),h=Math.max(10,Math.round(cropNorm.h*lay.rH));
      pushHistory();
      state.crop=(x<=1&&y<=1&&Math.abs(w-lay.rW)<=2&&Math.abs(h-lay.rH)<=2)?null:{x,y,w,h};
    }
  }
  if(cropCvs){cropCvs.remove();cropCvs=null;cropCtx2=null;}
  if(cropUiEl){cropUiEl.remove();cropUiEl=null;}
  cropDrag=null;window.removeEventListener('resize',drawCropUI);
  scheduleDraw();
}
