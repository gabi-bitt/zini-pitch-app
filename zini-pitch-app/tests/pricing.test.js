import {describe,it,expect} from 'vitest';
import {calcTotalBRL,fromRoute} from '../src/services/pricing-service.js';
import * as R from '../src/services/rental-service.js';
const cases=[[9.7,15,22.86],[10.5,20,26.10],[13.85,24,33.57],[11.35,19.67,27.51],[20,90,68.40],[1,1.5,2.34]];
describe('preço',()=>{cases.forEach(([k,m,e])=>it(`${k}km ${m}min = ${e}`,()=>expect(calcTotalBRL(k,m)).toBe(e)));
 it('rejeita inválidos',()=>{expect(()=>calcTotalBRL(-1,1)).toThrow();expect(()=>calcTotalBRL(NaN,1)).toThrow();expect(()=>calcTotalBRL(undefined,1)).toThrow()});
 it('conversão da rota',()=>expect(fromRoute(9700,900)).toEqual({distanceKm:9.7,durationMinutes:15}))});
describe('regras',()=>{
 const plan={distanceKm:9.7,durationMinutes:15};
 it('exige CNH e cartão',()=>{const s=R.fresh();expect(R.start(s,'ZN-01','PKS',plan).error).toMatch(/CNH/);s.cnh='APPROVED';expect(R.start(s,'ZN-01','PKS',plan).error).toMatch(/pagamento/)});
 it('veículo indisponível',()=>{const s=R.fresh();s.cnh='APPROVED';s.card={};s.vehicles[0].status='MAINTENANCE';expect(R.start(s,'ZN-01','PKS',{distanceKm:1,durationMinutes:1}).error).toMatch(/indispon/)});
 it('parada soma só tempo, devolução encerra e não duplica',()=>{const s=R.fresh();s.cnh='APPROVED';s.card={};s.vehicles[0].battery=100;
  expect(R.start(s,'ZN-01','PKS',plan).error).toBeUndefined();R.advance(s,15);const a=R.total(s.rental);s.rental.state='STOPPED';R.advance(s,30);
  expect(s.rental.km).toBeCloseTo(9.7);expect(R.total(s.rental)).toBeCloseTo(a+10.8,2);
  expect(R.finish(s).receipt).toBeTruthy();expect(R.finish(s).error).toBeTruthy();expect(s.receipts.length).toBe(1)});
 it('capacidade e frota',()=>{const s=R.fresh();s.cnh='APPROVED';s.card={};s.vehicles[3].stationId='PON';expect(R.occupied(s,'PON')).toBe(2);
  s.vehicles[0].battery=100;R.start(s,'ZN-01','PON',plan);expect(R.finish(s).error).toMatch(/sem vaga/);expect(s.vehicles.length).toBe(5)})});
import {computePlan} from '../src/trip.js';
import {STATIONS} from '../src/data/stations.js';
describe('trajeto',()=>{const [a,,,p]=STATIONS;
 it('destino igual à devolução não cria trecho extra',async()=>{const r=await computePlan(a,p,p,0,false);expect(r.legs).toBe(1);expect(r.total).toBe(22.86)});
 it('parada soma só tempo',async()=>{const r=await computePlan(a,p,p,60,false);expect(r.distanceKm).toBe(9.7);expect(r.total).toBe(44.46)})});
describe('desbloqueio sem rota',()=>{
 it('inicia sem plano nem devolução e devolve em estação escolhida',()=>{const s=R.fresh();s.cnh='APPROVED';s.card={};
  expect(R.start(s,'ZN-04',null,null).error).toBeUndefined();R.advance(s,10);expect(s.rental.km).toBeCloseTo(5);
  expect(R.finish(s).error).toMatch(/Escolha/);expect(R.finish(s,'PKS').receipt.to).toBe('PKS');expect(s.rental).toBeNull()});
 it('sem CNH continua bloqueado',()=>{const s=R.fresh();s.card={};expect(R.start(s,'ZN-04',null,null).error).toMatch(/CNH/)})});
