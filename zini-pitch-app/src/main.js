import L from 'leaflet';import 'leaflet/dist/leaflet.css';import './styles/base.css';
import {APP_CONFIG as C} from './config.js';import {STATIONS} from './data/stations.js';
import {PLACES} from './data/places.js';import {computePlan,geometry} from './trip.js';import {searchRemote} from './services/search-service.js';import {brl,plannedTotal,calcTotalBRL} from './services/pricing-service.js';import {routeBetween} from './services/routing-service.js';
import * as R from './services/rental-service.js';
const K='zini-demo-v1';let S;try{S=JSON.parse(localStorage.getItem(K))||R.fresh()}catch{S=R.fresh()}
const save=()=>localStorage.setItem(K,JSON.stringify(S));
let retPick=false,sel=null,msg='',plan=null,vSel=null,ret=null,busy=false,page=null,trip=null,line=null,posM=null,cs={from:'AER',dest:null,ret:'PKS',stop:0,res:null};
const pt=id=>id&&typeof id==='object'?id:STATIONS.find(x=>x.id===id)||PLACES.find(x=>x.id===id);
const $=document.getElementById('app');
$.innerHTML=`<header><button id="mn" aria-label="Menu">☰</button><button data-home aria-label="ZINI, voltar ao início" style="border:0;padding:0;background:none"><img src="./assets/logo-zini.png" alt="ZINI"></button><span class="tag">Demonstração</span></header><div id="map"></div><aside id="sheet" aria-live="polite"></aside><nav id="drawer" aria-label="Menu principal">${[['account','Minha conta'],['cnh','Validar CNH'],['pay','Métodos de pagamento'],['uses','Minhas utilizações'],['explore','Explorar a região'],['calc','Calcular rota'],['how','Como funciona'],['help','Ajuda'],['settings','Configurações da demonstração']].map(([k,t])=>`<button data-page="${k}">${t}</button>`).join('')}</nav>`;
const map=L.map('map').setView([-15.82,-47.92],11);
L.tileLayer(C.tiles,{attribution:'&copy; OpenStreetMap'}).addTo(map);
const bounds=L.latLngBounds(STATIONS.map(s=>[s.lat,s.lng]));map.fitBounds(bounds,{padding:[60,60]});
STATIONS.forEach((s,i)=>L.marker([s.lat,s.lng],{icon:L.divIcon({className:'',html:`<div class="mk">${i+1}</div>`,iconSize:[34,34]}),title:s.name,keyboard:true}).addTo(map).bindTooltip(s.id,{permanent:true,direction:'bottom'}).on('click',()=>{sel=s.id;plan=null;vSel=null;msg='';draw()}));
const name=id=>STATIONS.find(s=>s.id===id).name;
const vlist=id=>S.vehicles.filter(v=>v.stationId===id&&v.status==='AVAILABLE');
function draw(){const e=document.getElementById('sheet');save();
 if(page)return e.innerHTML=pageView();
 if(S.rental)return e.innerHTML=rentalView();
 const row=s=>`<div class="row"><button data-s="${s.id}" style="flex:1">${s.name} · ${vlist(s.id).length} carro, ${R.freeSpaces(S,s.id)} vaga</button></div>`;
 if(!sel)return e.innerHTML=`<h2>Estações ZINI</h2><small>Ponto de retirada e devolução. Localizações aproximadas de demonstração em Brasília.</small><div class="row"><button class="p" data-page="calc">Calcular rota</button></div><p class="err">${msg}</p>${STATIONS.map(row).join('')}`;
 const s=STATIONS.find(x=>x.id===sel);
 const fix=msg&&/CNH|pagamento/.test(msg)?`<div class="row">${S.cnh!=='APPROVED'?'<button data-page="cnh">Validar CNH</button>':''}${!S.card?'<button data-page="pay">Método de pagamento</button>':''}</div>`:'';
 const est=plan?.pts?.[0]?.id===sel?`<p><small>Rota estimada: ${plan.distanceKm.toFixed(1)} km, ${brl(plan.total)} (média, o tempo é imprevisível)</small></p>`:'';
 e.innerHTML=`<h2>${s.name}</h2><small>Estação ZINI · ${R.freeSpaces(S,s.id)} de 2 vagas livres · carregamento demonstrativo</small>${est}
 ${vlist(s.id).map(v=>`<div class="pl"><img class="car" src="./assets/vehicles/hatch.svg" alt="${v.model}"><b>${v.model}</b> ${v.plate}<div class="bar"><i style="width:${v.battery}%"></i></div><small>Bateria ${v.battery}% (estimativa, não é telemetria) · autonomia est. ~${Math.round(v.battery*C.prototypeAssumptions.rangeKmPer100Percent/100)} km<br>R$ 1,80/km + R$ 0,36/min · Sem taxa de desbloqueio</small><div class="row"><button class="p" data-unlock="${v.id}">Desbloquear</button></div></div>`).join('')||'<p>Nenhum veículo disponível nesta estação.</p>'}
 <div class="row"><button data-page="calc" data-from="${s.id}">Calcular rota (opcional)</button></div><p class="err">${msg}</p>${fix}<div class="row"><button data-s="">Voltar</button></div>`;}
