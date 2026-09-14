
import {strategyById} from './data.js';
export function actionEvents(before,after,action,perspective){
 const events=[],actor=before.active,name=p=>after.players[p].name;
 const field=id=>after.fields.find(f=>f.id===id)||before.fields.find(f=>f.id===id);
 const visible=(c,p,publicCard=false)=>p===perspective||publicCard||c.open?{...c}:{hidden:true};
 const add=(kind,title,detail,extra={})=>{if(extra.map)extra.map=extra.map.map(({id,label,type,x,y,links,owner,capital,fortified})=>({id,label,type,x,y,links,owner,capital,fortified}));events.push({kind,title,detail,...extra})};
 if(['attack','siege'].includes(action.type)){
 const f=field(action.field),stationed=before.fields.find(x=>x.id===f.id).garrison;
 add('invasion',name(actor)+(action.type==='siege'?'发动围城':'发动入侵'),f.label+'遭到进攻。'+(action.type==='siege'?'消耗 3 点补给，封锁一张预备守军。':'固定驻军已进入防线，进攻方必须用明牌严格压过。'),{field:f.id,map:after.fields,owner:actor});
 if(stationed.length)add('garrison','固定驻军迎战',f.label+'原有 '+stationed.length+' 张驻军，'+after.battle.lines[1-actor].length+' 张进入本次防线。',{field:f.id,cards:after.battle.lines[1-actor].map(c=>visible(c,1-actor)),owner:1-actor});
 }
 if(action.type==='occupy'){
 const f=field(action.field);add('occupation',name(actor)+'占领'+f.label,'所选牌已转为据点驻军，没有丢失。可点击该据点或军团面板查看。',{field:f.id,map:after.fields,owner:actor,cards:f.garrison.map(c=>visible(c,actor))});
 }
 if(action.type==='reorganize'){
 const f=field(action.field),old=before.fields.find(x=>x.id===f.id).garrison,open=old.filter(c=>c.open).length,hidden=old.length-open;add('garrison',name(actor)+'完成驻军整编',f.label+'现有 '+f.garrison.length+' 张固定驻军；撤下的 '+open+' 张明牌进入公开牌堆，'+hidden+' 张暗牌返回手牌。本次地图行动结束。',{field:f.id,map:after.fields,owner:actor,cards:f.garrison.map(c=>visible(c,actor))});
 }
 if(action.type==='rotate_garrison'){
 const f=field(action.field),old=before.fields.find(x=>x.id===f.id).garrison.filter(c=>action.outIds.includes(c.id)),open=old.filter(c=>c.open).length,hidden=old.length-open;add('garrison',name(actor)+'完成快速轮换',f.label+'轮换 '+old.length+' 张驻军并消耗 '+old.length+' 点补给；撤下的 '+open+' 张明牌进入公开牌堆，'+hidden+' 张暗牌返回手牌。',{field:f.id,map:after.fields,owner:actor,cards:f.garrison.map(c=>visible(c,actor))});
 }
 if(action.type==='strategy'){
 const strategy=strategyById(action.id);
 add('strategy',name(actor)+'使用「'+strategy.name+'」',strategy.desc,{field:action.field,owner:actor,cards:action.id==='isr'?field(action.field).garrison.filter(c=>c.open):[]});
 if(action.id==='spy'){
 const peek=after.battle?.lines[1-actor].filter(c=>after.knowledge[actor][c.id]&&!before.knowledge[actor][c.id])||[];
 if(actor===perspective&&peek.length)add('cards','密探情报', '仅你可见，敌方暗牌保持未翻开。',{cards:peek,owner:actor});
 }
 }
 if(action.type==='buy_strategy'){
 const strategy=strategyById(action.id);
 add('purchase',name(actor)+'购入「'+strategy.name+'」','消耗 '+strategy.price+' 点补给。该策略将在购买者的下一个地图回合解锁。',{owner:actor,strategy});
 }
 if(action.type==='deploy'){
 const line=after.battle?.lines[actor]||[];
 add('deployment',name(actor)+'完成部署',line.filter(c=>c.open).length+' 张明牌 / '+line.filter(c=>!c.open).length+' 张暗牌。',{owner:actor,cards:line.map(c=>visible(c,actor)),field:before.battle?.field});
 }
 if(action.type==='reveal'){
 const cards=before.battle.lines[actor].filter(c=>action.ids.includes(c.id)).map(c=>({...c,open:true}));
 add('reveal',name(actor)+'翻开暗牌',after.battle&&after.skirmish===before.skirmish?'重新比较明牌牌力。轮到'+name(after.active)+'反击或撤退。':'被压制方已无战线暗牌，交锋结算。',{cards,owner:actor,field:before.battle.field});
 }
 const ended=before.battle&&(!after.battle||before.skirmish!==after.skirmish);
 if(ended){
 const winner=after.players.findIndex((p,i)=>p.wins>before.players[i].wins);
 add('result',winner<0?'交锋结束 · 双方停火':name(winner)+'赢得交锋',
 (before.battle.field?field(before.battle.field).label+'：':'')+(before.battle.field?(winner===before.battle.defender?'固定驻军守住据点；进攻牌按明暗结算。':winner===before.battle.attacker?'进攻战线成为新驻军；原守军按明暗结算。':'停火后固定驻军留守，进攻牌各自收回。'):(winner<0?'各自明牌进入公开牌堆，暗牌收回。':'双方明牌归胜者，未翻开的暗牌各自收回。')),
 {field:before.battle.field,owner:winner,map:after.fields,cards:winner<0?[]:after.players[winner].reserve.filter(c=>!before.players[winner].reserve.some(d=>d.id===c.id)).map(c=>visible(c,winner,true))});
 if(before.battle.field){
 const f=field(before.battle.field);
 add('garrison',f.label+' · 驻防更新',f.garrison.length?'驻军已留在该据点；手牌、公开牌堆和驻军分别计数。':'当前据点暂无驻军。',{field:f.id,owner:f.owner,cards:f.garrison.map(c=>visible(c,f.owner))});
 }
 }
 for(let p=0;p<2;p++){
 const gained=after.players[p].supply-before.players[p].supply;
 const report=after.supplyLedger?.[p],harvest=report&&report!==before.supplyLedger?.[p]&&(after.turn!==before.turn||before.phase==='draft');
 if(harvest){
  const details=report.entries.map(e=>e.label+' '+(e.amount>0?'+':'')+e.amount).join('；');
  add('resources',name(p)+'本回合补给净额 '+(report.net>0?'+':'')+report.net,details+'。当前补给 '+after.players[p].supply+' / 30。',{owner:p});
  if(report.discardedId!==null){const discarded=after.players[p].reserve.find(c=>c.id===report.discardedId);if(discarded)add('cards','补给赤字 · 公开弃牌',name(p)+'本回合据点净产出为负，公开弃置 1 张暗牌。',{owner:p,cards:[visible(discarded,p,true)]})}
 }else if(gained>0){
  add('resources',name(p)+'获得 '+gained+' 点补给','策略或其他战术效果。当前补给 '+after.players[p].supply+' / 30。',{owner:p});
 }
 const fresh=after.players[p].hand.filter(c=>before.deck.some(d=>d.id===c.id));
 if(fresh.length)add('cards',name(p)+'获得 '+fresh.length+' 张新牌',p===perspective?'这些新牌已加入手牌，并以「新」标记。':'对手获得暗牌，点数保持隐藏。',{owner:p,cards:fresh.map(c=>visible(c,p)),newIds:p===perspective?fresh.map(c=>c.id):[]});
 if(action.type==='strategy'&&action.id==='meds_team'&&actor===p){
 const returned=after.players[p].hand.filter(c=>before.players[p].reserve.some(d=>d.id===c.id));
 if(returned.length)add('cards','医疗分队回收 '+returned.length+' 张牌','从公开牌堆回到暗牌手牌。',{owner:p,cards:returned.map(c=>visible(c,p)),newIds:p===perspective?returned.map(c=>c.id):[]});
 }
 }
 return events;
}
