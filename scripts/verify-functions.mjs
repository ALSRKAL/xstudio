// Temporary verification harness: exercises the Netlify functions as plain ESM.
// Run: node scripts/verify-functions.mjs
const chat = (await import('../netlify/functions/chat.mjs')).default;
const models = (await import('../netlify/functions/models.mjs')).default;
const image = (await import('../netlify/functions/image.mjs')).default;

// Unique IP per call so the built-in per-IP throttle does not skew results.
let ipCounter = 0;
const nextIp = () => `10.0.0.${(ipCounter += 1)}`;

const req = (init = {}) =>
  new Request('https://x.test/.netlify/functions/chat', {
    ...init,
    headers: { 'x-nf-client-connection-ip': nextIp(), ...(init.headers || {}) },
  });
const post = (body) => req({ method: 'POST', body: JSON.stringify(body) });
const line = (label) => console.log(`\n=== ${label} ===`);

let failures = 0;
const expect = (label, condition, extra = '') => {
  if (!condition) failures += 1;
  console.log(`${condition ? 'PASS' : 'FAIL'}  ${label}${extra ? ` :: ${extra}` : ''}`);
};

line('models discovery');
const modelsRes = await models(
  new Request('https://x.test/.netlify/functions/models', {
    method: 'POST',
    body: JSON.stringify({ keys: {} }),
  })
);
const modelsBody = await modelsRes.json();
console.log('providers', modelsBody.providers.map((p) => `${p.id}/${p.kind}`).join(', '));
console.log('text models', modelsBody.models.length);
console.log('image models', (modelsBody.imageModels || []).map((m) => m.id).join(', '));
expect('models endpoint 200', modelsRes.status === 200);
expect('text models discovered', modelsBody.models.length > 0, `${modelsBody.models.length}`);
expect('image models discovered', (modelsBody.imageModels || []).length > 0);
expect('no cache leak header', modelsRes.headers.get('cache-control')?.includes('no-store'));
expect(
  'hidden fallback provider is not listed',
  !modelsBody.providers.some((p) => p.id === 'llm7')
);

// Every listed text model must carry the details the picker renders.
const detailed = modelsBody.models.filter((m) => m.contextWindow > 0);
expect(
  'listed models expose a context window',
  detailed.length === modelsBody.models.length,
  `${detailed.length}/${modelsBody.models.length}`
);

const firstModel = modelsBody.models[0]?.id;

line('guards');
const guard = await chat(req({ method: 'GET' }));
expect('GET rejected', guard.status === 405);
const badJson = await chat(req({ method: 'POST', body: '{oops' }));
expect('bad JSON rejected', badJson.status === 400);
const empty = await chat(post({ messages: [] }));
expect('empty messages rejected', empty.status === 400);
const single = await chat(post({ messages: [{ role: 'user', content: 'x'.repeat(300000) }] }));
expect('single oversized message is truncated, not rejected', single.status !== 413, `got ${single.status}`);
const huge = await chat(
  post({
    messages: Array.from({ length: 20 }, () => ({ role: 'user', content: 'x'.repeat(24000) })),
  })
);
expect('oversized conversation rejected', huge.status === 413, `got ${huge.status}`);

line('non-streaming completion');
const once = await chat(
  post({
    model: firstModel,
    stream: false,
    messages: [{ role: 'user', content: 'Reply with exactly: PONG' }],
    max_tokens: 20,
  })
);
const onceBody = await once.json();
console.log('provider', once.headers.get('x-ai-provider'), 'content', JSON.stringify(onceBody.content));
expect('completion 200', once.status === 200, `status ${once.status}`);
expect('completion has content', !!onceBody.content?.trim());

