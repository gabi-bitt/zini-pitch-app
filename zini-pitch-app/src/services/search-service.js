import {APP_CONFIG} from '../config.js';
// Com chave Google: Places (New) autocomplete. Sem chave: Nominatim/OpenStreetMap limitado a Brasília.
export async function searchRemote(q){const k=APP_CONFIG.google.apiKey;
 if(k){const r=await fetch('https://places.googleapis.com/v1/places:autocomplete',{method:'POST',headers:{'Content-Type':'application/json','X-Goog-Api-Key':k},body:JSON.stringify({input:q,languageCode:'pt-BR',regionCode:'BR',locationBias:{circle:{center:{latitude:-15.8,longitude:-47.9},radius:30000}}})});
  const j=await r.json();return(j.suggestions||[]).filter(s=>s.placePrediction).map(s=>({id:s.placePrediction.placeId,placeId:s.placePrediction.placeId,name:s.placePrediction.text.text,tag:'Google Places'}))}
 const r=await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=5&countrycodes=br&bounded=1&viewbox=-48.3,-15.5,-47.6,-16.1&q=${encodeURIComponent(q)}`);
 return(await r.json()).map(x=>({id:'N'+x.place_id,name:x.display_name.split(', ').slice(0,3).join(', '),lat:+x.lat,lng:+x.lon,tag:'OpenStreetMap'}))}