const planView=()=>`<p><b>${plan.distanceKm.toFixed(2)} km</b> · ${plan.driveMin.toFixed(0)} min dirigindo + ${plan.stop} min parado = ${plan.durationMinutes.toFixed(0)} min cobráveis<br><small>${plan.source}. Durante as paradas, o tempo continua contando até a devolução e o encerramento da utilização.</small></p><small>Distância ${brl(plan.distCharge??calcTotalBRL(plan.distanceKm,0))} + tempo ${brl(calcTotalBRL(0,plan.durationMinutes))} · ${plan.legs} trecho(s)</small><h2>Estimado: ${brl(plan.total)}</h2>${plan.lineNote?`<small>${plan.lineNote}</small>`:''}<small>Sem taxa de desbloqueio. Disponibilidade atual não é reserva futura. Valor médio estimado: o tempo real pode variar.</small><div class="row"><button class="p" data-go>Iniciar utilização simulada</button></div>`;
const account=()=>`<hr><small>CNH: ${S.cnh} · Pagamento: ${S.card?'Visa final 4242 (simulado)':'nenhum'}</small><div class="row"><button data-cnh="UNDER_REVIEW">Usar documento de demonstração</button><button data-cnh="APPROVED">Aprovar CNH</button><button data-cnh="REJECTED">Rejeitar</button><button data-card>Cartão demo</button><button data-reset>Reiniciar demonstração</button></div>`;
const rentalView=()=>{const r=S.rental,v=S.vehicles.find(x=>x.id===r.vehicleId);return`<h2>Utilização ${r.state==='STOPPED'?'(parado, cobrança segue)':'ativa'}</h2><p>${v.model} ${v.plate}<br>Tempo simulado: ${r.elapsedMin} min · ${r.km.toFixed(1)} km<br>Devolução prevista: ${r.returnId?name(r.returnId):'a escolher na devolução'}</p><h2>${brl(R.total(r))}</h2><small>Relógio e desbloqueio simulados.</small><div class="row"><button data-adv="5">+5 min</button><button data-adv="15">+15 min</button><button data-stop>${r.state==='STOPPED'?'Continuar trajeto':'Simular parada'}</button><button class="p" data-retpick>Devolver veículo</button></div>${retPick?`<small>Escolha a estação de devolução (precisa ter vaga):</small><div class="row">${STATIONS.map(x=>`<button data-fin="${x.id}" ${R.freeSpaces(S,x.id)<=0?"disabled":""}>${x.id}${R.freeSpaces(S,x.id)<=0?" (lotada)":""}</button>`).join("")}</div>`:""}<p class="err">${msg}</p>`};
async function calc(){const stop=+document.getElementById('stop')?.value||0;trip.stop=stop;plan=await computePlan(pt(trip.from),trip.dest?pt(trip.dest):null,pt(trip.ret),stop);await drawLine(plan)}
async function drawLine(p){if(line){line.remove();line=null}if(p.source.includes('Google')){p.lineNote='Traçado não exibido: dados do Google não são desenhados em mapa OpenStreetMap (termos do Google).';return}const g=await geometry(p.pts);
 if(g){line=L.polyline(g,{color:'#1800AD',weight:5}).addTo(map);map.fitBounds(line.getBounds(),{padding:[50,50]});p.lineNote=''}else p.lineNote='Traçado indisponível: sem rota ao vivo. Valores acima são demonstrativos e rotulados.'}
