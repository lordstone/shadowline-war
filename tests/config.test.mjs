import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';
import {GAME_CONFIG} from '../src/game-config.js';
import {BALANCE,STRATEGIES,defaults} from '../src/data.js';
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

test('balance limits are internally coherent',()=>{
 const {campaign,battle,deck}=GAME_CONFIG;
 assert.ok(deck.initialHand>campaign.capitalGarrison);
 assert.ok(campaign.siegeFrontCards<=campaign.siegeThreshold);
 assert.ok(campaign.historicalGarrison<=battle.garrisonLimits.default);
 assert.ok(battle.mountainMinOpen<=battle.terrainLineLimits.default);
 assert.ok(campaign.marketSize<=campaign.strategyHandLimit);
});
