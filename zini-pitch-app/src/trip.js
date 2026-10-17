import {APP_CONFIG as C} from './config.js';
import {routeBetween} from './services/routing-service.js';
import {plannedTotal,calcTotalBRL} from './services/pricing-service.js';
// Destino que já é a estação de devolução não gera trecho extra.
export async function computePlan(from,dest,ret,stop=0,live=true){
 const pts=[from];if(dest&&dest.id!==ret.id&&dest.id!==from.id)pts.push(dest);pts.push(ret);
 const legs=[];for(let i=0;i<pts.length-1;i++)legs.push(await routeBetween(pts[i],pts[i+1],live));
 const distanceKm=legs.reduce((a,l)=>a+l.distanceKm,0),driveMin=legs.reduce((a,l)=>a+l.durationMinutes,0);
 return{pts,legCount:legs.length,legs:legs.length,distanceKm,driveMin,stop,durationMinutes:driveMin+stop,
  total:plannedTotal(legs,stop),distCharge:calcTotalBRL(distanceKm,0),timeCharge:calcTotalBRL(0,driveMin+stop),
  source:[...new Set(legs.map(l=>l.source))].join('; ')};}
export async function geometry(pts){if(!pts.every(p=>p.lat!=null))return null;try{const c=new AbortController(),t=setTimeout(()=>c.abort(),C.routeTimeoutMs);
 const r=await fetch(`${C.osrm}/route/v1/driving/${pts.map(p=>p.lng+','+p.lat).join(';')}?overview=full&geometries=geojson`,{signal:c.signal});clearTimeout(t);
 const j=await r.json();return j.routes?.[0]?.geometry.coordinates.map(([x,y])=>[y,x])||null}catch{return null}}
