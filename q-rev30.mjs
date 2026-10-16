import { DatabaseSync } from 'node:sqlite';
const dir='/Users/longhuadmin/Library/Application Support/d2-tools/manifest/sqlite/zh-chs/active/';
const db=new DatabaseSync(dir+'world.sqlite',{readOnly:true});
const items=db.prepare(`SELECT CAST(json AS TEXT) AS j FROM DestinyInventoryItemDefinition`).all().map(r=>JSON.parse(r.j));
const slots=['头盔','臂铠','胸甲','腿甲','职业物品'];
const exoArmor=items.filter(i=>i.inventory&&i.inventory.tierType===6&&slots.includes(i.itemTypeDisplayName||''));
const legArmor=items.filter(i=>i.inventory&&i.inventory.tierType===5&&slots.includes(i.itemTypeDisplayName||'')&&!i.redacted);
const w=items.filter(i=>i.inventory&&(i.inventory.tierType===5||i.inventory.tierType===6)&&/步枪|手炮|霰弹枪|机枪|刀剑|弓|榴弹|火箭|手枪|微冲|融合|追踪|斥候|脉冲/.test(i.itemTypeDisplayName||''));
const grp=(l)=>{const m={};for(const i of l){const u=(i.equippingBlock&&i.equippingBlock.uniqueLabel)||'(空)';m[u]=(m[u]||0)+1;}return m;};
console.log('异域护甲',exoArmor.length,'uniqueLabel 分布:',JSON.stringify(grp(exoArmor)));
console.log('传说护甲',legArmor.length,'uniqueLabel 分布:',JSON.stringify(grp(legArmor)));
console.log('武器(传说+异域)',w.length,'uniqueLabel 分布(前8):',JSON.stringify(Object.fromEntries(Object.entries(grp(w)).sort((a,b)=>b[1]-a[1]).slice(0,8))));
// 异域武器
const exoW=items.filter(i=>i.inventory&&i.inventory.tierType===6&&/步枪|手炮|霰弹枪|机枪|刀剑|弓|榴弹|火箭|手枪|微冲|融合|追踪|斥候|脉冲/.test(i.itemTypeDisplayName||''));
console.log('异域武器',exoW.length,'uniqueLabel 分布:',JSON.stringify(grp(exoW)));
