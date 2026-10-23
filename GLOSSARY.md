# BTC Project

Painel público de análise de Bitcoin: mostra a posição do visitante, indicadores de mercado e simulações históricas em BRL e USD, sem nunca executar transações.

## Language

### Portfólio

**Visitante**:
Qualquer pessoa usando o site; não há cadastro, e cada Visitante só enxerga os próprios dados.
_Avoid_: Usuário, cliente, conta

**Fonte do portfólio**:
De onde vem a quantidade de BTC do Visitante: Binance (lida da conta conectada) ou Manual (informada ou estimada); o custo é sempre informado pelo Visitante.
_Avoid_: Modo, origem

**Aporte**:
Uma aquisição de BTC informada pelo Visitante, com data, valor pago e, opcionalmente, quantidade.
_Avoid_: Compra, trade, transação

**Total investido**:
Soma dos Custos dos aportes, ou o valor único que o Visitante declarou quando não detalha Aportes.
_Avoid_: Patrimônio, saldo, valor aplicado

**Custo do aporte**:
O valor efetivamente pago por um Aporte, registrado em BRL e em USD pela cotação do dólar na data do Aporte.
_Avoid_: Valor investido

**Preço médio**:
Custo médio ponderado do BTC em posse; vendas reduzem a quantidade, mas não alteram o Preço médio.
_Avoid_: PM, custo médio FIFO, preço de entrada

**Patrimônio em BTC**:
Quantidade de BTC do Visitante multiplicada pelo preço atual na moeda selecionada.
_Avoid_: Saldo, valor da carteira

**Lucro não realizado**:
Diferença entre o Patrimônio em BTC e o Total investido ainda em posse.
_Avoid_: Lucro em aberto, P&L flutuante

**Lucro realizado**:
Resultado de uma venda registrada pelo Visitante: (preço de venda − Preço médio) × quantidade vendida.
_Avoid_: Ganho de capital, lucro fechado

### Sinal

**Nota do indicador**:
Posição de um indicador numa escala de 0 (barato) a 100 (caro), em geral o percentil do valor atual no histórico disponível até aquele dia.
_Avoid_: Score, pontuação

**Sinal composto**:
Média ponderada das Notas dos indicadores, de 0 a 100.
_Avoid_: Recomendação, previsão

**Zona**:
Faixa do Sinal composto: compra (abaixo de 35), neutro (35 a 65) ou venda (acima de 65).
_Avoid_: Sinal de compra, ordem

### Metas

**Meta**:
O lucro percentual que o Visitante quer sobre o Preço médio (padrão +25%).
_Avoid_: Objetivo, target

**Preço-alvo**:
Preço do BTC em que a Meta é atingida: Preço médio × (1 + Meta).
_Avoid_: Preço de venda, alvo de saída

**Alta necessária**:
Quanto o preço precisa subir a partir de hoje para tocar o Preço-alvo: Preço-alvo ÷ preço atual − 1.
_Avoid_: Meta (são números diferentes quando o preço atual difere do Preço médio)

**Atingir a meta**:
Algum fechamento diário tocar o Preço-alvo dentro do prazo considerado, mesmo que o preço caia depois.
_Avoid_: Terminar acima do alvo
