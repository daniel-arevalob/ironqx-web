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
