import { DatabaseSync } from 'node:sqlite';
const dir='/Users/longhuadmin/Library/Application Support/d2-tools/manifest/sqlite/zh-chs/active/';
const db=new DatabaseSync(dir+'world.sqlite',{readOnly:true});
const items=db.prepare(`SELECT CAST(json AS TEXT) AS j FROM DestinyInventoryItemDefinition`).all().map(r=>JSON.parse(r.j));
const exoW=items.find(i=>/异域/.test(i.itemTypeAndTierDisplayName||'')&&/自动步枪|手炮/.test(i.itemTypeDisplayName||'')&&i.inventory&&i.inventory.tierType===6&&i.equippingBlock);
const legW=items.find(i=>/传说/.test(i.itemTypeAndTierDisplayName||'')&&i.itemTypeDisplayName==='手炮'&&i.inventory&&i.inventory.tierType===5&&i.equippingBlock);
const exoA=items.find(i=>/异域/.test(i.itemTypeAndTierDisplayName||'')&&i.itemTypeDisplayName==='头盔'&&i.inventory&&i.inventory.tierType===6&&i.equippingBlock);
console.log('异域武器',exoW.displayProperties.name);console.log(' ',JSON.stringify(exoW.equippingBlock));
console.log('传说武器',legW.displayProperties.name);console.log(' ',JSON.stringify(legW.equippingBlock));
console.log('异域护甲',exoA.displayProperties.name);console.log(' ',JSON.stringify(exoA.equippingBlock));
// 全表扫：任何非 displayProperties 字段里出现「异域」+数量限制语义
const tabs=db.prepare(`SELECT name FROM sqlite_master WHERE type='table'`).all().map(r=>r.name);
for(const t of tabs){
  if(t.startsWith('DestinyInventoryItem')) continue;
  let rows; try{rows=db.prepare(`SELECT CAST(json AS TEXT) AS j FROM "${t}"`).all();}catch(e){continue;}
  for(const r of rows){ if(r.j&&/异域/.test(r.j)&&/(只能|至多|唯一)/.test(r.j)) console.log('★['+t+']',r.j.slice(0,300)); }
}
console.log('扫完');
