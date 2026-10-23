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
} satisfies Record<string, Explicacao>;

export type ExplicacaoId = keyof typeof explicacoes;