line('streaming completion');
const streamed = await chat(
  post({
    model: firstModel,
    stream: true,
    messages: [{ role: 'user', content: 'Count from 1 to 5, comma separated.' }],
    max_tokens: 60,
  })
);
expect('stream 200', streamed.status === 200, `status ${streamed.status}`);
expect('stream content-type is SSE', !!streamed.headers.get('content-type')?.includes('event-stream'));
let chunks = 0;
let text = '';
const decoder = new TextDecoder();
for await (const chunk of streamed.body) {
  chunks += 1;
  text += decoder.decode(chunk, { stream: true });
}
const deltas = [...text.matchAll(/"content":"((?:[^"\\]|\\.)*)"/g)].map((m) => m[1]);
console.log('chunks', chunks, 'bytes', text.length, 'joined:', deltas.join('').slice(0, 120));
expect('stream produced deltas', deltas.length > 0, `${deltas.length}`);

line('fallback when provider has no key');
const fb = await chat(
  post({
    model: 'groq:llama-3.3-70b-versatile',
    stream: false,
    messages: [{ role: 'user', content: 'Say OK' }],
    max_tokens: 10,
  })
);
const fbBody = await fb.json();
console.log('provider', fb.headers.get('x-ai-provider'), 'fallback', fb.headers.get('x-ai-fallback'));
expect('fallback answered', fb.status === 200 && !!fbBody.content?.trim(), `status ${fb.status}`);
expect('fallback flagged', fb.headers.get('x-ai-fallback') === '1');

line('BYOK routing (invalid key must not fall back silently to the same provider)');
const byok = await chat(
  post({
    model: 'groq:llama-3.1-8b-instant',
    stream: false,
    keys: { groq: 'gsk_invalid_key_for_testing' },
    messages: [{ role: 'user', content: 'Say OK' }],
    max_tokens: 10,
  })
);
console.log('status', byok.status, 'provider', byok.headers.get('x-ai-provider'));
expect(
  'invalid key still answers via keyless fallback',
  byok.status === 200 && byok.headers.get('x-ai-fallback') === '1',
  `status ${byok.status}`
);

line('rate limiting');
const floodIp = '10.9.9.9';
let limited = false;
for (let i = 0; i < 35; i += 1) {
  // eslint-disable-next-line no-await-in-loop
  const res = await chat(
    new Request('https://x.test/.netlify/functions/chat', {
      method: 'POST',
      headers: { 'x-nf-client-connection-ip': floodIp },
      body: JSON.stringify({ messages: [] }), // rejected before any upstream call
    })
  );
  if (res.status === 429) {
    limited = true;
    break;
  }
}
expect('per-IP throttle engages', limited);

line('legacy prompt shape');
const legacy = await chat(
  post({
    prompt: 'Say LEGACY',
    systemPrompt: 'Answer with one word.',
    conversationHistory: [],
    stream: false,
  })
);
const legacyBody = await legacy.json();
console.log('content', JSON.stringify(legacyBody.content?.slice(0, 60)));
expect('legacy shape supported', legacy.status === 200 && !!legacyBody.content?.trim());


line('image generation');
const imageRes = await image(
  new Request('https://x.test/.netlify/functions/image', {
    method: 'POST',
    headers: { 'x-nf-client-connection-ip': nextIp() },
    body: JSON.stringify({ prompt: 'a lighthouse at dusk, cinematic', width: 512, height: 512 }),
  })
);
const imageBody = await imageRes.json();
console.log('provider', imageBody.provider, '| model', imageBody.model);
expect('image endpoint 200', imageRes.status === 200, `status ${imageRes.status}`);
expect('image url returned', typeof imageBody.url === 'string' && imageBody.url.length > 10);

if (imageBody.url?.startsWith('http')) {
  const probe = await fetch(imageBody.url, { signal: AbortSignal.timeout(90000) });
  expect(
    'image url serves an image',
    probe.ok && (probe.headers.get('content-type') || '').startsWith('image'),
    `${probe.status} ${probe.headers.get('content-type')}`
  );
}

const emptyImage = await image(
  new Request('https://x.test/.netlify/functions/image', {
    method: 'POST',
    headers: { 'x-nf-client-connection-ip': nextIp() },
    body: JSON.stringify({ prompt: '' }),
  })
);
expect('empty image prompt rejected', emptyImage.status === 400);

console.log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : `${failures} CHECK(S) FAILED`}`);
process.exit(failures === 0 ? 0 : 1);