const opt=(a,v)=>a.map(x=>`<option value="${x.id}" ${x.id===v?'selected':''}>${x.name}</option>`).join('');
const back='<div class="row"><button data-page="">Voltar ao mapa</button></div>';
function calcView(){const r=cs.res;let h=`<h2>Calcular rota</h2><small>Distância por ruas (OSRM), sem trânsito em tempo real. A devolução só ocorre em estação ZINI.</small><label>Retirada<select data-f="from">${opt(STATIONS,cs.from)}</select></label><label>Para onde você vai?<input id="q" type="search" autocomplete="off" placeholder="Digite um lugar em Brasília" value="${pt(cs.dest)?.name||''}"></label><div id="sres"></div><label>Devolução<select data-f="ret">${opt(STATIONS,cs.ret)}</select></label><label>Tempo parado no destino (min)<input type="number" min="0" data-f="stop" value="${cs.stop}"></label><div class="row">${[15,30,60].map(m=>`<button data-stp="${m}">${m} min</button>`).join('')}</div><button class="p" data-docalc>Calcular</button>`;
 if(r){const need=R.neededBattery(r.distanceKm),vs=S.vehicles.filter(v=>v.stationId===cs.from&&v.status==='AVAILABLE'&&v.battery>=need).sort((a,b)=>a.battery-b.battery),v=vs[0];
  h+=`<p><b>${r.distanceKm.toFixed(2)} km</b> · ${r.driveMin.toFixed(0)} min dirigindo + ${r.stop} min parado = ${r.durationMinutes.toFixed(0)} min cobráveis</p><small>Distância ${brl(r.distCharge)} + tempo ${brl(r.timeCharge)} · sem taxa de desbloqueio · ${r.source}. Durante as paradas, o tempo continua contando até a devolução.<br><b>Valor médio estimado:</b> o tempo é imprevisível e o valor final depende da duração real.</small><h2>Estimado: ${brl(r.total)}</h2>${r.lineNote?`<small>${r.lineNote}</small>`:''}<p>${v?`Veículo sugerido: ${v.plate} (${v.battery}%), suficiente com reserva de ${C.prototypeAssumptions.batteryReservePercent}%.`:'<span class="err">Nenhum veículo disponível com bateria estimada suficiente nesta estação.</span>'}</p><button class="p" data-usetrip="${v?.id||''}" ${v?'':'disabled'}>Ver estação e desbloquear</button>`}
 return h+'<p class="err">'+msg+'</p>'+back}
