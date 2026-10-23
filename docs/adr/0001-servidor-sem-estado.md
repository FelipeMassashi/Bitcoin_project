# Servidor sem estado: nenhum dado de Visitante fica no servidor

O site é público e sem cadastro, e a exigência é que ninguém — nem o dono do site — consiga ver os dados de um Visitante. Por isso o servidor não tem banco: as credenciais da Binance ficam num cookie httpOnly/Secure/SameSite=Strict cifrado com AES-256-GCM (chave mestra só no ambiente do servidor), decifradas em memória a cada requisição e nunca logadas; Aportes ficam no IndexedDB do navegador do Visitante (preferências de exibição, como tema e moeda, no localStorage, porque o tema precisa ser lido de forma síncrona antes da primeira pintura); dados de mercado são buscados pelo navegador direto das APIs públicas.

## Considered Options

- **SQLite no servidor**: só serve para um único usuário rodando local; num site público concentraria os dados de todos num lugar.
- **Assinar as requisições no navegador**: a Secret nunca sairia do dispositivo, mas os endpoints assinados da Binance não são feitos para chamadas de navegador e a Secret ficaria exposta a qualquer XSS.

## Consequences

- Trocar de navegador ou limpar os dados do site apaga os Aportes.
- Rate limit da Binance é por IP do servidor e compartilhado entre Visitantes: as rotas assinadas têm limite por IP e cache curto.
- A hospedagem precisa ficar fora dos EUA (a Binance responde 451): Vercel, região `gru1`.
