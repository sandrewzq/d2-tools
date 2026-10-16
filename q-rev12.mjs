import { DatabaseSync } from 'node:sqlite';
const dir='/Users/longhuadmin/Library/Application Support/d2-tools/manifest/sqlite/zh-chs/active/';
const db=new DatabaseSync(dir+'world.sqlite',{readOnly:true});
const items=db.prepare(`SELECT CAST(json AS TEXT) AS j FROM DestinyInventoryItemDefinition`).all().map(r=>JSON.parse(r.j));
const ps=new Map(db.prepare(`SELECT CAST(json AS TEXT) AS j FROM DestinyPlugSetDefinition`).all().map(r=>[JSON.parse(r.j).hash,JSON.parse(r.j)]));
const byHash=new Map(items.map(i=>[i.hash,i]));
const name=h=>byHash.get(h)?byHash.get(h).displayProperties.name:('#'+h);
const H={}; for(const n of ['支援框架','箭头制退器','螺旋膛线','槽化枪管','精确弹药','附加弹匣','战术弹匣','医治','维持生计','爆破专家','辉耀炽热','狂乱','腹背受敌','备用弹匣','徒手握把','雷达调谐器']){const it=items.find(i=>i.displayProperties.name===n&&(i.plug&&i.plug.plugCategoryIdentifier!==undefined));if(it)H[n]=it.hash;}
console.log('perk hash 表:',H);
const AR=items.filter(i=>i.itemTypeDisplayName==='自动步枪'&&i.inventory&&i.inventory.tierType===5&&!i.redacted&&i.sockets&&i.sockets.socketEntries.length>=6);
let hits=[];
for(const w of AR){
  const ents=w.sockets.socketEntries;
  const sets=ents.map(s=>{
    const h=s.randomizedPlugSetHash||s.reusablePlugSetHash;
    const p=h&&ps.get(h);
    const list=p?(p.reusablePlugItems||[]).map(x=>x.plugItemHash):[];
    return list;
  });
  const flat=sets.flat();
  if(!Object.values(H).every(h=>flat.includes(h))) continue;
  hits.push({w,sets:sets.map(s=>s.length),names:sets.map(s=>s.slice(0,3).map(name))});
}
console.log('\n同时含全部示例项的传说自动步枪:',hits.length);
for(const h of hits.slice(0,5)){
  console.log('\n### '+h.w.displayProperties.name+' #'+h.w.hash+'  池子='+h.sets.join('/'));
  h.names.forEach((n,i)=>console.log('   ['+i+'] '+h.sets[i]+' → '+n.join('、')));
}
