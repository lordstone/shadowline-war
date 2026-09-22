import {GAME_CONFIG} from './game-config.js';
import {MAP_CONFIG} from './map-config.js';

export const SUITS=['♠','♥','♣','♦'];
export const BALANCE=GAME_CONFIG;
export const STRATEGIES=GAME_CONFIG.strategies;
export const MAPS=MAP_CONFIG.maps.map(({historicalStrategies,...map})=>({
 ...map,
 fields:map.fields.map(field=>({
  owner:null,
  capital:false,
  fortified:false,
  ...field,
  garrison:[],
  blockedUntil:0,
  scorchedUntil:0
 }))
}));
export const defaults=GAME_CONFIG.defaults;
export const strategyById=id=>STRATEGIES.find(s=>s.id===id);
export const HISTORICAL_STRATEGIES=Object.fromEntries(
 MAP_CONFIG.maps.filter(map=>map.historicalStrategies).map(map=>[map.id,map.historicalStrategies])
);
