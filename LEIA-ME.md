# Black Friday Vitalícia da Pediatria Chinesa · página de captação

Clone estático da página `metodotalithagranzotto.com/black-friday-vitalicia-da-pediatria-chinesa01`, no padrão da Agência Última, pronto para subir no GitHub + Netlify. Usa as imagens reais da página original.

## Arquivos
- `index.html` — a página (HTML único, CSS inline, fonte Outfit do Google Fonts).
- `obrigado.html` — página de obrigado, com botão do grupo de WhatsApp e redirecionamento automático.
- `netlify.toml` — publish na raiz, rota `/obrigado` e cache longo em `/img` e `/assets`.
- `img/` — imagens reais (cutout da Talitha + 11 capas de curso/e-book/bônus), já otimizadas.
- `assets/captura-lead.js` — captura de lead (planilha + pixel + redirecionamento).
- `assets/apps-script.gs` — receptor da planilha Google (Apps Script).

## O que funciona hoje
- Contador regressivo real para 12/11/2026 às 20h (horário de Brasília).
- Botão na primeira dobra no mobile (testado em 375x812) e no desktop.
- Os botões abrem um modal com nome, e-mail e WhatsApp, que envia o lead e redireciona para `obrigado`.
- Grid com as 11 capas reais, ancoragem R$ 11.000, bio, CTA final e rodapé.

## Captura de lead (como está configurada)
- No submit do formulário (modal), o lead é enviado para o **webhook do n8n**:
  `https://n8n.agenciaultima.com.br/webhook/f3dc5233-2170-40e6-8408-2eb4eed642d9` (POST, text/plain + no-cors).
- O payload inclui: nome, email, telefone, evento, pagina, event_id e os 6 UTMs:
  `utm_source, utm_medium, utm_content, utm_term, utm_campaign, utm_campaign_id`.
- Os 6 UTMs são lidos da URL, gravados em campos ocultos do form e enviados no lead.
- O evento **Lead do Meta** é disparado no submit, com o mesmo `event_id` (deduplicação com a API de Conversões).

## Formato do payload enviado ao n8n (JSON)
```
{
  "lead": { "first_name": "...", "email": "...", "phone": "..." },
  "utm_source": "...", "utm_medium": "...", "utm_content": "...",
  "utm_term": "...", "utm_campaign": "...", "utm_campaign_id": "...",
  "src": "source_medium_content_term_campaign_campaignid",
  "full_url": "...", "query_string": "...", "submitted_at": "ISO",
  "event_id": "...", "evento": "BlackFridayVitalicia"
}
```
No n8n, mapear cada coluna por `$json.body.lead.first_name`, `$json.body.utm_source`, etc.

## Já configurado
- Pixel Meta `789457605589881` (evento Lead no submit, mesmo event_id do payload).
- Grupo de WhatsApp no `obrigado.html`.

## PENDÊNCIAS
1. Garantir no n8n que o webhook está em produção e gravando na planilha.
2. Token da CAPI: configurar no n8n (servidor), nunca no site. Rotacionar o token exposto.

## Subir no GitHub
O Raphael cria um repositório vazio em `raphaellateixeira/<nome-do-projeto>` (ex.: `black-friday-vitalicia-talitha`). Depois, nesta pasta:

```bash
cd /Users/raphaelteixeira/ProjetosClaude/Talitha/black-friday-captura
git init
git add .
git -c commit.gpgsign=false commit -m "Página de captação Black Friday Vitalícia (Talitha)"
git branch -M main
git remote add origin https://github.com/raphaellateixeira/<nome-do-projeto>.git
git push -u origin main
```

## Publicar no Netlify
1. Netlify → Add new project → Import from GitHub → escolher o repositório.
   - Se o repositório não aparecer, liberar em "Configure the Netlify app on GitHub".
2. Build já configurado pelo `netlify.toml` (`publish = "."`). É só Deploy.
3. Subdomínio: Netlify → Domain management → Add a domain (ex.: `black.metodotalithagranzotto.com`).
   - No Cloudflare: CNAME `black` → `<site>.netlify.app`, **proxy desligado (nuvem cinza)**.
   - Marcar como Primary e aguardar o HTTPS.

## Checagem final (depois de preencher as pendências)
- Mobile 375 e 360: botão sem rolar, sem rolagem lateral. (ok no clone)
- Desktop. (ok no clone)
- Pixel carrega (`fbq.getState().pixels`) depois de preencher o PIXEL.
- Não enviar lead de teste nem disparar Lead falso sem o Raphael pedir. Pedir para ele cadastrar e conferir a aba e o Testar Eventos.
