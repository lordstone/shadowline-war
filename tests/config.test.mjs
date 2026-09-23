import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';
import {GAME_CONFIG} from '../src/game-config.js';
import {MAP_CONFIG} from '../src/map-config.js';
import {BALANCE,HISTORICAL_STRATEGIES,MAPS,STRATEGIES,defaults} from '../src/data.js';
import {strategyText} from '../src/i18n/index.js';

test('YAML balance source drives generated runtime defaults and strategy values',async()=>{
 const source=JSON.parse(await readFile(new URL('../config/game-balance.yaml',import.meta.url),'utf8'));
 assert.deepEqual(GAME_CONFIG,source);
 assert.equal(BALANCE,GAME_CONFIG);
 assert.equal(defaults.maxRounds,source.defaults.maxRounds);
 assert.deepEqual(STRATEGIES,source.strategies);
 const describedEffects={conscription:['draw'],meds_team:['recover'],rank_up:['boost'],international_support:['supply'],airborne_raid:['range'],economic_sanctions:['rounds']};
 for(const card of STRATEGIES){
  const text=strategyText(card.id);
  for(const key of describedEffects[card.id]||[])assert.ok(text.desc.includes(String(card.effect[key])),card.id+' description omits '+key);
 }
});

test('YAML map source drives generated runtime maps and historical strategies',async()=>{
 const source=JSON.parse(await readFile(new URL('../config/maps.yaml',import.meta.url),'utf8'));
 assert.deepEqual(MAP_CONFIG,source);
 assert.deepEqual(MAPS.map(map=>({
  ...map,
  fields:map.fields.map(({garrison,blockedUntil,scorchedUntil,owner,capital,fortified,...field})=>({
   ...field,
   ...(owner===null?{}:{owner}),
   ...(capital?{capital}:{}),
   ...(fortified?{fortified}:{})
  }))
 })),source.maps.map(({historicalStrategies,...map})=>map));
 assert.deepEqual(HISTORICAL_STRATEGIES,Object.fromEntries(source.maps.filter(map=>map.historicalStrategies).map(map=>[map.id,map.historicalStrategies])));
});

test('balance limits are internally coherent',()=>{
 const {campaign,battle,deck}=GAME_CONFIG;
 assert.ok(deck.initialHand>campaign.capitalGarrison);
 assert.ok(campaign.siegeFrontCards<=campaign.siegeThreshold);
 assert.ok(campaign.historicalGarrison<=battle.garrisonLimits.default);
 assert.ok(battle.mountainMinOpen<=battle.terrainLineLimits.default);
 assert.ok(campaign.marketSize<=campaign.strategyHandLimit);
 assert.equal(deck.initialHand-campaign.capitalGarrison,campaign.safeHandSize);
 assert.ok(campaign.excessHandUpkeep>0);
});
