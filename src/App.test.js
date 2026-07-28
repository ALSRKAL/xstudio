import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { parseArtifactResponse } from './services/artifactProtocol';

// The markdown/highlighter stack is ESM-only and irrelevant to this smoke test,
// so it is stubbed with a plain text renderer.
jest.mock('react-markdown', () => ({ children }) => <span>{children}</span>);
jest.mock('remark-gfm', () => () => undefined);

// eslint-disable-next-line import/first
import App from './App';

const modelsPayload = {
  success: true,
  updatedAt: new Date().toISOString(),
  providers: [
    { id: 'openrouter', kind: 'text', keyless: false, modelCount: 2 },
    { id: 'pollinations', kind: 'image', keyless: true, modelCount: 1 },
  ],
  models: [
    {
      id: 'openrouter:nvidia/nemotron-3-ultra-550b-a55b:free',
      label: 'Nemotron 3 Ultra (free)',
      description: 'A very large mixture-of-experts reasoning model.',
      contextWindow: 1000000,
      reasoning: true,
    },
    {
      id: 'openrouter:openai/gpt-oss-20b:free',
      label: 'gpt-oss-20b (free)',
      contextWindow: 131072,
    },
  ],
  imageModels: [{ id: 'pollinations:sana' }],
};

const sseBody = (text) => {
  const encoder = new TextEncoder();
  const frames = text
    .split(' ')
    .map((word, i) => `data: ${JSON.stringify({ choices: [{ delta: { content: i ? ` ${word}` : word } }] })}\n\n`);
  frames.push('data: [DONE]\n\n');

  let index = 0;
  return {
    getReader: () => ({
      read: async () =>
        index < frames.length
          ? { done: false, value: encoder.encode(frames[index++]) }
          : { done: true, value: undefined },
    }),
  };
};

const artifactOutput = [
  'تم بناء واجهة كاملة وجاهزة للمعاينة.\n',
  ':::xstudio-artifact {"version":1,"title":"Demo Site","runtime":"static","entry":"index.html"}\n',
  ':::xstudio-file {"path":"index.html","language":"html"}\n',
  '<!doctype html><html><head><link rel="stylesheet" href="styles.css"></head>',
  '<body><main><h1>Demo Site</h1><button id="action">Start</button></main>',
  '<script src="app.js"></script></body></html>\n',
  ':::xstudio-end-file\n',
  ':::xstudio-file {"path":"styles.css","language":"css"}\n',
  'body{font-family:system-ui;background:#f5f7fb} main{max-width:720px;margin:auto}\n',
  ':::xstudio-end-file\n',
  ':::xstudio-file {"path":"app.js","language":"javascript"}\n',
  'document.querySelector("#action").addEventListener("click",()=>document.body.dataset.ready="1");\n',
  ':::xstudio-end-file\n',
  ':::xstudio-end-artifact',
].join('');