function pageView(){const c={NOT_SUBMITTED:'Não enviada',UNDER_REVIEW:'Em análise',APPROVED:'Aprovada',REJECTED:'Rejeitada'}[S.cnh];
 const P={calc:calcView,
 account:()=>`<h2>Minha conta</h2><p>Usuária Demonstração (dados fictícios)<br>CNH: ${c}<br>Pagamento: ${S.card?'Visa final 4242 (simulado)':'nenhum'}</p>${back}`,
 cnh:()=>`<h2>Validar CNH</h2><small>Simulação com dados fictícios. Não há verificação real no Detran nem biometria.</small><p>Situação: <b>${c}</b></p><div class="row"><button data-cnh="UNDER_REVIEW">Usar documento de demonstração</button><button class="p" data-cnh="APPROVED">Aprovar</button><button data-cnh="REJECTED">Rejeitar</button></div>${back}`,
 pay:()=>`<h2>Métodos de pagamento</h2><small>Cartão fictício. Nenhuma cobrança é feita.</small><p>${S.card?'Visa final 4242 (padrão)':'Nenhum selecionado'}</p><button class="p" data-card>Selecionar cartão de demonstração</button>${back}`,
 uses:()=>`<h2>Minhas utilizações</h2>${S.receipts.map(x=>`<div class="pl"><b>${x.plate}</b> ${name(x.from)} para ${name(x.to)}<br>${x.km.toFixed(1)} km · ${x.min} min · ${brl(x.totalBRL)} (simulado)</div>`).join('')||'<p>Nenhuma utilização ainda.</p>'}${back}`,
 explore:()=>`<h2>Explorar a região</h2><small>Pontos com localização aproximada. Proximidade não significa parceria com a ZINI.</small>${PLACES.map(x=>`<div class="pl"><b>${x.name}</b><br><small>${x.cat}</small><br><button data-addp="${x.id}">Adicionar ao trajeto</button></div>`).join('')}${back}`,
 how:()=>`<h2>Como funciona</h2><p>1. Escolha uma Estação ZINI. 2. Escolha o carro e calcule o trajeto. 3. Valide CNH e pagamento (simulados). 4. Inicie, avance o relógio simulado e devolva em uma estação com vaga. R$ 1,80/km + R$ 0,36/min, sem taxa de desbloqueio.</p>${back}`,
 help:()=>`<h2>Ajuda</h2><p>Este é um protótipo de pitch. Rotas, CNH, pagamento e desbloqueio são simulados. Para recomeçar, use Configurações da demonstração.</p>${back}`,
 settings:()=>`<h2>Configurações da demonstração</h2><small>Premissas do protótipo, editáveis em src/config.js.</small><p>Preço ${C.pricing.version}: ${C.pricing.perKmBRL}/km + ${C.pricing.perMinuteBRL}/min<br>Devolução em qualquer estação: ${C.prototypeAssumptions.allowCrossStationReturn?'sim':'não'}<br>Reserva de bateria: ${C.prototypeAssumptions.batteryReservePercent}%<br>Autonomia estimada: ${C.prototypeAssumptions.rangeKmPer100Percent} km a 100%</p><button data-reset>Reiniciar demonstração</button>${back}`};
 return(P[page]||P.help)()}
async function autoCalc(){if(!cs.dest)return;busy=true;msg='';try{cs.res=await computePlan(pt(cs.from),pt(cs.dest),pt(cs.ret),cs.stop);await drawLine(cs.res)}catch{cs.res=null;msg='Não foi possível calcular esta rota.'}busy=false}
document.addEventListener('change',async e=>{const f=e.target.dataset?.f;if(f){cs[f]=f==='stop'?+e.target.value||0:e.target.value;if(cs.dest&&cs.res){await autoCalc();draw()}}});
let sr=[],tm;const norm=t=>t.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
function renderSr(note=''){const el=document.getElementById('sres');if(el)el.innerHTML=sr.map((x,i)=>`<div class="pl"><button data-pick="${i}">${x.name}</button><br><small>${x.tag}</small></div>`).join('')+(note?`<small>${note}</small>`:'')}
document.addEventListener('input',e=>{if(e.target.id!=='q')return;const q=e.target.value.trim();clearTimeout(tm);const n=norm(q);
 sr=n.length<2?[]:[...STATIONS.map(x=>({...x,tag:'Estação ZINI'})),...PLACES.map(x=>({...x,tag:x.cat+' (local)'}))].filter(x=>norm(x.name).includes(n));
 renderSr(q.length>=3?'Buscando mais resultados...':'');if(q.length<3)return;
 tm=setTimeout(async()=>{try{const r=await searchRemote(q);renderSr0(r)}catch{renderSr('Busca online indisponível. Mostrando só locais do app.')}},700)});
