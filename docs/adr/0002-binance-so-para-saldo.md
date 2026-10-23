# A Binance informa só a quantidade de BTC; o custo vem do Visitante

A conexão com a Binance lê apenas o saldo de BTC (Spot, Funding e Simple Earn) — não sincroniza trades, conversões, compras em moeda nem depósitos/saques. O Total investido e os Aportes são sempre informados pelo Visitante. Escolhido por simplicidade: compras via PIX/cartão não aparecem como trades, os históricos exigem janelas de 24 h/30 dias/90 dias com pesos altos de rate limit, e o produto quer ser direto ao ponto.

## Consequences

- O Preço médio é Total investido ÷ quantidade, e não reflete automaticamente compras novas: o Visitante atualiza o Total investido ou adiciona um Aporte.
- Os marcadores de aporte no gráfico só existem quando o Visitante cadastra Aportes individuais.
