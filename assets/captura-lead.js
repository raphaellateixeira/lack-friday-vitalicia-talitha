/* Captura de lead · Black Friday Vitalícia (Talitha)
   - Dispara o evento Lead do Meta no submit do formulário.
   - Envia o lead para o webhook do n8n (que salva na planilha).
   - Captura os UTMs da URL, grava em campos ocultos do form e envia no lead.
   Form (no modal): inputs name="nome", name="email", name="whatsapp",
   honeypot name="site" e button[type=submit]. */
var CAPTURA = {
  WEBHOOK: "https://n8n.agenciaultima.com.br/webhook/f3dc5233-2170-40e6-8408-2eb4eed642d9",
  PIXEL: "789457605589881",  // Pixel Meta (navegador). O token da CAPI NUNCA fica aqui: fica no n8n (servidor).
  EVENTO: "BlackFridayVitalicia",
  DESTINO: "https://chat.whatsapp.com/FjCW4QFJ9CX8STVl6E2hqi"  // redireciona direto para o grupo
};

/* UTMs capturados, gravados no lead e nos campos ocultos do form */
var UTM_KEYS = ['utm_source','utm_medium','utm_content','utm_term','utm_campaign','utm_campaign_id'];
var EXTRA_KEYS = ['fbclid','gclid','src'];

if (CAPTURA.PIXEL) {
  !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
  n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
  n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
  t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
  document,'script','https://connect.facebook.net/en_US/fbevents.js');
  fbq('init', CAPTURA.PIXEL); fbq('track', 'PageView');
}

/* le os UTMs da URL (ou do sessionStorage, para sobreviver entre paginas) */
var UTMS = {};
(function () {
  var q = new URLSearchParams(location.search);
  UTM_KEYS.concat(EXTRA_KEYS).forEach(function (k) {
    var v = q.get(k);
    try { v = v || sessionStorage.getItem(k) || ''; if (v) sessionStorage.setItem(k, v); } catch (e) { v = v || ''; }
    if (v) UTMS[k] = v;
  });
})();

/* garante campos ocultos de UTM dentro de cada form e preenche com o valor capturado */
function preencheUtmsNoForm(form) {
  UTM_KEYS.forEach(function (k) {
    var campo = form.querySelector('[name="' + k + '"]');
    if (!campo) {
      campo = document.createElement('input');
      campo.type = 'hidden';
      campo.name = k;
      form.appendChild(campo);
    }
    campo.value = UTMS[k] || '';
  });
}

function mascaraTel(campo) {
  campo.addEventListener('input', function () {
    if (campo.value.trim().charAt(0) === '+') { campo.value = '+' + campo.value.replace(/\D/g, '').slice(0, 15); return; }
    var d = campo.value.replace(/\D/g, '').slice(0, 11), v = d;
    if (d.length > 2) v = '(' + d.slice(0, 2) + ') ' + d.slice(2);
    if (d.length > 7) v = '(' + d.slice(0, 2) + ') ' + d.slice(2, d.length - 4) + '-' + d.slice(-4);
    campo.value = v;
  });
}

document.querySelectorAll('form.formulario').forEach(function (form) {
  preencheUtmsNoForm(form);
  var tel = form.querySelector('[name="whatsapp"], [name="telefone"]');
  if (tel) mascaraTel(tel);
  form.setAttribute('novalidate', '');
  form.addEventListener('submit', function (ev) {
    ev.preventDefault();
    var frm = ev.currentTarget || this || form;
    var tel = frm.querySelector('[name="whatsapp"], [name="telefone"]');
    var hp = frm.querySelector('[name="site"]');
    if (hp && hp.value) return; // honeypot
    var nome = frm.querySelector('[name="nome"]').value.trim();
    var email = frm.querySelector('[name="email"]').value.trim();
    var intl = tel.value.trim().charAt(0) === '+';
    var fone = tel.value.replace(/\D/g, '');
    var ok = nome.length >= 2 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) && (intl ? fone.length >= 8 : fone.length >= 10);
    if (!ok) { alert('Preencha nome, e-mail e WhatsApp com DDD.\nFora do Brasil? Comece com + e o código do país.'); return; }
    if (intl) fone = '+' + fone;
    var botao = frm.querySelector('button[type=submit]');
    botao.disabled = true; botao.textContent = 'Enviando...';

    var eventId = 'lead-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);

    /* src = juncao das 6 UTMs (igual ao padrao da outra pagina), ou o src da URL se existir */
    var src = UTMS.src || UTM_KEYS.map(function (k) { return UTMS[k] || ''; }).join('_');

    /* campos planos (cada um vira uma coluna em $json.body.<campo> no n8n).
       Form urlencoded nao dispara preflight de CORS: o lead sempre chega. */
    var campos = {
      first_name: nome, email: email, phone: fone,
      utm_source: UTMS.utm_source || '',
      utm_medium: UTMS.utm_medium || '',
      utm_content: UTMS.utm_content || '',
      utm_term: UTMS.utm_term || '',
      utm_campaign: UTMS.utm_campaign || '',
      utm_campaign_id: UTMS.utm_campaign_id || '',
      src: src,
      full_url: location.href,
      query_string: location.search,
      submitted_at: new Date().toISOString(),
      event_id: eventId,
      evento: CAPTURA.EVENTO
    };

    /* evento Lead do Meta no submit, com o mesmo event_id (deduplicacao) */
    if (window.fbq) fbq('track', 'Lead', { source: UTMS.utm_source || 'direto' }, { eventID: eventId });

    var foi = false;
    function seguir() {
      if (foi) return; foi = true;
      // link externo (grupo de WhatsApp): vai direto, sem anexar parametros
      if (/^https?:\/\//.test(CAPTURA.DESTINO)) { location.href = CAPTURA.DESTINO; return; }
      var p = new URLSearchParams({ nome: nome, email: email, telefone: fone });
      UTM_KEYS.forEach(function (k) { if (UTMS[k]) p.append(k, UTMS[k]); });
      location.href = CAPTURA.DESTINO + (CAPTURA.DESTINO.indexOf('?') > -1 ? '&' : '?') + p.toString();
    }

    /* envia ao webhook do n8n como form urlencoded (sem preflight de CORS) */
    var form = new URLSearchParams();
    Object.keys(campos).forEach(function (k) { form.append(k, campos[k] == null ? '' : campos[k]); });
    fetch(CAPTURA.WEBHOOK, { method: 'POST', mode: 'no-cors', body: form }).then(seguir, seguir);
    setTimeout(seguir, 3500);
  });
});
