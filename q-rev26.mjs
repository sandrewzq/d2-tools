import { DatabaseSync } from 'node:sqlite';
const dir='/Users/longhuadmin/Library/Application Support/d2-tools/manifest/sqlite/zh-chs/active/';
const db=new DatabaseSync(dir+'world.sqlite',{readOnly:true});
const arts=db.prepare(`SELECT CAST(json AS TEXT) AS j FROM DestinyArtifactDefinition`).all().map(r=>JSON.parse(r.j));
const a=arts[0];
console.log('神器:',a.displayProperties.name,'| 字段:',Object.keys(a).join(','));
console.log('tiers[0]:',JSON.stringify(a.tiers[0]).slice(0,700));
console.log('\n每层 items 数:',a.tiers.map(t=>t.items.length).join(','));
const items=db.prepare(`SELECT CAST(json AS TEXT) AS j FROM DestinyInventoryItemDefinition`).all().map(r=>JSON.parse(r.j));
const byHash=new Map(items.map(i=>[i.hash,i]));
let n=0;
for(const t of a.tiers) for(const it of t.items){ if(n<12){const d=byHash.get(it.itemHash); console.log('  item',it.itemHash,'→',d?((d.displayProperties.name||'(无名)')+' / '+(d.itemTypeDisplayName||'-')):'(无定义)'); n++;} }
// 「必须在赛季神器中选择」的规则完整结构
const m=items.find(i=>i.hash===3047946307);
console.log('\n1费破盾充能 insertionRules[1] 完整:');console.log(JSON.stringify(m.plug.insertionRules[1],null,1));
console.log('\n1费破盾充能 enabledRules[1] 完整:');console.log(JSON.stringify(m.plug.enabledRules[1],null,1));
