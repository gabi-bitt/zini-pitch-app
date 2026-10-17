import {APP_CONFIG} from '../config.js';
import {calcTotalBRL} from './pricing-service.js';
import {initialVehicles} from '../data/vehicles.js';
const cap=APP_CONFIG.network.spacesPerStation,A=APP_CONFIG.prototypeAssumptions;
export const fresh=()=>({vehicles:initialVehicles(),cnh:'NOT_SUBMITTED',card:null,rental:null,receipts:[]});
export const occupied=(s,id)=>s.vehicles.filter(v=>v.stationId===id&&v.status!=='IN_USE').length;
export const freeSpaces=(s,id)=>cap-occupied(s,id);
export const neededBattery=km=>Math.ceil(km/A.rangeKmPer100Percent*100)+A.batteryReservePercent;
export function canStart(s,vId,returnId,km){
 const v=s.vehicles.find(x=>x.id===vId);
 if(!v||v.status!=='AVAILABLE')return'Veículo indisponível.';
 if(s.cnh!=='APPROVED')return'CNH precisa estar aprovada.';
 if(!s.card)return'Selecione um método de pagamento.';
 if(s.rental)return'Já existe uma utilização ativa.';
 if(!returnId)return'Escolha a estação de devolução.';
 if(v.battery<neededBattery(km))return'Bateria estimada insuficiente para o trajeto com reserva.';
 return null;}
export function start(s,vId,returnId,plan){
 const err=canStart(s,vId,returnId,plan.distanceKm);if(err)return{error:err};
 const v=s.vehicles.find(x=>x.id===vId);v.status='IN_USE';
 s.rental={vehicleId:vId,fromId:v.stationId,returnId,plan,state:'ACTIVE',elapsedMin:0,km:0,startBattery:v.battery};return{};}
export function advance(s,min){const r=s.rental;if(!r)return;
 r.elapsedMin+=min;if(r.state==='ACTIVE')r.km=Math.min(r.plan.distanceKm,r.km+min*(r.plan.distanceKm/Math.max(r.plan.driveMin??r.plan.durationMinutes,1)));}
export const total=r=>calcTotalBRL(r.km,r.elapsedMin);
export function finish(s){const r=s.rental;if(!r)return{error:'Nada a encerrar.'};
 if(freeSpaces(s,r.returnId)<=0)return{error:'Estação de devolução sem vaga.'};
 const v=s.vehicles.find(x=>x.id===r.vehicleId);
 v.status='AVAILABLE';v.stationId=r.returnId;v.battery=Math.max(5,Math.round(r.startBattery-r.km/A.rangeKmPer100Percent*100));
 const rec={id:'sim-'+(s.receipts.length+1),vehicleId:v.id,plate:v.plate,from:r.fromId,to:r.returnId,km:r.km,min:r.elapsedMin,totalBRL:total(r),simulated:true};
 s.receipts.push(rec);s.rental=null;return{receipt:rec};}
