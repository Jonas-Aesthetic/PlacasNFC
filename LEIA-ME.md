# VyntraTags — guia de instalação (Vercel + Upstash Redis)

## O que tem nesta pasta
- `api/` — go.js (link das placas), ativar.js (ativação pelo cliente), admin.js (painel), redirect.js (reserva via planilha)
- `lib/db.js` — conexão com o Redis
- `data/placas.json` — as 200 placas (códigos únicos)
- `public/` — site (`/`), painel (`/admin`) e ativação do cliente (`/ativar`)
- `vercel.json` — rotas (`/r/CODIGO`, `/admin`, `/ativar`)

## Instalação (nesta ordem)
1. **GitHub**: suba TODO o conteúdo desta pasta na raiz do repositório (as pastas `api`, `lib`, `data`, `public` e os arquivos `vercel.json` e `package.json` devem aparecer na primeira tela do repositório).
2. **Vercel**: projeto `placa-nfc` (endereço `placa-nfc-rho.vercel.app`) ligado a esse repositório.
3. **Banco de dados**: Vercel > Storage > Create Database > **Upstash Redis** (plano gratuito) > Connect Project. As variáveis `KV_REST_API_URL` e `KV_REST_API_TOKEN` são criadas sozinhas.
4. **Variável de senha**: Settings > Environment Variables > crie `INFO_KEY` com a senha do painel (letras e números, sem espaços). Marque Production, Preview e Development.
5. **Redeploy**: Deployments > ⋯ > Redeploy (obrigatório depois de criar o banco e as variáveis).
6. **Importar placas**: abra `/admin`, entre com a senha (`INFO_KEY`) e clique em **Importar as 200 placas**.

## Teste antes de vender
1. Em **Pedidos e PINs**, crie um pedido de teste (1 placa) e anote o PIN.
2. Abra `/r/CODIGO` de uma placa livre: deve ir para `/ativar`.
3. Digite o PIN, escolha o uso e ative. Abra `/r/CODIGO` de novo: deve redirecionar.
4. No painel, a placa deve aparecer como ativa/em uso, com a leitura contada.

## Uso diário
- Venda: crie o pedido, imprima o cartão com o PIN e envie na caixa.
- Novas placas: peça o lote e use **Importar lote** (arquivo `codigo,modelo`).
- Placas alteradas por clientes aparecem com "revisar"; você pode bloquear qualquer placa.

## Se algo falhar
- 404 em tudo: os arquivos não estão na raiz do repositório (ou ajuste Settings > General > Root Directory).
- "Indisponível" em /ativar ou "Falta conectar o banco" no painel: Redis não conectado ou falta Redeploy.
- "INFO_KEY não configurada": crie a variável e faça Redeploy.
- A variável `SHEET_CSV_URL` (planilha) é opcional e só serve como reserva quando não há Redis.
