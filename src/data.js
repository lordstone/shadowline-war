
import {GAME_CONFIG} from './game-config.js';

export const SUITS=['♠','♥','♣','♦'];
export const BALANCE=GAME_CONFIG;
export const STRATEGIES=GAME_CONFIG.strategies;
const f=(id,label,type,x,y,links,owner=null,capital=false,fortified=false)=>({id,label,type,x,y,links,owner,capital,fortified,garrison:[],blockedUntil:0,scorchedUntil:0});
export const MAPS=[
 {id:'duel',fields:[
 f('p1_capital','西境指挥部','capital',16,74,['p1_oil','center_town'],0,true),
 f('p1_oil','西部油田','oil',34,44,['p1_capital','center_town']),
 f('center_town','中央城镇','town',50,60,['p1_capital','p1_oil','p2_oil','p2_capital'],null,false,true),
 f('p2_oil','东部油田','oil',66,44,['p2_capital','center_town']),
 f('p2_capital','东境指挥部','capital',84,74,['p2_oil','center_town'],1,true)]},
 {id:'rift',fields:[
 f('a','西部指挥部','capital',12,54,['b','c'],0,true),
 f('b','北部隘口','town',32,28,['a','d','e']),
 f('c','南部油田','oil',32,76,['a','d','f']),
 f('d','峡谷中继','town',50,52,['b','c','e','f'],null,false,true),
 f('e','北部油田','oil',68,28,['b','d','g']),
 f('f','南部隘口','town',68,76,['c','d','g']),
 f('g','东部指挥部','capital',88,54,['e','f'],1,true)]},
 {id:'ring',fields:[
 f('a','西岸指挥部','capital',12,52,['b','h'],0,true),
 f('b','北港','town',24,25,['a','c','i']),
 f('c','北部油田','oil',50,18,['b','d']),
 f('d','东部雷达','town',76,25,['c','e','i']),
 f('e','东岸指挥部','capital',88,52,['d','f'],1,true),
 f('f','南港','town',76,79,['e','g','i']),
 f('g','南部油田','oil',50,87,['f','h']),
 f('h','西侧沼泽','swamp',24,79,['g','a','i']),
 f('i','中央堡垒','town',50,52,['b','d','f','h'],null,false,true)]},
 {id:'eastern_front',historical:{control:{berlin:0,prussia:0,warsaw:0,krakow:0,baltic:0,lviv:0,minsk:1,smolensk:1,kyiv:1,leningrad:1,kharkov:1,caucasus:1,stalingrad:1,moscow:1}},fields:[
 f('berlin','柏林指挥部','capital',8,40,['prussia','warsaw','krakow'],0,true),
 f('prussia','东普鲁士','port',25,30,['berlin','warsaw','baltic']),
 f('warsaw','华沙枢纽','town',26,41,['berlin','prussia','krakow','minsk','lviv'],null,false,true),
 f('krakow','克拉科夫','town',24,50,['berlin','warsaw','lviv']),
 f('baltic','波罗的海走廊','port',34,21,['prussia','minsk','smolensk','leningrad']),
 f('minsk','明斯克','town',42,34,['warsaw','baltic','smolensk','kyiv'],null,false,true),
 f('lviv','利沃夫','town',36,55,['warsaw','krakow','kyiv','caucasus']),
 f('smolensk','斯摩棱斯克','town',53,30,['baltic','minsk','moscow','kharkov'],null,false,true),
 f('kyiv','基辅','town',49,48,['minsk','lviv','kharkov']),
 f('leningrad','列宁格勒','port',48,9,['baltic','moscow'],null,false,true),
 f('kharkov','哈尔科夫','town',62,50,['smolensk','kyiv','stalingrad','caucasus']),
 f('caucasus','高加索油区','oil',72,73,['lviv','kharkov','stalingrad']),
 f('stalingrad','斯大林格勒','town',82,55,['kharkov','caucasus','moscow'],null,false,true),
 f('moscow','莫斯科指挥部','capital',66,26,['smolensk','leningrad','stalingrad'],1,true)]},
 {id:'korea',historical:{control:{pyongyang:0,sinuiju:0,chosin:0,wonsan:0,kaesong:0,incheon:1,seoul:1,chuncheon:1,daejeon:1,daegu:1,busan:1}},seaLinks:[['incheon','wonsan']],fields:[
 f('pyongyang','平壤指挥部','capital',31,41,['sinuiju','wonsan','kaesong'],0,true),
 f('sinuiju','鸭绿江补给线','oil',16,33,['pyongyang','chosin']),
 f('chosin','长津山地','mountain',47,29,['sinuiju','wonsan']),
 f('wonsan','元山港','port',49,40,['pyongyang','chosin','chuncheon','incheon']),
 f('kaesong','开城防线','town',34,48,['pyongyang','seoul','chuncheon'],null,false,true),
 f('incheon','仁川港','port',34,62,['seoul','daejeon','wonsan']),
 f('seoul','首尔枢纽','town',52,56,['kaesong','incheon','chuncheon','daejeon'],null,false,true),
 f('chuncheon','春川山口','mountain',57,43,['wonsan','kaesong','seoul','daegu']),
 f('daejeon','大田','town',49,64,['incheon','seoul','daegu']),
 f('daegu','大邱防线','town',62,68,['chuncheon','daejeon','busan'],null,false,true),
 f('busan','釜山指挥部','capital',68,74,['daegu'],1,true)]},
 {id:'western_front',historical:{control:{berlin:0,hamburg:0,ruhr:0,frankfurt:0,munich:0,luxembourg:1,alsace:1,ardennes:1,sedan:1,belgium:1,reims:1,paris:1}},seaLinks:[['belgium','hamburg']],fields:[
 f('paris','巴黎指挥部','capital',30,57,['reims','belgium','alsace'],1,true),
 f('reims','兰斯','town',40,50,['paris','belgium','sedan']),
 f('belgium','比利时低地','port',47,34,['paris','reims','ardennes','hamburg']),
 f('sedan','色当要塞','town',52,60,['reims','ardennes','luxembourg','alsace'],null,false,true),
 f('ardennes','阿登山林','forest',53,38,['belgium','sedan','luxembourg','ruhr']),
 f('alsace','阿尔萨斯','mountain',63,53,['paris','sedan','luxembourg','munich']),
 f('luxembourg','卢森堡走廊','town',66,49,['sedan','ardennes','alsace','frankfurt'],null,false,true),
 f('hamburg','汉堡港','port',73,18,['belgium','ruhr','berlin']),
 f('ruhr','鲁尔工业区','oil',59,33,['ardennes','hamburg','frankfurt','berlin']),
 f('frankfurt','法兰克福','town',67,42,['luxembourg','ruhr','munich','berlin'],null,false,true),
 f('munich','慕尼黑','town',80,56,['alsace','frankfurt','berlin']),
 f('berlin','柏林指挥部','capital',88,25,['hamburg','ruhr','frankfurt','munich'],0,true)]},
 {id:'hormuz',historical:{control:{oman_hq:0,gulf_port:0,musandam:0,offshore:0,desert:0,iran_hq:1,iran_coast:1,bandar:1,qeshm:1,island:1}},seaLinks:[['musandam','qeshm'],['gulf_port','qeshm']],fields:[
 f('oman_hq','马斯喀特指挥部','capital',88,77,['gulf_port','musandam'],0,true),f('gulf_port','苏哈尔港','port',58,66,['oman_hq','musandam','island','qeshm','desert']),f('musandam','穆桑代姆','mountain',50,40,['oman_hq','gulf_port','island','qeshm','offshore']),f('island','海峡中岛','town',54,35,['gulf_port','musandam','qeshm','bandar'],null,false,true),f('qeshm','格什姆港','port',43,31,['gulf_port','musandam','island','bandar','iran_coast']),f('bandar','阿巴斯油港','oil',48,26,['island','qeshm','iran_hq','offshore']),f('iran_coast','沿岸山口','mountain',64,26,['qeshm','iran_hq','desert']),f('iran_hq','波斯湾指挥部','capital',20,35,['bandar','iran_coast'],1,true),f('offshore','外海锚地','port',45,49,['musandam','bandar']),f('desert','内陆沙漠','town',80,90,['gulf_port','iran_coast'],null,false)]},
 {id:'china_civil_war',factionLogos:['☀','★'],historical:{control:{nanjing:0,shanghai:0,hangzhou:0,wuhan:0,changsha:0,nanchang:0,xuzhou:0,tianjin:0,beiping:0,zhengzhou:0,jinan:1,yanan:1,shenyang:1}},seaLinks:[['shanghai','tianjin']],fields:[
 f('nanjing','南京指挥部','capital',65,57,['xuzhou','wuhan','shanghai'],0,true),f('shanghai','上海港','port',82,51,['nanjing','hangzhou','tianjin']),f('hangzhou','杭州','town',74,68,['shanghai','wuhan']),f('wuhan','武汉枢纽','town',49,54,['nanjing','hangzhou','xuzhou','zhengzhou','changsha','nanchang'],null,false,true),f('changsha','长沙','forest',40,68,['wuhan','nanchang']),f('nanchang','南昌','town',56,70,['changsha','wuhan']),f('xuzhou','徐州','town',62,45,['nanjing','wuhan','jinan','zhengzhou'],null,false,true),f('jinan','济南','town',51,35,['xuzhou','tianjin','zhengzhou'],null,false,true),f('tianjin','天津港','port',69,37,['jinan','beiping','shenyang','shanghai']),f('beiping','北平枢纽','town',62,23,['tianjin','zhengzhou','yanan','shenyang'],null,false,true),f('zhengzhou','郑州','town',43,44,['wuhan','xuzhou','jinan','beiping','yanan'],null,false,true),f('yanan','延安指挥部','capital',27,29,['beiping','zhengzhou','shenyang'],1,true),f('shenyang','沈阳油区','oil',86,22,['tianjin','beiping','yanan'])]}
];
export const defaults=GAME_CONFIG.defaults;
export const strategyById=id=>STRATEGIES.find(s=>s.id===id);
export const HISTORICAL_STRATEGIES={
 eastern_front:[['blitzkrieg'],['international_support']],
 korea:[['international_support'],['economic_sanctions']],
 western_front:[['blitzkrieg'],['peace_talk']],
 hormuz:[['economic_sanctions'],['economic_espionage']],
 china_civil_war:[['relocate_capital','peace_talk'],['peace_talk','international_support']]
};
