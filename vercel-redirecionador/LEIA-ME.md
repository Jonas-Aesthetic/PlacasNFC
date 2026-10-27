# Redirecionador das placas NFC

Cada placa tem um link único (`https://placa-nfc.vercel.app/r/CODIGO`). Este projeto leva a pessoa
para o destino que estiver na planilha. Trocar o destino = editar uma célula, sem reimprimir nada.

## Passo a passo (tudo gratuito)

1. **Planilha**: envie `Planilha_Placas_NFC.xlsx` ao Google Drive e abra com o Google Planilhas.
2. **Publicar só a aba "Publicar"**: Arquivo > Compartilhar > Publicar na Web > escolha a aba
   **Publicar** e o formato **CSV** > Publicar. Copie o link gerado.
   (A aba "Placas", com os nomes dos estabelecimentos, continua privada.)
3. **GitHub**: crie um repositório e envie o conteúdo desta pasta.
4. **Vercel**: Add New > Project > importe o repositório.
   - Nome do projeto: **placa-nfc** (o endereço precisa ser `placa-nfc.vercel.app`, pois ele já está dentro dos QR Codes).
   - Em Environment Variables, crie `SHEET_CSV_URL` com o link do passo 2.
   - Crie também `INFO_KEY` com uma senha sua (ex.: letras e números, sem espaços). Ela libera o link de consulta.
   - Deploy.
5. **Teste**: abra `https://placa-nfc.vercel.app/r/` + qualquer código da planilha.
   Deve aparecer "Placa ainda não ativada".

## Consultar uma placa já ativada

Abra `https://placa-nfc.vercel.app/r/CODIGO?info=SUA_CHAVE` (SUA_CHAVE = valor de `INFO_KEY`).
Aparecem o código, o status, o estabelecimento e o destino. Com a chave errada ou sem ela, o link
funciona normalmente e redireciona, sem mostrar nada.
Dica: digite a chave na célula L2 da aba "Placas"; a coluna J monta o link de consulta de cada placa.
Atenção: a aba "Publicar" agora inclui o nome do estabelecimento. O link da publicação na web não é
listado, mas quem o tiver consegue ler a aba. Não compartilhe esse link.

## Ativar uma placa

Na aba **Placas**, preencha a coluna **Destino** (link do Google Avaliações, Instagram, etc.) e o
**Estabelecimento**. Em até cerca de 1 minuto a placa passa a redirecionar.

## Se o nome `placa-nfc` já estiver em uso na Vercel

Escolha outro nome e peça para gerar os QR Codes e PDFs de novo com o novo endereço.
Os códigos continuam os mesmos.
