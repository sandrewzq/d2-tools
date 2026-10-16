import { DatabaseSync } from 'node:sqlite';
const dir='/Users/longhuadmin/Library/Application Support/d2-tools/manifest/sqlite/zh-chs/active/';
const db=new DatabaseSync(dir+'world.sqlite',{readOnly:true});
const items=db.prepare(`SELECT CAST(json AS TEXT) AS j FROM DestinyInventoryItemDefinition`).all().map(r=>JSON.parse(r.j));
const hits=items.filter(i=>{const d=(i.displayProperties&&(i.displayProperties.description||''))+' '+(i.displayProperties&&(i.displayProperties.name||''))+ ' ' + JSON.stringify(i.tooltipNotifications||[]);
  return /神器/.test(d) && /模组|费用|消耗/.test(d);});
console.log('含「神器」+模组/费用 的条目:',hits.length);
for(const h of hits.slice(0,15)) console.log('  ',(h.displayProperties.name||'(无名)'),'|',h.itemTypeDisplayName,'|',(h.displayProperties.description||'').replace(/\n/g,' ').slice(0,150));
// 神器特性样本结构
const ap=items.find(i=>i.hash===4217417017);
console.log('\n神器特性样本:',ap.displayProperties.name,'| type',ap.itemTypeDisplayName,'| keys',Object.keys(ap).join(','));
console.log('  plug:',JSON.stringify(ap.plug||{}).slice(0,400));
console.log('  desc:',(ap.displayProperties.description||'').slice(0,300));
