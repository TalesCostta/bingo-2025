## Bingo 2025 — Cartela estática segura

Aplicação 100% estática (HTML/CSS/JS) para usar em eventos de bingo físicos. Cada pessoa gera uma cartela determinística a partir de `event` (seed do evento) + `playerId` salvo localmente, dificultando rerolls.

### Como usar (participante)
- Abra o link com `?event=SEED` (ex.: `https://SEU_USUARIO.github.io/bingo/?event=NATAL2025`).
- A primeira abertura gera e grava um `playerId` e a cartela. Recarregar mantém cartela e marcações.
- Controles exibidos: apenas `Verificar bingo` e `Copiar ID`. O FREE central é sempre ativo e fixo.
- ID curto exibido no topo (`Cartela: ABC123`) para auditoria; copie pelo botão.

### Modo organizador
- Abra com `?host=1` para ver o gerador de link/QR.
- Informe `Seed do evento` e clique em `Gerar link do evento` (o FREE central já é padrão).
- Copie o link ou use o QR (gerado via QRious CDN) para compartilhar.

### Persistência local
- `localStorage` guarda: evento atual, playerId, cartela, marcações, estado de bloqueio e preferência do FREE.
- A chave inclui o seed do evento; seeds diferentes guardam estados distintos.

### Estrutura
- `index.html` — markup dos modos participante/organizador.
- `styles.css` — layout mobile-first, alto contraste, reduz animação com `prefers-reduced-motion`.
- `app.js` — lógica de seed, PRNG determinístico, geração da cartela, persistência e interações.

### Desenvolvimento
- Não há build; hospede os arquivos (GitHub Pages funciona direto).
- Para trocar manualmente de evento sem QR, use `?event=NOVO_SEED` ou o campo na página quando nenhum seed estiver presente.
