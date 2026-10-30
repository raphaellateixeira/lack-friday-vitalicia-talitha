/* Captura de lead · Black Friday Vitalícia (Talitha)
   - Dispara o evento Lead do Meta no submit do formulário.
   - Envia o lead para o webhook do n8n (que salva na planilha).
   - Captura os UTMs da URL, grava em campos ocultos do form e envia no lead.
   Form (no modal): inputs name="nome", name="email", name="whatsapp",
   honeypot name="site" e button[type=submit]. */
var CAPTURA = {
  WEBHOOK: "https://n8n.agenciaultima.com.br/webhook/f3dc5233-2170-40e6-8408-2eb4eed642d9",
  PIXEL: "",                 // PENDENTE: ID do pixel Meta desta conta; vazio desliga o rastreio
  EVENTO: "BlackFridayVitalicia",
  DESTINO: "obrigado"        // vai para obrigado.html (que leva ao grupo de WhatsApp)
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
    if (form.site && form.site.value) return; // honeypot
    var nome = form.nome.value.trim(), email = form.email.value.trim();
    var intl = tel.value.trim().charAt(0) === '+';
    var fone = tel.value.replace(/\D/g, '');
    var ok = nome.length >= 2 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) && (intl ? fone.length >= 8 : fone.length >= 10);
    if (!ok) { alert('Preencha nome, e-mail e WhatsApp com DDD.\nFora do Brasil? Comece com + e o código do país.'); return; }
    if (intl) fone = '+' + fone;
    var botao = form.querySelector('button[type=submit]');
    botao.disabled = true; botao.textContent = 'Enviando...';

    var eventId = 'lead-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);

    /* monta o lead: dados + evento + UTMs (sempre as 6 chaves) + extras */
    var lead = {
      nome: nome, email: email, telefone: fone,
      evento: CAPTURA.EVENTO, pagina: location.href.split('?')[0], event_id: eventId
    };
    UTM_KEYS.forEach(function (k) { lead[k] = UTMS[k] || ''; });
    EXTRA_KEYS.forEach(function (k) { if (UTMS[k]) lead[k] = UTMS[k]; });

    /* evento Lead do Meta no submit, com o mesmo event_id (deduplicacao) */
    if (window.fbq) fbq('track', 'Lead', { source: UTMS.utm_source || 'direto' }, { eventID: eventId });

    var foi = false;
    function seguir() {
      if (foi) return; foi = true;
      var p = new URLSearchParams({ nome: nome, email: email, telefone: fone });
      UTM_KEYS.forEach(function (k) { if (UTMS[k]) p.append(k, UTMS[k]); });
      location.href = CAPTURA.DESTINO + (CAPTURA.DESTINO.indexOf('?') > -1 ? '&' : '?') + p.toString();
    }

    /* envia para o webhook do n8n (salva na planilha).
       text/plain + no-cors entrega o corpo sem preflight de CORS; o n8n le o body como JSON. */
    fetch(CAPTURA.WEBHOOK, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(lead)
    }).then(seguir, seguir);
    setTimeout(seguir, 3000);
  });
});
