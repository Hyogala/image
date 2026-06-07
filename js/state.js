"use strict";
export const DEFAULT_STYLE = {
  position:'bottom', mode:'extend', bg:'#000000', bgOpacity:0.85,
  family:'mono', weight:'600', fontPct:2.0, color:'#ffffff',
  pad:1.6, lineGap:0.5, sep:'  ·  ', showLabels:false, labelSep:'：',
  line:true, lineColor:'#e3a24a', lineW:2, autofit:true, barStyle:'solid',
  borderTop:0, borderBottom:0, borderLeft:0, borderRight:0, borderColor:'#ffffff',
};
export const DEFAULT_OUT = {format:'jpeg', quality:0.92, maxEdge:0};
export const DEFAULT_ADJ = {brightness:100, contrast:100, saturation:100, colorFilter:'none'};
export const FAMILY = {
  sans:'"Helvetica Neue",Arial,"Hiragino Sans",sans-serif',
  serif:'Georgia,"Times New Roman","Yu Mincho",serif',
  mono:'"Menlo","Consolas",monospace',
  condensed:'"Arial Narrow","Roboto Condensed",sans-serif',
};
export const WNAME = {300:'細字',400:'標準',500:'中字',600:'やや太',700:'太字',800:'極太'};

export const state = {
  image:null, fileName:'', imgW:0, imgH:0, exifCount:0, fields:[],
  style:Object.assign({},DEFAULT_STYLE),
  out:Object.assign({},DEFAULT_OUT),
  adj:Object.assign({},DEFAULT_ADJ),
  tab:'bar', tool:'fontPct', focusId:null,
  rotate:0, zoom:1.0, crop:null,
  markup:[], markupActive:false,
};

export const TAGS={0x0100:'ImageWidth',0x0101:'ImageHeight',0x010F:'Make',0x0110:'Model',0x0112:'Orientation',0x011A:'XResolution',0x011B:'YResolution',0x0128:'ResolutionUnit',0x0131:'Software',0x0132:'DateTime',0x013B:'Artist',0x8298:'Copyright',0x8769:'ExifIFDPointer',0x8825:'GPSInfoIFDPointer',0x829A:'ExposureTime',0x829D:'FNumber',0x8822:'ExposureProgram',0x8827:'ISOSpeedRatings',0x8830:'SensitivityType',0x8832:'RecommendedExposureIndex',0x9000:'ExifVersion',0x9003:'DateTimeOriginal',0x9004:'DateTimeDigitized',0x9201:'ShutterSpeedValue',0x9202:'ApertureValue',0x9203:'BrightnessValue',0x9204:'ExposureBiasValue',0x9205:'MaxApertureValue',0x9206:'SubjectDistance',0x9207:'MeteringMode',0x9208:'LightSource',0x9209:'Flash',0x920A:'FocalLength',0x927C:'MakerNote',0x9286:'UserComment',0xA001:'ColorSpace',0xA002:'PixelXDimension',0xA003:'PixelYDimension',0xA402:'ExposureMode',0xA403:'WhiteBalance',0xA404:'DigitalZoomRatio',0xA405:'FocalLengthIn35mmFilm',0xA406:'SceneCaptureType',0xA408:'Contrast',0xA409:'Saturation',0xA40A:'Sharpness',0xA420:'ImageUniqueID',0xA430:'CameraOwnerName',0xA431:'BodySerialNumber',0xA432:'LensSpecification',0xA433:'LensMake',0xA434:'LensModel',0xA435:'LensSerialNumber'};
export const GPS_TAGS={0x0000:'GPSVersionID',0x0001:'GPSLatitudeRef',0x0002:'GPSLatitude',0x0003:'GPSLongitudeRef',0x0004:'GPSLongitude',0x0005:'GPSAltitudeRef',0x0006:'GPSAltitude',0x0007:'GPSTimeStamp',0x0012:'GPSMapDatum',0x001D:'GPSDateStamp'};
export const TYPE_SIZE={1:1,2:1,3:2,4:4,5:8,7:1,9:4,10:8};

export const EP={0:'Not defined',1:'Manual',2:'Program AE',3:'Aperture priority',4:'Shutter priority',5:'Creative',6:'Action',7:'Portrait',8:'Landscape'};
export const MM={0:'Unknown',1:'Average',2:'Center-weighted',3:'Spot',4:'Multi-spot',5:'Multi-segment',6:'Partial',255:'Other'};
export const WBM={0:'Auto',1:'Manual'};export const EXM={0:'Auto',1:'Manual',2:'Auto bracket'};export const SC={0:'Standard',1:'Landscape',2:'Portrait',3:'Night'};
export const OR={1:'Normal',2:'Mirror H',3:'180°',4:'Mirror V',5:'Mirror90',6:'90° CW',7:'Mirror90',8:'90° CCW'};

export const JP={Camera:'カメラ',Lens:'レンズ',Make:'メーカー',Model:'機種',FNumber:'絞り',ExposureTime:'シャッター速度',ISO:'ISO感度',FocalLength:'焦点距離',FocalLengthIn35mmFilm:'35mm換算',ExposureBiasValue:'露出補正',ExposureProgram:'露出プログラム',MeteringMode:'測光モード',WhiteBalance:'WB',Flash:'フラッシュ',ExposureMode:'露出モード',SceneCaptureType:'撮影シーン',DateTimeOriginal:'撮影日時',DateTimeDigitized:'デジタル化',DateTime:'更新日時',GPSPosition:'位置情報',GPSAltitude:'高度',Software:'ソフト',Artist:'撮影者',Copyright:'著作権',LensModel:'レンズ名',LensMake:'レンズ製造',Orientation:'向き',ColorSpace:'色空間',BodySerialNumber:'シリアル',CameraOwnerName:'所有者',PixelXDimension:'幅px',PixelYDimension:'高さpx',ApertureValue:'絞り(APEX)',ShutterSpeedValue:'SS(APEX)',MaxApertureValue:'開放F値'};
export const ORDER=['DateTimeOriginal','Camera','Lens','FNumber','ExposureTime','ISO','FocalLength','FocalLengthIn35mmFilm','ExposureBiasValue','ExposureProgram','MeteringMode','WhiteBalance','Flash','ExposureMode','SceneCaptureType','DateTimeDigitized','DateTime','GPSPosition','GPSAltitude','Make','Model','LensModel','LensMake','Software','Artist','Copyright','CameraOwnerName','BodySerialNumber','Orientation','ColorSpace','PixelXDimension','PixelYDimension','ApertureValue','ShutterSpeedValue','MaxApertureValue'];
export const ENABLED=new Set(['DateTimeOriginal','Camera','Lens','FNumber','ExposureTime','ISO','FocalLength']);
export const ZL=new Set(['DateTimeOriginal','DateTimeDigitized','DateTime','Camera','Lens','Make','Model','LensModel','LensMake','Software','Artist','Copyright','CameraOwnerName','BodySerialNumber']);
export const ZC=new Set(['GPSPosition','GPSAltitude']);
export const SKIP=new Set(['ExifIFDPointer','GPSInfoIFDPointer','GPSLatitude','GPSLongitude','GPSLatitudeRef','GPSLongitudeRef','GPSAltitudeRef','GPSVersionID','GPSTimeStamp','GPSMapDatum','GPSDateStamp','MakerNote','UserComment','ExifVersion','ImageUniqueID','SensitivityType','RecommendedExposureIndex','LightSource','BrightnessValue','Contrast','Saturation','Sharpness','LensSpecification','LensSerialNumber','SubjectDistance','XResolution','YResolution','ImageWidth','ImageHeight','ISOSpeedRatings']);
