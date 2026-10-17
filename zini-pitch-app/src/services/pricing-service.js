import {APP_CONFIG} from '../config.js';
const bad=v=>typeof v!=='number'||!Number.isFinite(v)||v<0;
export function calcTotalBRL(distanceKm,durationMinutes,p=APP_CONFIG.pricing){
 if(bad(distanceKm)||bad(durationMinutes))throw new Error('Valores inválidos');
 const c=distanceKm*p.perKmBRL*100+durationMinutes*p.perMinuteBRL*100+p.unlockFeeBRL*100;
 return Math.round(Math.round(c*1e6)/1e6)/100;}
export const fromRoute=(m,s)=>({distanceKm:m/1000,durationMinutes:s/60});
export const plannedTotal=(legs,stopMin)=>calcTotalBRL(legs.reduce((a,l)=>a+l.distanceKm,0),legs.reduce((a,l)=>a+l.durationMinutes,0)+stopMin);
export const brl=v=>v.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
