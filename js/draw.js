"use strict";
import {state, FAMILY} from './state.js';
import {getAdjusted, invalidateAdjCache} from './filters.js';

export const canvas = document.getElementById('canvas');
export const ctx = canvas.getContext('2d');

let rotCache = null;
export function getRotated() {
  if(!state.image) return null;
  if(rotCache && rotCache.rot===state.rotate && rotCache.img===state.image) return rotCache.canvas;
  const rot=state.rotate, sw=rot===90||rot===270;
  const oW=sw?state.imgH:state.imgW, oH=sw?state.imgW:state.imgH;
  const off=document.createElement('canvas'); off.width=oW; off.height=oH;
  const oc=off.getContext('2d'); oc.save();
  if(rot===90){oc.translate(oW,0);oc.rotate(Math.PI/2);}
  else if(rot===180){oc.translate(oW,oH);oc.rotate(Math.PI);}
  else if(rot===270){oc.translate(0,oH);oc.rotate(-Math.PI/2);}
  oc.drawImage(state.image,0,0); oc.restore();
  rotCache={rot:state.rotate,img:state.image,canvas:off};
  return off;
}
export function invalidateRotCache() { rotCache=null; invalidateAdjCache(); }

function hexRGBA(hex,a){const r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);return `rgba(${r},${g},${b},${a})`;}

export function fieldText(f){let b=f.custom?(f.value||''):(f.display||'');if(!b)return '';b=(f.prefix||'')+b+(f.suffix||'');if(state.style.showLabels){const l=f.label||f.jp||f.name;if(l)return l+state.style.labelSep+b;}return b;}
export function rowZoneStr(r,z){return state.fields.filter(f=>f.enabled&&f.row===r&&f.zone===z).map(fieldText).filter(Boolean).join(state.style.sep);}

export function draw() {
  if(!state.image) return;
  const s = state.style;
  const rotated = getRotated();
  const rW=rotated.width, rH=rotated.height;

  // Source rect
  let srcX,srcY,srcW,srcH;
  if(state.crop){srcX=state.crop.x;srcY=state.crop.y;srcW=state.crop.w;srcH=state.crop.h;}
  else if(state.zoom>1.001){srcW=Math.round(rW/state.zoom);srcH=Math.round(rH/state.zoom);srcX=Math.round((rW-srcW)/2);srcY=Math.round((rH-srcH)/2);}
  else{srcX=0;srcY=0;srcW=rW;srcH=rH;}

  const longSrc=Math.max(srcW,srcH);
  let scale=1; if(state.out.maxEdge>0&&longSrc>state.out.maxEdge)scale=state.out.maxEdge/longSrc;
  const dW=Math.round(srcW*scale), dH=Math.round(srcH*scale), base=Math.max(dW,dH);

  const fam=FAMILY[s.family]||FAMILY.mono;
  const setFont=px=>{ctx.font=`${s.weight} ${px}px ${fam}`;};
  const usesRow2=state.fields.some(f=>f.enabled&&f.row===2&&fieldText(f));
  const rows=usesRow2?2:1;
  const data=[];for(let r=1;r<=rows;r++)data.push({left:rowZoneStr(r,'left'),center:rowZoneStr(r,'center'),right:rowZoneStr(r,'right')});
  const anyText=data.some(d=>d.left||d.center||d.right);
  const padX=Math.max(4,Math.round(s.pad/100*base)), padY=padX;
  let fontPx=Math.max(8,Math.round(s.fontPct/100*base));
  if(anyText&&s.autofit){
    const avail=dW-2*padX;
    const fit=px=>{setFont(px);const g=px*0.45;let factor=1;for(const d of data){const Lw=d.left?ctx.measureText(d.left).width:0,Cw=d.center?ctx.measureText(d.center).width:0,Rw=d.right?ctx.measureText(d.right).width:0;const ch=[];if(d.center){ch.push([Lw+Cw/2+g,dW/2-padX]);ch.push([Rw+Cw/2+g,dW/2-padX]);ch.push([Cw,avail]);}else if(d.left&&d.right){ch.push([Lw+Rw+g,avail]);}if(d.left)ch.push([Lw,avail]);if(d.right)ch.push([Rw,avail]);for(const[lhs,rhs]of ch){if(lhs>rhs&&lhs>0)factor=Math.min(factor,rhs/lhs);}}return factor;};
    let f1=fit(fontPx);if(f1<1){fontPx=Math.max(8,Math.floor(fontPx*f1));let f2=fit(fontPx);if(f2<1)fontPx=Math.max(8,Math.floor(fontPx*f2));}
  }
  const lineGap=usesRow2?Math.round((s.lineGap||0)/100*base):0;
  const barH=anyText?Math.round(rows*fontPx+(rows-1)*lineGap+padY*2):0;
  const overlay=s.mode==='overlay';

  // Border
  const bT=Math.round((s.borderTop||0)/100*dH);
  const bB=Math.round((s.borderBottom||0)/100*dH);
  const bL=Math.round((s.borderLeft||0)/100*dW);
  const bR=Math.round((s.borderRight||0)/100*dW);
  const hasBorder=bT>0||bB>0||bL>0||bR>0;

  const innerW=dW, innerH=overlay?dH:dH+barH;
  const totalW=innerW+bL+bR, totalH=innerH+bT+bB;
  canvas.width=totalW; canvas.height=totalH;

  ctx.clearRect(0,0,totalW,totalH);

  // Fill border
  if(hasBorder){ctx.fillStyle=s.borderColor||'#ffffff';ctx.fillRect(0,0,totalW,totalH);}

  const barTop=bT+((s.position==='top')?0:(overlay?dH-barH:dH));
  const imgTop=bT+((s.position==='top')?(overlay?0:barH):0);

  // Draw image (with adjustments applied to intermediate canvas)
  const adjusted = getAdjusted(rotated);
  ctx.drawImage(adjusted, srcX, srcY, srcW, srcH, bL, imgTop, dW, dH);

  // Draw bar
  if(barH>0){
    ctx.save();
    const bs=s.barStyle||'solid';
    if(bs==='gradient'){
      const gS=s.position==='top'?barTop+barH:barTop, gE=s.position==='top'?barTop:barTop+barH;
      const g=ctx.createLinearGradient(0,gS,0,gE);
      g.addColorStop(0,hexRGBA(s.bg,s.bgOpacity));g.addColorStop(1,hexRGBA(s.bg,0));
      ctx.fillStyle=g;ctx.fillRect(bL,barTop,dW,barH);
    } else if(bs==='rounded'){
      ctx.globalAlpha=s.bgOpacity;ctx.fillStyle=s.bg;
      const rv=Math.min(18,Math.round(barH*0.38));
      const m=Math.max(2,Math.round(base*0.005));
      ctx.beginPath();
      if(ctx.roundRect){ctx.roundRect(bL+m,barTop+(s.position==='bottom'?m:0),dW-2*m,barH-m,s.position==='bottom'?[rv,rv,0,0]:[0,0,rv,rv]);}
      else{ctx.rect(bL+m,barTop,dW-2*m,barH);}
      ctx.fill();
    } else if(bs==='filmstrip'){
      ctx.globalAlpha=s.bgOpacity;ctx.fillStyle=s.bg;ctx.fillRect(bL,barTop,dW,barH);
      ctx.restore();ctx.save();ctx.globalAlpha=1;
      const hH=Math.max(4,Math.round(barH*0.38)),hW=Math.round(hH*0.8);
      const gap=Math.round(hW*1.4),hY=barTop+Math.round((barH-hH)/2);
      const count=Math.max(1,Math.floor(dW/(hW+gap)));
      const sx=Math.round((dW-count*(hW+gap))/2+gap/2);
      for(let i=0;i<count;i++)ctx.clearRect(bL+sx+i*(hW+gap),hY,hW,hH);
    } else {
      ctx.globalAlpha=s.bgOpacity;ctx.fillStyle=s.bg;ctx.fillRect(bL,barTop,dW,barH);
    }
    ctx.restore();
    if(s.line&&s.lineW>0){const ly=(s.position==='top')?(barTop+barH-s.lineW):barTop;ctx.fillStyle=s.lineColor;ctx.fillRect(bL,ly,dW,s.lineW);}
    setFont(fontPx);ctx.fillStyle=s.color;ctx.textBaseline='middle';
    for(let i=0;i<rows;i++){const d=data[i];const cy=barTop+padY+fontPx/2+i*(fontPx+lineGap);
      if(d.left){ctx.textAlign='left';ctx.fillText(d.left,bL+padX,cy);}
      if(d.right){ctx.textAlign='right';ctx.fillText(d.right,bL+dW-padX,cy);}
      if(d.center){ctx.textAlign='center';ctx.fillText(d.center,bL+dW/2,cy);}}
  }

  // Draw markup strokes on top
  if(state.markup.length) drawMarkupStrokes(ctx, state.markup, totalW, totalH);
}

