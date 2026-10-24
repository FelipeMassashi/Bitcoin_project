// Textos de ajuda de cada métrica, em linguagem simples.
// "oQueE": o que é. "paraQueServe": como ajuda a decidir. A leitura do momento ("o que diz agora")
// é gerada a partir dos dados por quem usa o <Explain>.

export type Explicacao = { titulo: string; oQueE: string; paraQueServe: string };

export const explicacoes = {
  preco: {
    titulo: "Preço atual",
    oQueE: "Último valor pelo qual 1 bitcoin foi negociado na Binance, atualizado em tempo real.",
    paraQueServe: "É a base de todas as outras contas: quanto vale o que você tem e quanto falta para a sua meta.",
  },
  variacao: {
    titulo: "Variação",
    oQueE: "Quanto o preço subiu ou caiu comparado com 24 horas, 7 dias e 30 dias atrás.",
    paraQueServe: "Mostra o ritmo recente. Quedas fortes em pouco tempo costumam assustar, mas nem sempre são má notícia para quem compra.",
  },
  candles: {
    titulo: "Gráfico de velas (candles)",
    oQueE: "Cada vela resume um período: o corpo vai da abertura ao fechamento e os pavios mostram a máxima e a mínima.",
    paraQueServe: "Velas na cor de alta fecharam acima de onde abriram; na cor de baixa, abaixo. Ajuda a ver a tendência e os extremos de cada período.",
  },
  volume: {
    titulo: "Volume",
    oQueE: "Quantidade de bitcoin negociada em cada período.",
    paraQueServe: "Movimentos de preço com volume alto têm mais gente por trás e tendem a ser mais significativos.",
  },
  mm50: {
    titulo: "Média móvel de 50 dias",
    oQueE: "Preço médio de fechamento dos últimos 50 dias, recalculado a cada dia.",
    paraQueServe: "Mostra a tendência de curto a médio prazo. Preço acima dela indica força recente; abaixo, fraqueza.",
  },
  mm200: {
    titulo: "Média móvel de 200 dias",
    oQueE: "Preço médio de fechamento dos últimos 200 dias (cerca de 7 meses).",
    paraQueServe: "É a referência mais usada de tendência de longo prazo. Muitos investidores consideram o preço abaixo dela um período de mercado fraco.",
  },
  mm200s: {
    titulo: "Média de 200 semanas",
    oQueE: "Preço médio dos fechamentos semanais das últimas 200 semanas (quase 4 anos, cerca de um ciclo do bitcoin).",
    paraQueServe: "Historicamente o preço raramente ficou abaixo dela, e quando ficou foi perto dos fundos dos ciclos. Por isso costuma ser vista como zona de preço baixo.",
  },
  bollinger: {
    titulo: "Bandas de Bollinger",
    oQueE: "Duas linhas em volta da média de 20 dias, afastadas pela volatilidade recente (2 desvios-padrão).",
    paraQueServe: "Preço encostando na banda de cima indica alta esticada; na de baixo, queda esticada. Bandas apertadas costumam anteceder movimentos fortes.",
  },
  mayer: {
    titulo: "Mayer Multiple",
    oQueE: "O preço de hoje dividido pela média dos últimos 200 dias. 1,0 significa preço igual à média; 2,0, o dobro.",
    paraQueServe: "Mostra o quanto o preço se afastou da tendência de longo prazo. Historicamente, valores abaixo de 0,8 apareceram perto de fundos e acima de 2,4 perto de topos.",
  },
  dist200s: {
    titulo: "Distância da média de 200 semanas",
    oQueE: "Quanto o preço está acima ou abaixo da média dos fechamentos das últimas 200 semanas (cerca de 4 anos).",
    paraQueServe: "O bitcoin raramente ficou abaixo dessa média, e foi perto dela que se formaram os fundos dos ciclos. Quanto mais longe acima, mais esticado o preço.",
  },
  drawdown: {
    titulo: "Queda desde a máxima histórica",
    oQueE: "Quanto o preço de hoje está abaixo do maior preço já atingido.",
    paraQueServe: "Quedas de 75% a 85% marcaram os fundos dos ciclos anteriores. Perto de 0% significa que o preço está no topo ou perto dele.",
  },
  fearGreed: {
    titulo: "Índice de medo e ganância",
    oQueE: "Nota diária de 0 a 100 da alternative.me que mistura volatilidade, volume, redes sociais e buscas. 0 é medo extremo; 100, ganância extrema.",
    paraQueServe: "Mede o humor do mercado. Medo extremo costuma coincidir com preços baixos e ganância extrema com preços altos: muita gente compra no topo e vende no fundo.",
  },
  rsiDaily: {
    titulo: "RSI diário (14)",
    oQueE: "Índice de força relativa: compara o tamanho das altas e das quedas dos últimos 14 dias numa escala de 0 a 100.",
    paraQueServe: "Acima de 70 indica que o preço subiu rápido demais (sobrecomprado); abaixo de 30, que caiu rápido demais (sobrevendido). Útil para o curto prazo.",
  },
  rsiWeekly: {
    titulo: "RSI semanal (14)",
    oQueE: "O mesmo RSI, mas calculado com fechamentos semanais das últimas 14 semanas.",
    paraQueServe: "Olha um horizonte de meses. RSI semanal abaixo de 30 foi raro e apareceu nos piores momentos dos ciclos; acima de 80, perto dos topos.",
  },
  macd: {
    titulo: "MACD",
    oQueE: "Diferença entre duas médias exponenciais (12 e 26 dias), comparada com a média dessa diferença (9 dias).",
    paraQueServe: "Indica mudança de tendência: quando a diferença cruza para cima da sua média, o impulso virou de queda para alta; para baixo, de alta para queda. A nota mede a força desse impulso comparada com toda a história: impulso de alta forte dá nota alta.",
  },
  halving: {
    titulo: "Ciclo do halving",
    oQueE: "A cada cerca de 4 anos a recompensa de quem minera bitcoin cai pela metade (o halving), reduzindo a oferta nova.",
    paraQueServe: "Nos ciclos anteriores, o topo veio de 12 a 18 meses depois do halving e o fundo, cerca de um ano após o topo. São só 3 ciclos completos: serve de contexto, não de regra.",
  },
  sinal: {
    titulo: "Sinal composto",
    oQueE: "Um número de 0 a 100 que junta as notas de sete indicadores, cada um com um peso. Perto de 0 o preço parece barato pela história; perto de 100, caro.",
    paraQueServe: "Abaixo de 35 é zona de compra, acima de 65 é zona de venda e entre os dois é neutro. É um resumo do histórico, não uma previsão: o preço pode continuar caindo numa zona de compra.",
  },
  nota: {
    titulo: "Nota do indicador",
    oQueE: "Em que posição o valor de hoje estaria se ordenássemos todos os dias da história até hoje. Nota 15 quer dizer que só 15% dos dias tiveram valor menor.",
    paraQueServe: "Coloca indicadores diferentes na mesma escala de 0 a 100, para poder somá-los. RSI e medo e ganância já vêm nessa escala e entram direto.",
  },
  backtest: {
    titulo: "Como o sinal se saiu no passado",
    oQueE: "Para cada dia da história em que o sinal estava em uma zona, medimos quanto o preço tinha mudado 90, 180 e 365 dias depois.",
    paraQueServe: "Mostra se comprar na zona de compra rendeu mais que comprar na de venda. Cada dia usa só a informação que existia naquele dia, sem espiar o futuro.",
  },
  mesAtual: {
    titulo: "Mês atual",
    oQueE: "Maior e menor preço deste mês até agora, e quanto o preço de hoje está distante de cada um.",
    paraQueServe: "Mostra se o preço está perto do topo ou do fundo do mês. Comprar perto da mínima do mês costuma dar um preço médio melhor.",
  },
  amplitude: {
    titulo: "Amplitude",
    oQueE: "Quanto a máxima do mês ficou acima da mínima do mesmo mês.",
    paraQueServe: "Mede a volatilidade: amplitudes grandes significam meses agitados, em que esperar alguns dias pode mudar bastante o preço pago.",
  },
  heatmap: {
    titulo: "Retornos mensais",
    oQueE: "Cada quadrado é a variação do preço em um mês, do fechamento do mês anterior ao fechamento daquele mês.",
    paraQueServe: "Ajuda a ver padrões de sazonalidade e a lembrar que meses de queda forte são comuns mesmo em anos muito bons.",
  },
  quantidade: {
    titulo: "Quantidade de bitcoin",
    oQueE: "Quanto bitcoin você tem: lido da sua conta na Binance (Spot, Funding e Simple Earn) ou informado por você.",
    paraQueServe: "Multiplicada pelo preço atual, dá quanto o seu bitcoin vale hoje.",
  },
  patrimonio: {
    titulo: "Patrimônio em BTC",
    oQueE: "Quanto o seu bitcoin vale agora: quantidade × preço atual, na moeda escolhida.",
    paraQueServe: "É o valor que você receberia, antes de taxas, se vendesse tudo neste momento.",
  },
  totalInvestido: {
    titulo: "Total investido",
    oQueE: "Quanto você pagou pelo bitcoin que ainda tem. Cada aporte é convertido para reais e dólares pela cotação do dia em que foi feito.",
    paraQueServe: "É a base para saber se você está no lucro ou no prejuízo.",
  },
  precoMedio: {
    titulo: "Preço médio",
    oQueE: "Quanto, em média, você pagou por 1 bitcoin: Total investido ÷ quantidade. Vendas diminuem a quantidade, mas não mudam o preço médio.",
    paraQueServe: "Se o preço atual está acima dele, você está no lucro. É também a partir dele que se calcula a sua meta.",
  },
  lucroNaoRealizado: {
    titulo: "Lucro ou prejuízo não realizado",
    oQueE: "Diferença entre quanto o seu bitcoin vale hoje e quanto você pagou por ele. Só vira dinheiro de fato se você vender.",
    paraQueServe: "Mostra como está o seu investimento agora. Em reais e em dólares o resultado pode ser diferente, porque o dólar também varia.",
  },
  lucroRealizado: {
    titulo: "Lucro realizado",
    oQueE: "Resultado das vendas que você registrou: (preço de venda − preço médio) × quantidade vendida.",
    paraQueServe: "Separa o que você já ganhou ou perdeu de verdade do que ainda depende do preço.",
  },
  precoAlvo: {
    titulo: "Preço-alvo",
    oQueE: "O preço do bitcoin em que você teria 25% de lucro sobre o seu preço médio.",
    paraQueServe: "No gráfico, a linha tracejada âmbar é o preço-alvo (meta padrão de +25%) e a escura é o seu preço médio: mostram quão longe o preço está de cada um.",
  },
  valorVsAportado: {
    titulo: "Valor × investido",
    oQueE: "A linha cheia é quanto o seu bitcoin valia em cada dia; a tracejada, quanto você tinha investido até aquele dia.",
    paraQueServe: "Quando a linha cheia está acima da tracejada, você estava no lucro naquele dia.",
  },
  lucroPorAporte: {
    titulo: "Resultado por aporte",
    oQueE: "Para cada aporte: quanto pagou, quanto aquele bitcoin vale hoje e a diferença.",
    paraQueServe: "Mostra quais aportes foram feitos em bons momentos e quais ainda estão no prejuízo.",
  },
  dca: {
    titulo: "Comparação com DCA mensal",
    oQueE: "DCA é investir o mesmo valor todo mês, sem tentar acertar o momento. Aqui tudo o que você aportou é dividido em compras mensais iguais, do seu primeiro aporte até hoje.",
    paraQueServe: "Mostra se escolher os momentos dos aportes ajudou ou atrapalhou, comparado com comprar no automático.",
  },
} satisfies Record<string, Explicacao>;

export type ExplicacaoId = keyof typeof explicacoes;
