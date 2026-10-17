# ZINI, protótipo de pitch

Protótipo de carsharing elétrico (estudantes do CEUB, Sebrae Supernova). Não é um serviço comercial: pagamento, CNH e controle do veículo são simulados.

## Uso
Node.js 18 ou superior.

    npm install
    npm run dev       # desenvolvimento
    npm test          # testes de preço e regras
    npm run build     # gera dist/
    npm run preview   # serve o build

## Preço
total = km x R$ 1,80 + min x R$ 0,36. Sem taxa de desbloqueio. O tempo é proporcional aos segundos, o relógio segue durante paradas. O exemplo padronizado resulta em R$ 27,51 (o documento-fonte cita R$ 27,57).

## Premissas (src/config.js)
Carregamento durante paradas, cobrança proporcional, devolução em qualquer estação com vaga, reserva de bateria de 20%, autonomia de 160 km a 100% (estimativa).

## Simulado
CNH, cartão (Visa 4242), desbloqueio, relógio e bateria. Rotas aeroporto para PKS, Pontão e SHS usam referências fixas rotuladas "Rota demonstrativa"; as demais tentam OSRM público e, se falhar, mostram estimativa rotulada. Mapa e OSRM exigem internet.

## Dados
Coordenadas: src/data/stations.js (aproximadas, não verificadas online). Imagem do veículo: public/assets/vehicles/hatch.svg (ilustração genérica criada para este projeto). Reiniciar: botão "Reiniciar demonstração" ou limpar localStorage.

## GitHub Pages
O build usa base relativa (`base: './'`). Rode `npm run build` e publique o conteúdo de dist/ (ex.: ramo gh-pages). Nada é publicado automaticamente.

## Roteiro de 3 minutos
Abrir mapa, escolher Aeroporto, mostrar o carro e a bateria, usar este carro, devolução em PKS (R$ 22,86), "Usar documento de demonstração" e "Aprovar CNH", "Cartão demo", iniciar, avançar +5/+15 min, devolver, mostrar recibo. Opcional: informar parada de 60 min e ver o acréscimo de R$ 21,60.

## Não verificado / não incluído
Verificação visual em navegador não foi feita. Ver limites na resposta de entrega.
