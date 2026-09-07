
export const SUITS=['♠','♥','♣','♦'];
export const STRATEGIES=[
 {id:'conscription',name:'征召令',icon:'✚',phase:'campaign',count:3,desc:'从公共牌库随机补充 1 张暗牌。'},
 {id:'meds_team',name:'医疗分队',icon:'✥',phase:'campaign',count:2,desc:'从自己的公开战利品中随机回收 1 张到暗牌手牌。'},
 {id:'spy',name:'潜伏密探',icon:'◈',phase:'battle',count:2,desc:'秘密查看敌方 1 张未翻开的战线牌；不将它翻开。'},
 {id:'isr',name:'全域侦察',icon:'◎',phase:'campaign',count:2,desc:'永久揭示选中敌方据点的 1 张驻军牌。'},
 {id:'paratrooper',name:'空降增援',icon:'↧',phase:'battle',count:2,desc:'从公共牌库增加 1 张明牌到己方战线；战线仍最多 3 张。'},
 {id:'rank_up',name:'战地晋升',icon:'↑',phase:'battle',count:2,desc:'己方 1 张普通明牌点数 +1（最高 K），仅在本次交锋生效。'},
 {id:'scouting',name:'火力侦搜',icon:'⌖',phase:'battle',count:2,desc:'强制翻开敌方 1 张战线暗牌。'},
 {id:'peace_talk',name:'停火谈判',icon:'⚑',phase:'battle',count:1,desc:'结束交锋。各自明牌进入各自公开牌堆，暗牌收回。领地不变。'},
 {id:'revolution',name:'起义烽火',icon:'✦',phase:'campaign',count:1,desc:'以一张新生成的公开 A 占领选中的中立据点，消耗本回合行动。'},
 {id:'blitzkrieg',name:'闪电战',icon:'ϟ',phase:'battle',count:1,desc:'立即让当前未被压制的一方赢得交锋。'},
 {id:'international_support',name:'国际援助',icon:'▣',phase:'campaign',count:2,desc:'获得 1–13 点补给；每 2 点可从公共牌库补充 1 张。'},
 {id:'airborne_raid',name:'纵深空袭',icon:'⤴',phase:'campaign',count:1,desc:'本回合可以占领或进攻任意选中据点，忽略相邻限制。'},
 {id:'economic_sanctions',name:'经济封锁',icon:'⊘',phase:'campaign',count:2,desc:'封锁选中敌方据点的补给产出 1–13 个完整回合。'}
];
const f=(id,label,type,x,y,links,owner=null,capital=false)=>({id,label,type,x,y,links,owner,capital,garrison:[],blockedUntil:0});
export const MAPS=[
 {id:'duel',name:'双都对峙',subtitle:'5 个据点 · 快速交锋',desc:'两座首都隔着中央城镇相望。争夺侧翼油田，直取敌方指挥部。',fields:[
 f('p1_capital','苍岚首都','capital',16,74,['p1_oil','center_town'],0,true),
 f('p1_oil','西部油田','oil',34,44,['p1_capital','center_town']),
 f('center_town','中央城镇','town',50,60,['p1_capital','p1_oil','p2_oil','p2_capital']),
 f('p2_oil','东部油田','oil',66,44,['p2_capital','center_town']),
 f('p2_capital','赤烬首都','capital',84,74,['p2_oil','center_town'],1,true)]},
 {id:'rift',name:'裂谷防线',subtitle:'7 个据点 · 双线突破',desc:'两条进军路线穿过峡谷。控制中继站，撕开对方防线。',fields:[
 f('a','苍岚首都','capital',12,54,['b','c'],0,true),
 f('b','北部隘口','town',32,28,['a','d','e']),
 f('c','南部油田','oil',32,76,['a','d','f']),
 f('d','峡谷中继','town',50,52,['b','c','e','f']),
 f('e','北部油田','oil',68,28,['b','d','g']),
 f('f','南部隘口','town',68,76,['c','d','g']),
 f('g','赤烬首都','capital',88,54,['e','f'],1,true)]},
 {id:'ring',name:'灰烬环岛',subtitle:'9 个据点 · 环线包抄',desc:'环岛道路与中央堡垒相连。选择正面突破，或沿海岸迂回。',fields:[
 f('a','苍岚首都','capital',12,52,['b','h'],0,true),
 f('b','北港','town',24,25,['a','c','i']),
 f('c','北部油田','oil',50,18,['b','d']),
 f('d','东部雷达','town',76,25,['c','e','i']),
 f('e','赤烬首都','capital',88,52,['d','f'],1,true),
 f('f','南港','town',76,79,['e','g','i']),
 f('g','南部油田','oil',50,87,['f','h']),
 f('h','西部雷达','town',24,79,['g','a','i']),
 f('i','中央堡垒','town',50,52,['b','d','f','h'])]}
];
export const defaults={mode:'ai',map:'duel',rules:'campaign',difficulty:'normal',timer:0,seed:2026,strategies:true,first:0,maxRounds:80,sound:true};
export const strategyById=id=>STRATEGIES.find(s=>s.id===id);
