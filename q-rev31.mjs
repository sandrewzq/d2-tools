import { DatabaseSync } from 'node:sqlite';
const dir='/Users/longhuadmin/Library/Application Support/d2-tools/manifest/sqlite/zh-chs/active/';
const db=new DatabaseSync(dir+'world.sqlite',{readOnly:true});
const items=db.prepare(`SELECT CAST(json AS TEXT) AS j FROM DestinyInventoryItemDefinition`).all().map(r=>JSON.parse(r.j));
const slots=['头盔','臂铠','胸甲','腿甲','职业物品'];
const exoArmor=items.filter(i=>i.inventory&&i.inventory.tierType===6&&slots.includes(i.itemTypeDisplayName||''));
const lab=i=>i.equippingBlock&&i.equippingBlock.uniqueLabel;
const noLab=exoArmor.filter(i=>!lab(i));
console.log('无标签异域护甲',noLab.length);
const c={};
for(const i of noLab){const k=(i.itemTypeAndTierDisplayName||'?')+' | redacted:'+i.redacted+' | blacklisted:'+i.blacklisted; c[k]=(c[k]||0)+1;}
Object.entries(c).sort((a,b)=>b[1]-a[1]).slice(0,8).forEach(([k,v])=>console.log('  ',k,'×',v));
console.log('  样例:',noLab.slice(0,6).map(i=>i.displayProperties.name+'('+i.itemTypeAndTierDisplayName+')').join('、'));
const modern=exoArmor.filter(i=>i.sockets&&i.sockets.socketEntries.length>12);
console.log('\n插槽>12 的异域护甲',modern.length,'| 其中无标签',modern.filter(i=>!lab(i)).length,'| 有标签',modern.filter(i=>lab(i)).length);
const m0=modern.filter(i=>!lab(i)).slice(0,5);
console.log('  无标签样例:',m0.map(i=>i.displayProperties.name).join('、'));
