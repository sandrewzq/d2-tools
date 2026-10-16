import { DatabaseSync } from 'node:sqlite';
const dir='/Users/longhuadmin/Library/Application Support/d2-tools/manifest/sqlite/zh-chs/active/';
const db=new DatabaseSync(dir+'world.sqlite',{readOnly:true});
const items=db.prepare(`SELECT CAST(json AS TEXT) AS j FROM DestinyInventoryItemDefinition`).all().map(r=>JSON.parse(r.j));
const a=items.find(i=>i.hash===48578555), b=items.find(i=>i.hash===3047946307);
for(const [k,x] of [['4费',a],['1费',b]]){
  const p=x.plug||{};
  console.log(k,'plugAvailability=',p.plugAvailability,'| uiPlugLabel="'+p.uiPlugLabel+'"| plugStyle=',p.plugStyle,'| canInsert=',p.canInsert,'| isDummyPlug=',p.isDummyPlug,'| energyCost=',JSON.stringify(p.energyCost));
}
// 神器特性里是否有指向护甲模组的
const arts=db.prepare(`SELECT CAST(json AS TEXT) AS j FROM DestinyArtifactDefinition`).all().map(r=>JSON.parse(r.j));
const byHash=new Map(items.map(i=>[i.hash,i]));
const modHashes=new Set(items.filter(i=>i.itemTypeDisplayName&&/护甲模组$/.test(i.itemTypeDisplayName)&&JSON.stringify(i.plug&&i.plug.insertionRules||[]).includes('赛季神器')).map(i=>i.hash));
let link=0;
for(const art of arts) for(const t of art.tiers) for(const it of t.items){ const d=byHash.get(it.itemHash);
  if(!d) continue; const s=JSON.stringify(d);
  for(const h of modHashes) if(s.includes(':'+h+',')) { link++; console.log('神器条目',d.displayProperties.name,'引用护甲模组 hash',h); }
}
console.log('神器→护甲模组 引用数',link);
