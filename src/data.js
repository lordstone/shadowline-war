
export const SUITS=['♠','♥','♣','♦'];
export const STRATEGIES=[
 {id:'conscription',name:'征召令',icon:'✚',phase:'campaign',count:3,price:3,desc:'从公共牌库补充 2 张暗牌，不占用本回合普通补牌次数。'},
 {id:'meds_team',name:'医疗分队',icon:'✥',phase:'campaign',count:2,price:3,desc:'从自己的公开牌堆回收点数最高的 1 张到暗牌手牌。'},
 {id:'spy',name:'潜伏密探',icon:'◈',phase:'battle',count:2,price:3,desc:'秘密查看敌方 1 张未翻开的战线牌；不将它翻开。'},
 {id:'isr',name:'全域侦察',icon:'◎',phase:'campaign',count:2,price:4,desc:'永久揭示选中敌方据点的 1 张驻军牌。'},
 {id:'paratrooper',name:'空降增援',icon:'↧',phase:'battle',count:2,price:5,desc:'从公共牌库增加 1 张明牌到己方战线；战线仍受地形容量限制。'},
 {id:'rank_up',name:'战地晋升',icon:'↑',phase:'battle',count:2,price:3,desc:'己方 1 张普通明牌点数 +2（最高 K），仅在本次交锋生效。'},
 {id:'scouting',name:'火力侦搜',icon:'⌖',phase:'battle',count:2,price:4,desc:'强制翻开敌方 1 张战线暗牌并立刻重新比较。'},
 {id:'peace_talk',name:'停火谈判',icon:'⚑',phase:'battle',count:1,price:4,desc:'结束交锋。各自明牌进入各自公开牌堆，暗牌收回，领地不变。'},
 {id:'revolution',name:'起义烽火',icon:'✦',phase:'campaign',count:1,price:6,desc:'以一张新生成的公开 A 占领选中的中立据点，消耗主要行动。'},
 {id:'blitzkrieg',name:'闪电战',icon:'ϟ',phase:'battle',count:1,price:7,desc:'立即让当前未被压制的一方赢得交锋。'},
 {id:'international_support',name:'国际援助',icon:'▣',phase:'campaign',count:2,price:4,desc:'立即获得 6 点补给。'},
 {id:'airborne_raid',name:'纵深空袭',icon:'⤴',phase:'campaign',count:1,price:5,desc:'本回合可以占领或进攻 2 格范围内的选中据点，忽略相邻限制。'},
 {id:'economic_sanctions',name:'经济封锁',icon:'⊘',phase:'campaign',count:2,price:4,desc:'封锁选中敌方据点的补给产出 3 个完整回合。'}
];
const f=(id,label,type,x,y,links,owner=null,capital=false,fortified=false)=>({id,label,type,x,y,links,owner,capital,fortified,garrison:[],blockedUntil:0});
export const MAPS=[
 {id:'duel',name:'双都对峙',subtitle:'5 个据点 · 快速交锋',desc:'两座首都隔着中央城镇相望。争夺侧翼油田，直取敌方指挥部。',factions:['北境联合','南境联盟'],fields:[
 f('p1_capital','西境指挥部','capital',16,74,['p1_oil','center_town'],0,true),
 f('p1_oil','西部油田','oil',34,44,['p1_capital','center_town']),
 f('center_town','中央城镇','town',50,60,['p1_capital','p1_oil','p2_oil','p2_capital'],null,false,true),
 f('p2_oil','东部油田','oil',66,44,['p2_capital','center_town']),
 f('p2_capital','东境指挥部','capital',84,74,['p2_oil','center_town'],1,true)]},
 {id:'rift',name:'裂谷防线',subtitle:'7 个据点 · 双线突破',desc:'两条进军路线穿过峡谷。控制中继站，撕开对方防线。',factions:['峡谷守军','高原军团'],fields:[
 f('a','西部指挥部','capital',12,54,['b','c'],0,true),
 f('b','北部隘口','town',32,28,['a','d','e']),
 f('c','南部油田','oil',32,76,['a','d','f']),
 f('d','峡谷中继','town',50,52,['b','c','e','f'],null,false,true),
 f('e','北部油田','oil',68,28,['b','d','g']),
 f('f','南部隘口','town',68,76,['c','d','g']),
 f('g','东部指挥部','capital',88,54,['e','f'],1,true)]},
 {id:'ring',name:'灰烬环岛',subtitle:'9 个据点 · 环线包抄',desc:'环岛道路与中央堡垒相连。选择正面突破，或沿海岸迂回。',factions:['海湾舰队','群岛守备军'],fields:[
 f('a','西岸指挥部','capital',12,52,['b','h'],0,true),
 f('b','北港','town',24,25,['a','c','i']),
 f('c','北部油田','oil',50,18,['b','d']),
 f('d','东部雷达','town',76,25,['c','e','i']),
 f('e','东岸指挥部','capital',88,52,['d','f'],1,true),
 f('f','南港','town',76,79,['e','g','i']),
 f('g','南部油田','oil',50,87,['f','h']),
 f('h','西侧沼泽','swamp',24,79,['g','a','i']),
 f('i','中央堡垒','town',50,52,['b','d','f','h'],null,false,true)]},
 {id:'eastern_front',name:'东线纵深',subtitle:'14 个据点 · 纵深推进',desc:'以苏德战场的城市、铁路与南北战线为灵感。北线港口、中部交通轴和南部油区形成三条彼此支援的推进路线。',factions:['德军东线集团','苏军西部方面军'],historical:{label:'1941年夏 · 巴巴罗萨行动初期',control:{berlin:0,prussia:0,warsaw:0,krakow:0,baltic:0,lviv:0,minsk:1,smolensk:1,kyiv:1,leningrad:1,kharkov:1,caucasus:1,stalingrad:1,moscow:1}},fields:[
 f('berlin','柏林指挥部','capital',8,40,['prussia','warsaw','krakow'],0,true),
 f('prussia','东普鲁士','port',25,30,['berlin','warsaw','baltic']),
 f('warsaw','华沙枢纽','town',26,41,['berlin','prussia','krakow','minsk','lviv'],null,false,true),
 f('krakow','克拉科夫','town',24,50,['berlin','warsaw','lviv']),
 f('baltic','波罗的海走廊','port',34,21,['prussia','minsk','smolensk','leningrad']),
 f('minsk','明斯克','town',42,34,['warsaw','baltic','smolensk','kyiv'],null,false,true),
 f('lviv','利沃夫','town',33,51,['warsaw','krakow','kyiv','caucasus']),
 f('smolensk','斯摩棱斯克','town',53,30,['baltic','minsk','moscow','kharkov'],null,false,true),
 f('kyiv','基辅','town',49,48,['minsk','lviv','kharkov']),
 f('leningrad','列宁格勒','port',48,9,['baltic','moscow'],null,false,true),
 f('kharkov','哈尔科夫','town',62,50,['smolensk','kyiv','stalingrad','caucasus']),
 f('caucasus','高加索油区','oil',72,73,['lviv','kharkov','stalingrad']),
 f('stalingrad','斯大林格勒','town',82,55,['kharkov','caucasus','moscow'],null,false,true),
 f('moscow','莫斯科指挥部','capital',66,26,['smolensk','leningrad','stalingrad'],1,true)]},
 {id:'korea',name:'半岛拉锯',subtitle:'11 个据点 · 山地与港口',desc:'以朝鲜半岛的狭长地形为灵感。东西海岸线由山地走廊切开，仁川与元山提供侧翼通道，首尔是全图关键枢纽。',factions:['北方人民军','联合国军'],historical:{label:'1950年6月 · 战争爆发',control:{pyongyang:0,sinuiju:0,chosin:0,wonsan:0,kaesong:0,incheon:1,seoul:1,chuncheon:1,daejeon:1,daegu:1,busan:1}},seaLinks:[['incheon','wonsan']],fields:[
 f('pyongyang','平壤指挥部','capital',31,41,['sinuiju','wonsan','kaesong'],0,true),
 f('sinuiju','鸭绿江补给线','oil',16,33,['pyongyang','chosin']),
 f('chosin','长津山地','mountain',47,29,['sinuiju','wonsan']),
 f('wonsan','元山港','port',49,40,['pyongyang','chosin','chuncheon','incheon']),
 f('kaesong','开城防线','town',39,50,['pyongyang','seoul','chuncheon'],null,false,true),
 f('incheon','仁川港','port',41,55,['seoul','daejeon','wonsan']),
 f('seoul','首尔枢纽','town',44,54,['kaesong','incheon','chuncheon','daejeon'],null,false,true),
 f('chuncheon','春川山口','mountain',53,51,['wonsan','kaesong','seoul','daegu']),
 f('daejeon','大田','town',49,64,['incheon','seoul','daegu']),
 f('daegu','大邱防线','town',62,68,['chuncheon','daejeon','busan'],null,false,true),
 f('busan','釜山指挥部','capital',68,74,['daegu'],1,true)]},
 {id:'western_front',name:'法德西线',subtitle:'12 个据点 · 河谷突破',desc:'以法国战役方向的低地、阿登和莱茵交通网为灵感。北部港区适合迂回，中部要塞密集，南部路线更长但防线较薄。',factions:['德军西线集团','法英联军'],historical:{label:'1940年5月 · 黄色方案开始',control:{berlin:0,hamburg:0,ruhr:0,frankfurt:0,munich:0,luxembourg:1,alsace:1,ardennes:1,sedan:1,belgium:1,reims:1,paris:1}},seaLinks:[['belgium','hamburg']],fields:[
 f('paris','巴黎指挥部','capital',38,51,['reims','belgium','alsace'],1,true),
 f('reims','兰斯','town',46,48,['paris','belgium','sedan']),
 f('belgium','比利时低地','port',47,34,['paris','reims','ardennes','hamburg']),
 f('sedan','色当要塞','town',50,45,['reims','ardennes','luxembourg','alsace'],null,false,true),
 f('ardennes','阿登山林','forest',53,41,['belgium','sedan','luxembourg','ruhr']),
 f('alsace','阿尔萨斯','mountain',63,53,['paris','sedan','luxembourg','munich']),
 f('luxembourg','卢森堡走廊','town',55,46,['sedan','ardennes','alsace','frankfurt'],null,false,true),
 f('hamburg','汉堡港','port',73,18,['belgium','ruhr','berlin']),
 f('ruhr','鲁尔工业区','oil',59,33,['ardennes','hamburg','frankfurt','berlin']),
 f('frankfurt','法兰克福','town',67,42,['luxembourg','ruhr','munich','berlin'],null,false,true),
 f('munich','慕尼黑','town',80,56,['alsace','frankfurt','berlin']),
 f('berlin','柏林指挥部','capital',88,25,['hamburg','ruhr','frankfurt','munich'],0,true)]},
 {id:'hormuz',name:'霍尔木兹海峡',subtitle:'10 个据点 · 海峡封锁',desc:'围绕海峡、岛屿与油港展开争夺。陆上走廊稳定，跨海登陆更难形成决定性牌型。',factions:['海峡联合舰队','波斯湾卫队'],historical:{label:'2026年 · 美伊战争爆发',control:{oman_hq:0,gulf_port:0,musandam:0,offshore:0,desert:0,iran_hq:1,iran_coast:1,bandar:1,qeshm:1,island:1}},seaLinks:[['musandam','qeshm'],['gulf_port','qeshm']],fields:[
 f('oman_hq','马斯喀特指挥部','capital',88,77,['gulf_port','musandam'],0,true),f('gulf_port','苏哈尔港','port',58,66,['oman_hq','musandam','island','qeshm','desert']),f('musandam','穆桑代姆','mountain',50,40,['oman_hq','gulf_port','island','qeshm','offshore']),f('island','海峡中岛','town',54,35,['gulf_port','musandam','qeshm','bandar'],null,false,true),f('qeshm','格什姆港','port',43,31,['gulf_port','musandam','island','bandar','iran_coast']),f('bandar','阿巴斯油港','oil',48,26,['island','qeshm','iran_hq','offshore']),f('iran_coast','沿岸山口','mountain',64,26,['qeshm','iran_hq','desert']),f('iran_hq','波斯湾指挥部','capital',20,35,['bandar','iran_coast'],1,true),f('offshore','外海锚地','port',45,49,['musandam','bandar']),f('desert','内陆沙漠','town',80,90,['gulf_port','iran_coast'],null,false)]},
 {id:'china_civil_war',name:'山河决战',subtitle:'13 个据点 · 铁路与江河',desc:'按中国东部实际相对方位绘制：东北在右上，陕北在左，长江中下游和东南沿海在下方。铁路枢纽连接南北战线。',factions:['国民政府军','解放军'],factionLogos:['☀','★'],historical:{label:'1948年11月 · 淮海战役前夕',control:{nanjing:0,shanghai:0,hangzhou:0,wuhan:0,changsha:0,nanchang:0,xuzhou:0,tianjin:0,beiping:0,zhengzhou:0,jinan:1,yanan:1,shenyang:1}},fields:[
 f('nanjing','南京指挥部','capital',67,51,['xuzhou','wuhan','shanghai'],0,true),f('shanghai','上海港','port',78,52,['nanjing','hangzhou']),f('hangzhou','杭州','town',73,55,['shanghai','wuhan']),f('wuhan','武汉枢纽','town',49,54,['nanjing','hangzhou','xuzhou','zhengzhou','changsha','nanchang'],null,false,true),f('changsha','长沙','forest',44,61,['wuhan','nanchang']),f('nanchang','南昌','town',55,60,['changsha','wuhan']),f('xuzhou','徐州','town',61,44,['nanjing','wuhan','jinan','zhengzhou'],null,false,true),f('jinan','济南','town',60,35,['xuzhou','tianjin','zhengzhou'],null,false,true),f('tianjin','天津港','port',61,32,['jinan','beiping','shenyang']),f('beiping','北平枢纽','town',58,30,['tianjin','zhengzhou','yanan','shenyang'],null,false,true),f('zhengzhou','郑州','town',46,42,['wuhan','xuzhou','jinan','beiping','yanan'],null,false,true),f('yanan','延安指挥部','capital',30,32,['beiping','zhengzhou','shenyang'],1,true),f('shenyang','沈阳油区','oil',86,22,['tianjin','beiping','yanan'])]}
];
export const defaults={mode:'ai',map:'duel',rules:'campaign',difficulty:'normal',timer:0,eventSeconds:3,seed:2026,strategies:true,first:0,maxRounds:80,deckCount:'auto',deployment:'standard',sound:true,playerNames:['',''],playerLogos:['⟐','✣'],factions:['','']};
export const strategyById=id=>STRATEGIES.find(s=>s.id===id);
