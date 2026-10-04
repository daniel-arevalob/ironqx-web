import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const js=read('assistant.js'),css=read('assistant.css'),html=read('index.html');
test('el numero anterior desaparece de todos los enlaces y datos estructurados',()=>{
  assert.doesNotMatch(html,/593984490998/);assert.doesNotMatch(js,/593984490998/);
  assert.match(html,/"telephone": "\+593963252197"/);assert.match(js,/PHONE='593963252197'/);
});
test('el fallback conserva precios y periodos oficiales',()=>{
  const catalog=vm.runInNewContext('('+js.match(/const FALLBACK=(\[.*?\]);/s)[1]+')');
  assert.equal(JSON.stringify(catalog.map(s=>[s.id,s.price,s.period])),JSON.stringify([['balance',60,'mes'],['forged',75,'mes'],['restore',100,'mes'],['consulta',30,'consulta']]));
});
test('los mensajes son texto, sin renderizar HTML o Markdown del proveedor',()=>{
  assert.doesNotMatch(js,/innerHTML|insertAdjacentHTML|eval\(/);assert.match(js,/n\.textContent=text/);assert.match(js,/attachShadow/);
});
test('tokens, borradores y reintentos quedan en la pestaña, nunca en localStorage',()=>{
  assert.doesNotMatch(js,/localStorage/);assert.match(js,/sessionStorage/);assert.match(js,/previous\?\.text===text\?previous\.id/);assert.match(js,/storage\.set\('lead',leadRequest\)/);
});
test('el chat no autoenvia al recuperar conexion y permite rechazar la IA',()=>{
  assert.doesNotMatch(js,/addEventListener\(['"]online/);assert.match(js,/if\(!navigator\.onLine\)/);assert.match(js,/Seguir sin IA/);
});
test('solicitud requiere consentimiento, precio revisado y servicio valido',()=>{
  assert.match(js,/priceAccepted:price\.checked,shareConsent:consent\.checked/);assert.match(js,/controls\.service\.onchange=\(\)=>\{price\.checked=false/);assert.match(js,/form\.reportValidity\(\)/);
});
test('el panel supera navbar y ruido, usa visualViewport y conserva navegacion accesible',()=>{
  assert.match(css,/z-index:10020/);assert.match(css,/--chat-vh/);assert.match(js,/window\.visualViewport/);assert.match(js,/n\.inert=true/);assert.match(js,/e\.key==='Escape'/);assert.match(js,/e\.key==='Tab'/);
});

test('la portada queda detras de una capa fija sin bloquear la web al cerrar',()=>{
  assert.match(css,/:host\s*\{[^}]*position: fixed;[^}]*inset: 0;[^}]*pointer-events: none;[^}]*isolation: isolate;/s);
  assert.match(css,/\.backdrop[^}]*background: #000b/);
  assert.match(css,/\.backdrop, \.fab, \.panel \{ pointer-events: auto;/);
  assert.match(js,/backdrop\.hidden=!value/);
  assert.match(js,/if\(value===!panel\.hidden\)return/);
  assert.match(js,/backdrop\.onclick=\(\)=>setOpen\(false\)/);
});

test('experiencia y modalidad usan selectores y conservan respuestas anteriores',()=>{
  assert.match(js,/field\('experience',SELECTS\.experience\.label,'select'\)/);
  assert.match(js,/field\('modality',SELECTS\.modality\.label,'select'\)/);
  assert.match(js,/if\(current&&spec&&!items\.some/);
  assert.match(js,/items\.unshift\(\{value:current,label:current\}\)/);
  assert.match(js,/questionOptions\(r\.question\)/);
  assert.match(js,/questionOptions\(h\.history\.at\(-1\)\?\.question\)/);
  assert.match(js,/select\.onchange=.*deliver\(select\.value\)/);
});
test('botones de herramientas usan Lucide local, sin CDN ni bundle completo',()=>{
  assert.match(js,/window\.lucide\.createElement/);assert.match(html,/\/vendor\/lucide.min.js\?v=/);assert.ok(fs.statSync(new URL('../vendor/lucide.min.js',import.meta.url)).size<10000);
});
test('el CTA comercial abre el chat real, no el antiguo bot de WhatsApp',()=>{
  assert.match(html,/<button type="button" data-open-assistant/);assert.doesNotMatch(html,/class="floating-wa wa-halo"/);assert.match(html,/\/assistant.js\?v=/);
});
test('Turnstile vive en el documento, ocupa espacio y se limpia una sola vez',()=>{
  assert.match(js,/container\.slot=slot\.name/);assert.match(js,/host\.append\(container\)/);assert.match(js,/container\.style\.minHeight='65px'/);
  assert.match(js,/if\(settled\)return;settled=true/);assert.match(js,/container\.remove\(\);shell\.remove\(\)/);
  assert.match(js,/setTimeout\(\(\)=>fail\('timeout'\),15000\)/);
});

test('solicitud y conversacion tienen vistas distintas, con una salida que conserva datos',()=>{
  assert.match(js,/timeline\.hidden=true;composer\.hidden=true;requestView\.hidden=false/);
  assert.match(js,/requestView\.replaceChildren\(form\);requestView\.scrollTop=0/);
  assert.match(js,/p=values\(\);returnToChat\(\)/);
  assert.match(js,/requestView\.hidden=true;timeline\.hidden=false;composer\.hidden=false/);
  assert.match(js,/const activeSurface=\(\)=>form\|\|timeline/);
  assert.match(js,/activeSurface\(\)\.append\(shell\)/);
});

test('consentimiento tiene acciones separadas y no acumula servicios ni preguntas duplicadas',()=>{
  assert.match(js,/actions\.append\(yes,no\);box\.append\(actions\)/);
  assert.match(css,/\.consent-actions[^}]*gap: 10px/);
  assert.match(js,/clearOptions\(\);if\(!retry\)message/);
  assert.match(js,/answer\(r\.reply,r\.question\)/);
  assert.match(js,/if\(r\.recommended&&!r\.question\)/);
});

test('la fuente del chat es local y los recursos comparten un sello',()=>{
  assert.match(html,/@font-face[^}]*manrope-latin\.woff2/s);
  assert.match(css,/font-family: 'Manrope'/);
  assert.doesNotMatch(css,/Barlow|fonts\.googleapis/);
  assert.ok(fs.statSync(new URL('../vendor/manrope-latin.woff2',import.meta.url)).size<50000);
  const stamp=js.match(/assistant\.css\?v=(\d+)/)[1];
  assert.ok(html.includes('/assistant.js?v='+stamp));
  assert.ok(html.includes('/vendor/lucide.min.js?v='+stamp));
});

test('la edad guiada acepta "20 años" y solo deriva al representante por debajo de 18', () => {
  assert.ok(js.includes('age=nums.length===1?Number(nums[0]):NaN;'), 'un solo número en el texto, con o sin "años"');
  assert.match(js, /if\(age<18\)\{message\('Como eres menor de edad/);
  assert.doesNotMatch(js, /age<21|age<=18|age<20/);
});
test('los textos visibles llevan sus tildes', () => {
  for (const mal of ['Contactalo', 'contratacion automatica', 'limite de', 'verificacion', 'no esta disponible', 'Dias y horarios', 'Tambien puedes', 'recibir orientacion', 'numero de WhatsApp']) assert.ok(!js.includes(mal), mal);
});
