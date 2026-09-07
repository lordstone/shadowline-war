
import * as THREE from '../vendor/three.module.min.js';
export class Battlefield{
 constructor(container){
 this.container=container;this.time=0;this.fields=[];this.markers=[];this.reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 try{
 this.renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});
 this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));this.renderer.setClearColor(0x070d12,1);this.renderer.outputColorSpace=THREE.SRGBColorSpace;
 container.appendChild(this.renderer.domElement);
 this.scene=new THREE.Scene();this.scene.fog=new THREE.FogExp2(0x080f16,.027);
 this.camera=new THREE.PerspectiveCamera(38,1,.1,150);this.camera.position.set(0,24,29);this.camera.lookAt(0,0,0);
 this.scene.add(new THREE.HemisphereLight(0xa3d3e4,0x17211b,2.3));
 const key=new THREE.DirectionalLight(0xf2d5a6,3.4);key.position.set(-12,20,8);this.scene.add(key);
 const rim=new THREE.DirectionalLight(0x4198c1,2);rim.position.set(10,8,-12);this.scene.add(rim);
 this.ground=new THREE.Group();this.scene.add(this.ground);
 const base=new THREE.Mesh(new THREE.CylinderGeometry(21,23,1.6,6),new THREE.MeshStandardMaterial({color:0x111f25,roughness:1,metalness:.25}));base.position.y=-1.6;this.ground.add(base);
 const grid=new THREE.GridHelper(70,50,0x27434a,0x13232a);grid.position.y=-2.5;this.scene.add(grid);
 this.mapGroup=new THREE.Group();this.ground.add(this.mapGroup);
 const positions=[];for(let i=0;i<180;i++)positions.push(Math.sin(i*12.34)*27,((i*7)%80)/8,Math.cos(i*3.3)*23);
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
 this.particles=new THREE.Points(geo,new THREE.PointsMaterial({color:0x6b9dab,size:.045,transparent:true,opacity:.65}));this.scene.add(this.particles);
 this.resize=()=>{const w=Math.max(1,container.clientWidth),h=Math.max(1,container.clientHeight);this.renderer.setSize(w,h);this.camera.aspect=w/h;this.camera.updateProjectionMatrix();this.camera.updateMatrixWorld()};
 window.addEventListener('resize',this.resize);this.resize();
 this.tick=this.tick.bind(this);this.frame=requestAnimationFrame(this.tick);
 }catch(e){this.renderer?.dispose();this.renderer=null;container.classList.add('no-webgl');console.warn('WebGL unavailable; using tactical 2D map.',e.message)}
 }
 setMap(fields){
 this.fields=fields;if(!this.renderer)return;
 for(const child of [...this.mapGroup.children]){this.mapGroup.remove(child);child.traverse(o=>{o.geometry?.dispose();if(o.material)for(const m of(Array.isArray(o.material)?o.material:[o.material]))m.dispose()})}
 this.markers=[];
 const material=(color,metalness=.25)=>new THREE.MeshStandardMaterial({color,roughness:.8,metalness});
 const coords=f=>new THREE.Vector3((f.x-50)*.32,0,(f.y-52)*.28);
 for(const f of fields){
 const pos=coords(f),color=f.owner===0?0x57c9d5:f.owner===1?0xef795e:0x8d927c;
 const tile=new THREE.Mesh(new THREE.CylinderGeometry(2.5,2.8,.8,6),material(0x273a3c));tile.position.copy(pos);tile.position.y=-.65;this.mapGroup.add(tile);
 const ring=new THREE.Mesh(new THREE.TorusGeometry(1.7,.038,6,48),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.6}));ring.rotation.x=-Math.PI/2;ring.position.copy(pos);ring.position.y=.04;this.mapGroup.add(ring);
 const node=new THREE.Group();node.position.copy(pos);this.mapGroup.add(node);
 const building=(x,z,w,h,d,col)=>{const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material(col));mesh.position.set(x,h/2,z);node.add(mesh);return mesh};
 if(f.capital){
 building(0,0,1.1,2.4,1.1,0x5c6b6d);building(-.85,0,.45,1.25,.8,0x344d52);building(.85,0,.45,1.25,.8,0x344d52);
 const beacon=new THREE.Mesh(new THREE.CylinderGeometry(.04,.04,3.7,6),new THREE.MeshBasicMaterial({color}));beacon.position.y=2.3;node.add(beacon);
 const crown=new THREE.Mesh(new THREE.OctahedronGeometry(.32),new THREE.MeshBasicMaterial({color}));crown.position.y=4.3;node.add(crown);this.markers.push(crown);
 }else if(f.type==='oil'){
 for(const x of[-.65,.65]){const tank=new THREE.Mesh(new THREE.CylinderGeometry(.4,.4,1.1,12),material(0x637471));tank.position.set(x,.55,0);node.add(tank)}
 building(0,-.8,.16,2.5,.16,0x82958b);building(0,-.8,1.3,.15,.18,0x82958b).position.y=2.15;
 }else{building(0,0,.8,1.2,.8,0x697771);building(-.7,.55,.45,.6,.45,0x4e6160);building(.7,.4,.55,.9,.55,0x42575a)}
 const light=new THREE.Mesh(new THREE.BoxGeometry(.7,.055,.06),new THREE.MeshBasicMaterial({color}));light.position.set(0,.55,.6);node.add(light);
 for(const id of f.links){if(f.id.localeCompare(id)>=0)continue;const dest=fields.find(t=>t.id===id);if(!dest)continue;const a=pos.clone(),b=coords(dest);a.y=-.15;b.y=-.15;
 const g=new THREE.BufferGeometry().setFromPoints([a,b]);this.mapGroup.add(new THREE.Line(g,new THREE.LineBasicMaterial({color:0x66858a,transparent:true,opacity:.4})));
 }
 }
 }
 project(f){const p=new THREE.Vector3((f.x-50)*.32,.1,(f.y-52)*.28);p.project(this.camera);return {x:(p.x+1)*50,y:(1-p.y)*50}}
 setMode(mode){this.mode=mode;this.container.classList.toggle('battle-backdrop',mode==='battle')}
 tick(now){this.frame=requestAnimationFrame(this.tick);if(document.hidden||now-this.time<33)return;this.time=now;
 if(!this.reduced){this.particles.rotation.y=now*.000008;this.markers.forEach((m,i)=>{m.rotation.y=now*.0007;m.position.y=4.3+Math.sin(now*.0015+i)*.1})}
 this.renderer.render(this.scene,this.camera);
 }
}
