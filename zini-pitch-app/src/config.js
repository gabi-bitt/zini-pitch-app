export const APP_CONFIG={brandName:"ZINI",locale:"pt-BR",currency:"BRL",timeZone:"America/Sao_Paulo",
pricing:{version:"V7",perKmBRL:1.80,perMinuteBRL:0.36,unlockFeeBRL:0},
network:{fleetSize:5,stationCount:5,spacesPerStation:2},
prototypeAssumptions:{chargeDuringStops:true,proportionalTimeBilling:true,allowCrossStationReturn:true,batteryReservePercent:20,rangeKmPer100Percent:160,simSpeedKmh:30},
google:{apiKey:import.meta.env?.VITE_GOOGLE_MAPS_API_KEY||""},tiles:"https://tile.openstreetmap.org/{z}/{x}/{y}.png",osrm:"https://router.project-osrm.org",routeTimeoutMs:5000};
