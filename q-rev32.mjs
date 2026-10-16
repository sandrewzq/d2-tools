import { DatabaseSync } from 'node:sqlite';
const dir='/Users/longhuadmin/Library/Application Support/d2-tools/manifest/sqlite/zh-chs/active/';
const db=new DatabaseSync(dir+'world.sqlite',{readOnly:true});
const items=db.prepare(`SELECT CAST(json AS TEXT) AS j FROM DestinyInventoryItemDefinition`).all().map(r=>JSON.parse(r.j));
const pick=n=>items.find(i=>i.displayProperties.name===n&&i.inventory&&i.inventory.tierType===6);
for(const n of ['第二次机会','无知希冀','雄鹿','复兴之握']){
  const i=pick(n); if(!i){console.log(n,'未找到');continue;}
  console.log('\n'+n+' #'+i.hash,'| itemType',i.itemType,'| itemTypeDisplayName',i.itemTypeDisplayName,'| andTier',i.itemTypeAndTierDisplayName);
  console.log('  equippingBlock:',JSON.stringify(i.equippingBlock));
  console.log('  classType',i.classType,'| 插槽数',i.sockets&&i.sockets.socketEntries.length,'| redacted',i.redacted,'| blacklisted',i.blacklisted,'| 可装备',i.equippable);
  console.log('  itemCategoryHashes',JSON.stringify(i.itemCategoryHashes));
}
