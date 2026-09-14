import {strategyById} from './data.js';
import {t,strategyText,fieldLabel} from './i18n/index.js';
export function actionEvents(before,after,action,perspective){
 const events=[],actor=before.active,name=p=>after.players[p].name;
 const field=id=>after.fields.find(f=>f.id===id)||before.fields.find(f=>f.id===id);
 const label=f=>fieldLabel(after.opt.map,f.id);
 const visible=(c,p,publicCard=false)=>p===perspective||publicCard||c.open?{...c}:{hidden:true};
 const add=(kind,title,detail,extra={})=>{if(extra.map)extra.map=extra.map.map(({id,label,type,x,y,links,owner,capital,fortified})=>({id,label,type,x,y,links,owner,capital,fortified}));events.push({kind,title,detail,...extra})};
 if(['attack','siege'].includes(action.type)){
 const f=field(action.field),stationed=before.fields.find(x=>x.id===f.id).garrison;
 const siege=action.type==='siege';
 add('invasion',t('event.title.'+(siege?'siege':'attack'),{name:name(actor)}),t('event.detail.'+(siege?'siege':'attack'),{label:label(f)}),{field:f.id,map:after.fields,owner:actor});
 if(stationed.length)add('garrison',t('event.title.garrison.defend'),t('event.detail.garrison.defend',{label:label(f),original:stationed.length,committed:after.battle.lines[1-actor].length}),{field:f.id,cards:after.battle.lines[1-actor].map(c=>visible(c,1-actor)),owner:1-actor});
 }
 if(action.type==='occupy'){
 const f=field(action.field);add('occupation',t('event.title.occupy',{name:name(actor),label:label(f)}),t('event.detail.occupy'),{field:f.id,map:after.fields,owner:actor,cards:f.garrison.map(c=>visible(c,actor))});
 }
 if(action.type==='reorganize'){
 const f=field(action.field),old=before.fields.find(x=>x.id===f.id).garrison,open=old.filter(c=>c.open).length,hidden=old.length-open;add('garrison',t('event.title.reorganize',{name:name(actor)}),t('event.detail.reorganize',{label:label(f),total:f.garrison.length,open,hidden}),{field:f.id,map:after.fields,owner:actor,cards:f.garrison.map(c=>visible(c,actor))});
 }
 if(action.type==='rotate_garrison'){
 const f=field(action.field),old=before.fields.find(x=>x.id===f.id).garrison.filter(c=>action.outIds.includes(c.id)),open=old.filter(c=>c.open).length,hidden=old.length-open;add('garrison',t('event.title.rotate_garrison',{name:name(actor)}),t('event.detail.rotate_garrison',{label:label(f),n:old.length,open,hidden}),{field:f.id,map:after.fields,owner:actor,cards:f.garrison.map(c=>visible(c,actor))});
 }
 if(action.type==='strategy'){
 const strategy=strategyById(action.id),st=strategyText(action.id);
 add('strategy',t('event.title.strategy',{name:name(actor),strategy:st.name}),st.desc,{field:action.field,owner:actor,cards:action.id==='isr'?field(action.field).garrison.filter(c=>c.open):[]});
 if(action.id==='spy'){
 const peek=after.battle?.lines[1-actor].filter(c=>after.knowledge[actor][c.id]&&!before.knowledge[actor][c.id])||[];
 if(actor===perspective&&peek.length)add('cards',t('event.title.spy_intel'),t('event.detail.spy_intel'),{cards:peek,owner:actor});
 }
 }
 if(action.type==='buy_strategy'){
 const strategy=strategyById(action.id);
 add('purchase',t('event.title.buy_strategy',{name:name(actor),strategy:strategyText(strategy.id).name}),t('event.detail.buy_strategy',{price:strategy.price}),{owner:actor,strategy});
 }
 if(action.type==='deploy'){
 const line=after.battle?.lines[actor]||[];
 add('deployment',t('event.title.deploy',{name:name(actor)}),t('event.detail.deploy',{open:line.filter(c=>c.open).length,hidden:line.filter(c=>!c.open).length}),{owner:actor,cards:line.map(c=>visible(c,actor)),field:before.battle?.field});
 }
 if(action.type==='reveal'){
 const cards=before.battle.lines[actor].filter(c=>action.ids.includes(c.id)).map(c=>({...c,open:true}));
 add('reveal',t('event.title.reveal',{name:name(actor)}),after.battle&&after.skirmish===before.skirmish?t('event.detail.reveal.recompare',{name:name(after.active)}):t('event.detail.reveal.settle'),{cards,owner:actor,field:before.battle.field});
 }
 const ended=before.battle&&(!after.battle||before.skirmish!==after.skirmish);
 if(ended){
 const winner=after.players.findIndex((p,i)=>p.wins>before.players[i].wins);
 add('result',winner<0?t('event.title.result.ceasefire'):t('event.title.result.winner',{name:name(winner)}),
 (before.battle.field?t('event.detail.result.prefix',{label:label(field(before.battle.field))}):'')+(before.battle.field?(winner===before.battle.defender?t('event.detail.result.defend'):winner===before.battle.attacker?t('event.detail.result.attack'):t('event.detail.result.ceasefire_field')):(winner<0?t('event.detail.result.ceasefire_plain'):t('event.detail.result.winner_plain'))),
 {field:before.battle.field,owner:winner,map:after.fields,cards:winner<0?[]:after.players[winner].reserve.filter(c=>!before.players[winner].reserve.some(d=>d.id===c.id)).map(c=>visible(c,winner,true))});
 if(before.battle.field){
 const f=field(before.battle.field);
 add('garrison',t('event.title.garrison.update',{label:label(f)}),f.garrison.length?t('event.detail.garrison.update.stationed'):t('event.detail.garrison.update.empty'),{field:f.id,owner:f.owner,cards:f.garrison.map(c=>visible(c,f.owner))});
 }
 }
 for(let p=0;p<2;p++){
 const gained=after.players[p].supply-before.players[p].supply;
 const report=after.supplyLedger?.[p],harvest=report&&report!==before.supplyLedger?.[p]&&(after.turn!==before.turn||before.phase==='draft');
 if(harvest){
  const details=report.entries.map(e=>e.label+' '+(e.amount>0?'+':'')+e.amount).join(t('event.list.separator'));
  add('resources',t('event.title.resources.harvest',{name:name(p),net:(report.net>0?'+':'')+report.net}),t('event.detail.resources.harvest',{details,supply:after.players[p].supply}),{owner:p});
  if(report.discardedId!==null){const discarded=after.players[p].reserve.find(c=>c.id===report.discardedId);if(discarded)add('cards',t('event.title.resources.deficit'),t('event.detail.resources.deficit',{name:name(p)}),{owner:p,cards:[visible(discarded,p,true)]})}
 }else if(gained>0){
  add('resources',t('event.title.resources.gained',{name:name(p),amount:gained}),t('event.detail.resources.gained',{supply:after.players[p].supply}),{owner:p});
 }
 const fresh=after.players[p].hand.filter(c=>before.deck.some(d=>d.id===c.id));
 if(fresh.length)add('cards',t('event.title.cards.new.'+(fresh.length===1?'one':'other'),{name:name(p),n:fresh.length}),p===perspective?t('event.detail.cards.new.self'):t('event.detail.cards.new.other'),{owner:p,cards:fresh.map(c=>visible(c,p)),newIds:p===perspective?fresh.map(c=>c.id):[]});
 if(action.type==='strategy'&&action.id==='meds_team'&&actor===p){
 const returned=after.players[p].hand.filter(c=>before.players[p].reserve.some(d=>d.id===c.id));
 if(returned.length)add('cards',t('event.title.meds_team.'+(returned.length===1?'one':'other'),{n:returned.length}),t('event.detail.meds_team'),{owner:p,cards:returned.map(c=>visible(c,p)),newIds:p===perspective?returned.map(c=>c.id):[]});
 }
 }
 return events;
}
