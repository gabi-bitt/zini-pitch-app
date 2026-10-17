import {APP_CONFIG} from '../config.js';
import {FIXTURES} from '../data/stations.js';
const hav=(a,b)=>{const t=x=>x*Math.PI/180,dl=t(b.lat-a.lat),dg=t(b.lng-a.lng);const h=Math.sin(dl/2)**2+Math.cos(t(a.lat))*Math.cos(t(b.lat))*Math.sin(dg/2)**2;return 12742*Math.asin(Math.sqrt(h));};
const wp=p=>p.placeId?{placeId:p.placeId}:{location:{latLng:{latitude:p.lat,longitude:p.lng}}};
async function google(a,b){const c=new AbortController(),t=setTimeout(()=>c.abort(),APP_CONFIG.routeTimeoutMs);
 const r=await fetch('https://routes.googleapis.com/directions/v2:computeRoutes',{method:'POST',signal:c.signal,headers:{'Content-Type':'application/json','X-Goog-Api-Key':APP_CONFIG.google.apiKey,'X-Goog-FieldMask':'routes.distanceMeters,routes.duration'},body:JSON.stringify({origin:wp(a),destination:wp(b),travelMode:'DRIVE',routingPreference:'TRAFFIC_AWARE',languageCode:'pt-BR'})});clearTimeout(t);
 const x=(await r.json()).routes?.[0];if(!x)throw 0;return{distanceKm:x.distanceMeters/1000,durationMinutes:parseFloat(x.duration)/60,source:'Google Routes (média estimada com trânsito)'}}
export async function routeBetween(a,b,live=true){
 if(live&&APP_CONFIG.google.apiKey){try{return await google(a,b)}catch{}}
 const fx=FIXTURES[a.id+'>'+b.id];if(fx)return{...fx,source:'Rota demonstrativa (referência fixa)'};
 if(live){try{const c=new AbortController(),t=setTimeout(()=>c.abort(),APP_CONFIG.routeTimeoutMs);
  const r=await fetch(`${APP_CONFIG.osrm}/route/v1/driving/${a.lng},${a.lat};${b.lng},${b.lat}?overview=false`,{signal:c.signal});clearTimeout(t);
  const j=await r.json();if(j.routes?.[0])return{distanceKm:j.routes[0].distance/1000,durationMinutes:j.routes[0].duration/60,source:'OSRM (sem trânsito em tempo real)'};}catch{}}
 if(a.lat==null||b.lat==null)throw new Error('Rota indisponível');
 const d=hav(a,b)*1.35;return{distanceKm:d,durationMinutes:d*2,source:'Estimativa demonstrativa (rota indisponível)'};}