beforeEach(() => {
  localStorage.clear();

  global.fetch = jest.fn(async (url) => {
    if (String(url).includes('/models')) {
      return { ok: true, status: 200, json: async () => modelsPayload };
    }
    return {
      ok: true,
      status: 200,
      body: sseBody('Hello from the model'),
      headers: new Map([
        ['x-ai-provider', 'llm7'],
        ['x-ai-model', 'gemini-3.1-flash-lite'],
        ['x-ai-fallback', '0'],
      ]),
    };
  });

  // Response headers are read via .get(); Map already provides it.
  global.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 0);
  global.cancelAnimationFrame = (id) => clearTimeout(id);
  Element.prototype.scrollIntoView = jest.fn();

  // jsdom ships neither of these browser APIs.
  global.IntersectionObserver = class {
    observe() {}

    unobserve() {}

    disconnect() {}
  };
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('X Studio app', () => {
  it('renders the welcome screen without crashing', async () => {
    render(<App />);
    expect(await screen.findByRole('button', { name: /محادثة جديدة|new chat/i })).toBeInTheDocument();
  });

  it('loads the discovered model list with details into the picker', async () => {
    render(<App />);

    await userEvent.click(await screen.findByRole('button', { name: /nemotron/i }));

    await waitFor(() =>
      expect(screen.getByPlaceholderText(/ابحث عن نموذج|search models/i)).toBeInTheDocument()
    );

    // provider group, vendor, label and description all come from discovery
    const dialog = screen.getByRole('dialog');
    await waitFor(() =>
      expect(within(dialog).getByRole('heading', { name: 'OpenRouter' })).toBeInTheDocument()
    );
    expect(within(dialog).getByText('Nemotron 3 Ultra (free)')).toBeInTheDocument();
    expect(within(dialog).getByText('gpt-oss-20b (free)')).toBeInTheDocument();
    expect(within(dialog).getAllByText('NVIDIA').length).toBeGreaterThan(0);
    expect(
      within(dialog).getByText(/mixture-of-experts reasoning model/i)
    ).toBeInTheDocument();
    expect(within(dialog).getByText('1M')).toBeInTheDocument();
  });

  it('offers image models in their own tab', async () => {
    render(<App />);

    await userEvent.click(await screen.findByRole('button', { name: /nemotron/i }));
    const dialog = screen.getByRole('dialog');
    await userEvent.click(within(dialog).getByRole('tab', { name: /نماذج صور|image models/i }));

    await waitFor(() =>
      expect(within(dialog).getByRole('heading', { name: 'Pollinations' })).toBeInTheDocument()
    );
    expect(within(dialog).getByText('Sana')).toBeInTheDocument();
  });

  it('keeps provider configuration and API keys out of Settings', async () => {
    // This test only exercises local Settings UI; keep model discovery pending
    // so unrelated async catalogue updates cannot outlive the assertion.
    global.fetch.mockImplementationOnce(() => new Promise(() => {}));
    render(<App />);

    await userEvent.click(screen.getByRole('button', { name: /الإعدادات|settings/i }));

    expect(
      screen.getByRole('heading', { name: /الإعدادات|settings/i })
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/مزوّدو النماذج المجانية|free model providers/i)
    ).not.toBeInTheDocument();
    expect(document.querySelector('input[type="password"]')).not.toBeInTheDocument();
  });

  it('builds a runnable website in the side workspace', async () => {
    expect(parseArtifactResponse(artifactOutput).status).toBe('complete');
    global.fetch.mockImplementation(async (url) => {
      if (String(url).includes('/models')) {
        return { ok: true, status: 200, json: async () => modelsPayload };
      }
      return {
        ok: true,
        status: 200,
        body: sseBody(artifactOutput),
        headers: new Map([
          ['x-ai-provider', 'openrouter'],
          ['x-ai-model', 'nvidia/nemotron-3-ultra-550b-a55b:free'],
          ['x-ai-fallback', '0'],
        ]),
      };
    });

    render(<App />);
    await userEvent.type(screen.getByRole('textbox'), 'أنشئ لي موقعاً احترافياً');
    await userEvent.keyboard('{Enter}');

    expect(await screen.findByRole('heading', { name: 'Demo Site' })).toBeInTheDocument();
    const frame = screen.getByTitle('Demo Site');
    expect(frame).toHaveAttribute('sandbox', 'allow-scripts');
    expect(frame.getAttribute('srcdoc')).toContain('Content-Security-Policy');
    expect(screen.queryByText(/xstudio-artifact/)).not.toBeInTheDocument();
  });

  it('streams an assistant reply into the transcript', async () => {
    render(<App />);

    const input = screen.getByRole('textbox');
    await userEvent.type(input, 'مرحبا');
    await userEvent.keyboard('{Enter}');

    expect(await screen.findByText('مرحبا')).toBeInTheDocument();
    await waitFor(
      () => expect(screen.getByText(/Hello from the model/)).toBeInTheDocument(),
      { timeout: 5000 }
    );
  });
});