function renderSr0(r){sr=[...sr,...r];renderSr(r.length?'':'Nenhum resultado adicional.')}
document.getElementById('mn').addEventListener('click',e=>{const d=document.getElementById('drawer');e.currentTarget.setAttribute('aria-expanded',d.classList.toggle('open'))});
document.addEventListener('keydown',e=>{if(e.key==='Escape')document.getElementById('drawer').classList.remove('open')});
document.addEventListener('click',async e=>{const b=e.target.closest('button');if(!b||busy)return;const d=b.dataset;msg='';
 if('home' in d){page=null;sel=null;plan=null;vSel=null;ret=null;msg='';retPick=false;if(line){line.remove();line=null}document.getElementById('drawer').classList.remove('open');map.fitBounds(bounds,{padding:[60,60]})}
 else if(d.page!==undefined){page=d.page||null;document.getElementById('drawer').classList.remove('open');if(page==='calc'){cs.res=null;if(d.from)cs.from=d.from}}
 else if(d.stp){cs.stop=+d.stp;await autoCalc()}
 else if(d.pick!==undefined){cs.dest=sr[+d.pick];cs.res=null;await autoCalc()}
 else if(d.addp){cs.dest=d.addp;cs.res=null;page='calc';await autoCalc()}
 else if('docalc' in d){if(!cs.dest)msg='Digite o destino.';else await autoCalc()}
 else if('usetrip' in d){sel=cs.from;ret=cs.ret;trip={from:cs.from,dest:cs.dest,ret:cs.ret,stop:cs.stop};plan=cs.res;vSel=d.usetrip||null;page=null}
 else if('fit' in d){map.fitBounds(bounds,{padding:[60,60]})}
 else if('loc' in d){navigator.geolocation?.getCurrentPosition(p=>{const{latitude:a,longitude:o}=p.coords;if(a<-16.1||a>-15.5||o<-48.3||o>-47.6){msg='Sua localização está fora de Brasília. Explorando Brasília.';map.fitBounds(bounds)}else{posM?.remove();posM=L.circleMarker([a,o],{radius:9,color:'#fff',fillColor:'#0a7',fillOpacity:1}).addTo(map).bindTooltip('Você está aqui');map.flyTo([a,o],13)}draw()},()=>{msg='Localização negada ou indisponível. Explorando Brasília.';map.fitBounds(bounds);draw()});if(!navigator.geolocation)msg='Localização indisponível.'}
 else if('s' in d){page=null;sel=d.s||null;plan=null;vSel=null;ret=null;if(sel){const t=STATIONS.find(x=>x.id===sel);map.flyTo([t.lat,t.lng],13)}}
 else if(d.v)vSel=d.v;else if(d.r){ret=d.r;trip={from:sel,dest:null,ret:d.r};await calc()}
 else if('go' in d){const stop=+document.getElementById('stop').value||0;if(plan.stop!==stop)await calc();
  const x=R.start(S,vSel,ret,plan);if(x.error){msg=x.error+(S.cnh!=='APPROVED'||!S.card?' Use os botões abaixo; o trajeto fica salvo.':'')}}
 else if(d.cnh)S.cnh=d.cnh;else if('card' in d)S.card={id:'demo-card-01',brand:'Visa',last4:'4242',isDefault:true};
 else if('reset' in d){S=R.fresh();sel=null;plan=null}
 else if(d.adv)R.advance(S,+d.adv);
 else if('stop' in d){S.rental.state=S.rental.state==='STOPPED'?'ACTIVE':'STOPPED'}
 else if('retpick' in d){retPick=!retPick}
 else if(d.unlock){const pl=plan?.pts?.[0]?.id===sel?plan:null;const x=R.start(S,d.unlock,pl?ret:null,pl);if(x.error)msg=x.error}
 else if('fin' in d){busy=true;const x=R.finish(S,d.fin||null);retPick=false;busy=false;if(x.error)msg=x.error;else{sel=null;plan=null;document.getElementById('sheet').innerHTML=`<h2>Recibo simulado</h2><p>${x.receipt.plate}: ${name(x.receipt.from)} para ${name(x.receipt.to)}<br>${x.receipt.km.toFixed(1)} km · ${x.receipt.min} min</p><h2>${brl(x.receipt.totalBRL)}</h2><small>Nenhuma cobrança real foi feita.</small><div class="row"><button data-s="">Nova utilização</button></div>`;save();return}}
 else return;draw()});
draw();
