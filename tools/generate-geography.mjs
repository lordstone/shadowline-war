import fs from 'node:fs';

const root=new URL('./natural-earth/',import.meta.url);
const sources={
 countries:'countries.geojson',
 rivers:'rivers.geojson',
 lakes:'lakes.geojson'
};
const maps={
 eastern_front:{bbox:[10,38,52,62]},
 korea:{bbox:[123,32,132,44]},
 western_front:{bbox:[-6,42,16,56]},
 hormuz:{bbox:[51,22,61,29]},
 china_civil_war:{bbox:[102,18,127,44]}
};

const data=Object.fromEntries(Object.entries(sources).map(([key,file])=>[key,JSON.parse(fs.readFileSync(new URL(file,root),'utf8'))]));
const points=geometry=>{
 const out=[];const visit=value=>Array.isArray(value?.[0])?value.forEach(visit):out.push(value);
 visit(geometry.coordinates);return out;
};
const intersects=(geometry,[west,south,east,north])=>{
 const pts=points(geometry),xs=pts.map(p=>p[0]),ys=pts.map(p=>p[1]);
 return Math.max(...xs)>=west&&Math.min(...xs)<=east&&Math.max(...ys)>=south&&Math.min(...ys)<=north;
};
const project=([lon,lat],[west,south,east,north])=>[(lon-west)/(east-west)*100,(north-lat)/(north-south)*100];
const distance=(p,a,b)=>{
 const dx=b[0]-a[0],dy=b[1]-a[1];if(!dx&&!dy)return Math.hypot(p[0]-a[0],p[1]-a[1]);
 const t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy))),x=a[0]+t*dx,y=a[1]+t*dy;
 return Math.hypot(p[0]-x,p[1]-y);
};
const simplify=(pts,tolerance=.22)=>{
 if(pts.length<3)return pts;let max=0,index=0;
 for(let i=1;i<pts.length-1;i++){const d=distance(pts[i],pts[0],pts.at(-1));if(d>max){max=d;index=i}}
 if(max<=tolerance)return [pts[0],pts.at(-1)];
 return [...simplify(pts.slice(0,index+1),tolerance).slice(0,-1),...simplify(pts.slice(index),tolerance)];
};
const linePath=(line,bbox,close=false)=>{
 const p=simplify(line.map(point=>project(point,bbox)));
 return p.length>1?'M'+p.map(([x,y])=>x.toFixed(2)+' '+y.toFixed(2)).join('L')+(close?'Z':''):'';
};
const clipRing=(ring,[west,south,east,north])=>{
 let out=ring;
 const edges=[
  [p=>p[0]>=west,(a,b)=>[west,a[1]+(b[1]-a[1])*(west-a[0])/(b[0]-a[0])]],
  [p=>p[0]<=east,(a,b)=>[east,a[1]+(b[1]-a[1])*(east-a[0])/(b[0]-a[0])]],
  [p=>p[1]>=south,(a,b)=>[a[0]+(b[0]-a[0])*(south-a[1])/(b[1]-a[1]),south]],
  [p=>p[1]<=north,(a,b)=>[a[0]+(b[0]-a[0])*(north-a[1])/(b[1]-a[1]),north]]
 ];
 for(const [inside,intersection] of edges){const input=out;out=[];if(!input.length)break;let a=input.at(-1);for(const b of input){const ai=inside(a),bi=inside(b);if(bi){if(!ai)out.push(intersection(a,b));out.push(b)}else if(ai)out.push(intersection(a,b));a=b}}
 return out.length>2?[...out,out[0]]:[];
};
const clipSegment=(a,b,[west,south,east,north])=>{
 let t0=0,t1=1,dx=b[0]-a[0],dy=b[1]-a[1];
 for(const [p,q] of [[-dx,a[0]-west],[dx,east-a[0]],[-dy,a[1]-south],[dy,north-a[1]]]){if(!p){if(q<0)return null;continue}const t=q/p;if(p<0){if(t>t1)return null;t0=Math.max(t0,t)}else{if(t<t0)return null;t1=Math.min(t1,t)}}
 return [[a[0]+t0*dx,a[1]+t0*dy],[a[0]+t1*dx,a[1]+t1*dy]];
};
const clippedLinePath=(line,bbox)=>{
 const parts=[];let current=[];
 for(let i=1;i<line.length;i++){const segment=clipSegment(line[i-1],line[i],bbox);if(!segment){if(current.length>1)parts.push(current);current=[];continue}if(!current.length||current.at(-1)[0]!==segment[0][0]||current.at(-1)[1]!==segment[0][1]){if(current.length>1)parts.push(current);current=[segment[0]]}current.push(segment[1])}
 if(current.length>1)parts.push(current);return parts.map(p=>linePath(p,bbox)).join('');
};
const geometryPath=(geometry,bbox)=>{
 if(geometry.type==='Polygon')return geometry.coordinates.map(r=>clipRing(r,bbox)).filter(r=>r.length).map(r=>linePath(r,bbox,true)).join('');
 if(geometry.type==='MultiPolygon')return geometry.coordinates.flatMap(p=>p.map(r=>clipRing(r,bbox))).filter(r=>r.length).map(r=>linePath(r,bbox,true)).join('');
 if(geometry.type==='LineString')return clippedLinePath(geometry.coordinates,bbox);
 if(geometry.type==='MultiLineString')return geometry.coordinates.map(l=>clippedLinePath(l,bbox)).join('');
 return '';
};
const layer=(collection,bbox,cls)=>collection.features.filter(f=>f.geometry&&intersects(f.geometry,bbox)).map(f=>'<path class="'+cls+'" d="'+geometryPath(f.geometry,bbox)+'"/>').join('');
const generated={};
for(const [id,{bbox}] of Object.entries(maps))generated[id]=
 '<g class="geo-land">'+layer(data.countries,bbox,'land')+'</g>'+ 
 '<g class="geo-water">'+layer(data.lakes,bbox,'lake')+'</g>'+ 
 '<g class="geo-rivers">'+layer(data.rivers,bbox,'river')+'</g>'+ 
 '<text class="geo-source" x="98" y="98">NATURAL EARTH · PUBLIC DOMAIN</text>';

const output='// Generated from Natural Earth 1:50m public-domain data.\n// https://www.naturalearthdata.com/\nexport const GEO_BACKDROPS='+JSON.stringify(generated)+';\n';
fs.writeFileSync(new URL('../src/map-geography.js',import.meta.url),output);
console.log('Generated src/map-geography.js ('+Buffer.byteLength(output)+' bytes)');