export function drawMarkupStrokes(ctx, strokes, W, H) {
  for(const s of strokes) {
    ctx.save();
    ctx.globalAlpha = s.opacity||1;
    ctx.strokeStyle = s.color||'#ff3b30';
    ctx.fillStyle = s.color||'#ff3b30';
    ctx.lineWidth = (s.width||3) * Math.min(W,H) / 1000;
    ctx.lineCap='round'; ctx.lineJoin='round';
    if(s.type==='pen' && s.points?.length) {
      const pts=s.points;
      ctx.beginPath();
      ctx.moveTo(pts[0].nx*W, pts[0].ny*H);
      for(let i=1;i<pts.length;i++){
        const p=pts[i-1],q=pts[i];
        ctx.quadraticCurveTo(p.nx*W, p.ny*H, (p.nx+q.nx)/2*W, (p.ny+q.ny)/2*H);
      }
      if(pts.length>1){const l=pts[pts.length-1];ctx.lineTo(l.nx*W,l.ny*H);}
      ctx.stroke();
    } else if(s.type==='text' && s.text) {
      const sz = Math.round((s.size||0.04)*Math.min(W,H));
      ctx.font=`bold ${sz}px -apple-system,sans-serif`;
      ctx.textAlign='center'; ctx.textBaseline='middle';
      // Text shadow for readability
      ctx.shadowColor='rgba(0,0,0,0.5)'; ctx.shadowBlur=4;
      ctx.fillText(s.text, s.nx*W, s.ny*H);
    } else if(s.type==='arrow' && s.points?.length===2) {
      const [a,b]=s.points;
      const ax=a.nx*W,ay=a.ny*H,bx=b.nx*W,by=b.ny*H;
      ctx.beginPath(); ctx.moveTo(ax,ay); ctx.lineTo(bx,by); ctx.stroke();
      const ang=Math.atan2(by-ay,bx-ax), hw=ctx.lineWidth*3;
      ctx.beginPath();
      ctx.moveTo(bx,by);
      ctx.lineTo(bx-hw*Math.cos(ang-0.4),by-hw*Math.sin(ang-0.4));
      ctx.lineTo(bx-hw*Math.cos(ang+0.4),by-hw*Math.sin(ang+0.4));
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }
}

let rafP=false;
export function scheduleDraw(){if(rafP)return;rafP=true;requestAnimationFrame(()=>{rafP=false;draw();});}
