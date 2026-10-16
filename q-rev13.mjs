import { DatabaseSync } from 'node:sqlite';
const dir='/Users/longhuadmin/Library/Application Support/d2-tools/manifest/sqlite/zh-chs/active/';
const db=new DatabaseSync(dir+'world.sqlite',{readOnly:true});
const items=db.prepare(`SELECT CAST(json AS TEXT) AS j FROM DestinyInventoryItemDefinition`).all().map(r=>JSON.parse(r.j));
const psRaw=db.prepare(`SELECT CAST(json AS TEXT) AS j FROM DestinyPlugSetDefinition`).all().map(r=>JSON.parse(r.j));
const byHash=new Map(items.map(i=>[i.hash,i]));
const name=h=>byHash.get(h)?byHash.get(h).displayProperties.name:('#'+h);
function setItems(p){
  const out=[];
  for(const r of p.reusablePlugItems||[]) if(r.plugItemHash) out.push(r.plugItemHash);
  for(const r of p.reusablePlugEntries||[]) for(const h of r.plugItemHashes||[]) out.push(h);
  return out;
}
const ps=new Map(psRaw.map(p=>[p.hash,setItems(p)]));
console.log('插件集总数',psRaw.length,'| 非空集合',[...ps.values()].filter(v=>v.length).length);
console.log('单集最大',Math.max(...[...ps.values()].map(v=>v.length)));
const H={}; for(const n of ['支援框架','箭头制退器','螺旋膛线','槽化枪管','精确弹药','附加弹匣','战术弹匣','医治','维持生计','爆破专家','辉耀炽热','狂乱','腹背受敌','备用弹匣','徒手握把','雷达调谐器']){const it=items.find(i=>i.displayProperties.name===n&&i.plug&&i.plug.plugCategoryIdentifier!==undefined);H[n]=it.hash;}
const AR=items.filter(i=>i.itemTypeDisplayName==='自动步枪'&&i.inventory&&i.inventory.tierType===5&&!i.redacted&&i.sockets&&i.sockets.socketEntries.length>=6);
let hits=[];
for(const w of AR){
  const sets=w.sockets.socketEntries.map(s=>{const h=s.randomizedPlugSetHash||s.reusablePlugSetHash;return h&&ps.get(h)?ps.get(h):[];});
  const flat=sets.flat();
  const missing=Object.keys(H).filter(k=>!flat.includes(H[k]));
  if(missing.length===0) hits.push({w,sizes:sets.map(s=>s.length),names:sets.map(s=>s.slice(0,3).map(name))});
}
console.log('\n命中',hits.length);
for(const h of hits.slice(0,4)){
  console.log('\n### '+h.w.displayProperties.name+' #'+h.w.hash+' 池子='+h.sizes.join('/'));
  h.names.forEach((n,i)=>console.log('   ['+i+'] '+h.sizes[i]+' → '+n.join('、')));
}
