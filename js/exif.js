"use strict";
import {TAGS,GPS_TAGS,TYPE_SIZE,EP,MM,WBM,EXM,SC,OR,JP,ORDER,ENABLED,ZL,ZC,SKIP,state} from './state.js';

export function parseExif(buffer){const raw={};try{const dv=new DataView(buffer);if(dv.byteLength<4||dv.getUint16(0)!==0xFFD8)return raw;let off=2,tiff=-1;while(off+4<=dv.byteLength){const m=dv.getUint16(off);if((m&0xFF00)!==0xFF00)break;if(m===0xFFDA)break;const len=dv.getUint16(off+2);if(m===0xFFE1&&dv.getUint32(off+4)===0x45786966&&dv.getUint16(off+8)===0x0000){tiff=off+10;break;}off+=2+len;}if(tiff<0)return raw;const little=(dv.getUint16(tiff)===0x4949);if(dv.getUint16(tiff+2,little)!==0x002A)return raw;readIFD(dv,tiff+dv.getUint32(tiff+4,little),tiff,little,TAGS,raw);if(raw.ExifIFDPointer!=null)readIFD(dv,tiff+raw.ExifIFDPointer,tiff,little,TAGS,raw);if(raw.GPSInfoIFDPointer!=null)readIFD(dv,tiff+raw.GPSInfoIFDPointer,tiff,little,GPS_TAGS,raw);}catch(e){}return raw;}

function readIFD(dv,ifdOff,tiff,little,dict,out){if(ifdOff<0||ifdOff+2>dv.byteLength)return;const n=dv.getUint16(ifdOff,little);for(let i=0;i<n;i++){const e=ifdOff+2+i*12;if(e+12>dv.byteLength)break;const tag=dv.getUint16(e,little),type=dv.getUint16(e+2,little),count=dv.getUint32(e+4,little);const name=dict[tag];if(!name)continue;const v=readValue(dv,type,count,e+8,tiff,little);if(v!==undefined)out[name]=v;}}

function readValue(dv,type,count,vOff,tiff,little){const ts=TYPE_SIZE[type]||1,bytes=ts*count;let base=bytes<=4?vOff:tiff+dv.getUint32(vOff,little);if(base<0||base+bytes>dv.byteLength)return undefined;if(type===2){let s='';for(let i=0;i<count;i++){const c=dv.getUint8(base+i);if(c===0)break;s+=String.fromCharCode(c);}return s.trim();}const out=[];for(let i=0;i<count;i++){const p=base+i*ts;switch(type){case 1:case 7:out.push(dv.getUint8(p));break;case 3:out.push(dv.getUint16(p,little));break;case 4:out.push(dv.getUint32(p,little));break;case 9:out.push(dv.getInt32(p,little));break;case 5:{const a=dv.getUint32(p,little),b=dv.getUint32(p+4,little);out.push(b?a/b:0);break;}case 10:{const a=dv.getInt32(p,little),b=dv.getInt32(p+4,little);out.push(b?a/b:0);break;}default:out.push(dv.getUint8(p));}}return out.length===1?out[0]:out;}

function num(v){const n=Math.round(v*100)/100;return Number.isFinite(n)?String(n):String(v);}
const FMT={ExposureTime:v=>v>=1?num(v)+'s':'1/'+Math.round(1/v)+'s',FNumber:v=>'f/'+num(v),ApertureValue:v=>'f/'+num(Math.pow(2,v/2)),MaxApertureValue:v=>'f/'+num(Math.pow(2,v/2)),ShutterSpeedValue:v=>{const t=Math.pow(2,-v);return t>=1?num(t)+'s':'1/'+Math.round(1/t)+'s';},FocalLength:v=>num(v)+'mm',FocalLengthIn35mmFilm:v=>num(v)+'mm',ExposureBiasValue:v=>(v>0?'+':'')+num(v)+' EV',DigitalZoomRatio:v=>num(v)+'×',GPSAltitude:v=>num(v)+' m',SubjectDistance:v=>num(v)+' m',ExposureProgram:v=>EP[v]??('Program '+v),MeteringMode:v=>MM[v]??('Mode '+v),WhiteBalance:v=>WBM[v]??('WB '+v),ExposureMode:v=>EXM[v]??('Mode '+v),SceneCaptureType:v=>SC[v]??('Type '+v),Flash:v=>(v&1)?'Flash':'No flash',Orientation:v=>OR[v]??String(v),ColorSpace:v=>v===1?'sRGB':(v===0xFFFF?'Uncalibrated':String(v)),DateTime:v=>String(v).replace(/^(\d{4}):(\d{2}):(\d{2})/,'$1-$2-$3'),DateTimeOriginal:v=>String(v).replace(/^(\d{4}):(\d{2}):(\d{2})/,'$1-$2-$3'),DateTimeDigitized:v=>String(v).replace(/^(\d{4}):(\d{2}):(\d{2})/,'$1-$2-$3')};
export function format(name,v){if(FMT[name])try{return FMT[name](v);}catch(e){}return Array.isArray(v)?v.join(' '):String(v);}

export function zoneFor(k){return ZL.has(k)?'left':(ZC.has(k)?'center':'right');}
let fid=0;
export function mkField(key,display,extra){return Object.assign({id:'f'+(fid++),key,name:key,jp:(JP[key]||''),display:String(display),custom:false,enabled:ENABLED.has(key),zone:zoneFor(key),row:1,label:'',prefix:'',suffix:'',value:''},extra||{});}

export function buildFields(raw){
  const list=[],present=n=>raw[n]!==undefined&&raw[n]!=='';
  if(present('Make')||present('Model')){const mk=(raw.Make||'').trim(),md=(raw.Model||'').trim();let cam=md?((mk&&md.toLowerCase().indexOf(mk.toLowerCase())!==0)?mk+' '+md:md):mk;if(cam)list.push(mkField('Camera',cam));}
  let lens=(raw.LensModel||'').trim();
  if(!lens&&Array.isArray(raw.LensSpecification)&&raw.LensSpecification.length>=2){const a=raw.LensSpecification;lens=(a[0]===a[1])?num(a[0])+'mm':num(a[0])+'-'+num(a[1])+'mm';}
  if(lens)list.push(mkField('Lens',lens));
  const iso=raw.ISOSpeedRatings;if(iso!==undefined){const v=Array.isArray(iso)?iso[0]:iso;list.push(mkField('ISO','ISO '+v));}
  function dms2dec(d,r){if(!Array.isArray(d)||d.length<3)return null;let x=d[0]+d[1]/60+d[2]/3600;if(r==='S'||r==='W')x=-x;return x;}
  const lat=dms2dec(raw.GPSLatitude,raw.GPSLatitudeRef),lng=dms2dec(raw.GPSLongitude,raw.GPSLongitudeRef);
  if(lat!=null&&lng!=null)list.push(mkField('GPSPosition',lat.toFixed(6)+', '+lng.toFixed(6)));
  const done=new Set(list.map(f=>f.key)),syn=new Set(['Camera','Lens','ISO','GPSPosition']);
  for(const n of ORDER){if(SKIP.has(n)||syn.has(n)||done.has(n))continue;if(raw[n]!==undefined){list.push(mkField(n,format(n,raw[n])));done.add(n);}}
  for(const n in raw){if(SKIP.has(n)||syn.has(n)||done.has(n))continue;list.push(mkField(n,format(n,raw[n])));done.add(n);}
  list.sort((a,b)=>ORDER.indexOf(a.key)-ORDER.indexOf(b.key));
  return list;
}

export async function loadImage(file){
  const buf=await file.arrayBuffer();
  const raw=parseExif(buf);
  state.exifCount=Object.keys(raw).filter(k=>!SKIP.has(k)&&k!=='ExifIFDPointer'&&k!=='GPSInfoIFDPointer').length;
  const o=raw.Orientation||1;
  let d;
  try{d=await createImageBitmap(file,{imageOrientation:'from-image'});}
  catch(e){const r=await createImageBitmap(file);d=(o>1)?makeUpright(r,o):r;}
  state.image=d;state.imgW=d.width;state.imgH=d.height;
  state.fileName=file.name.replace(/\.[^.]+$/,'')||'image';
  state.fields=buildFields(raw);
  state.focusId=(state.fields.find(f=>f.enabled)||{}).id||null;
  state.rotate=0;state.adj=Object.assign({},{brightness:100,contrast:100,saturation:100,colorFilter:'none'});
  state.zoom=1.0;state.crop=null;state.markup=[];
}

function makeUpright(src,o){const swap=o>=5&&o<=8,w=src.width,h=src.height,c=document.createElement('canvas');c.width=swap?h:w;c.height=swap?w:h;const x=c.getContext('2d');switch(o){case 2:x.transform(-1,0,0,1,w,0);break;case 3:x.transform(-1,0,0,-1,w,h);break;case 4:x.transform(1,0,0,-1,0,h);break;case 5:x.transform(0,1,1,0,0,0);break;case 6:x.transform(0,1,-1,0,h,0);break;case 7:x.transform(0,-1,-1,0,h,w);break;case 8:x.transform(0,-1,1,0,0,w);break;}x.drawImage(src,0,0);return c;}
