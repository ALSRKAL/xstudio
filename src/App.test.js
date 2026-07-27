import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// The markdown/highlighter stack is ESM-only and irrelevant to this smoke test,
// so it is stubbed with a plain text renderer.
jest.mock('react-markdown', () => ({ children }) => <span>{children}</span>);
jest.mock('remark-gfm', () => () => undefined);
jest.mock('react-syntax-highlighter', () => ({
  Prism: ({ children }) => <pre>{children}</pre>,
}));
jest.mock('react-syntax-highlighter/dist/esm/styles/prism', () => ({ vscDarkPlus: {} }));

// eslint-disable-next-line import/first
import App from './App';

const modelsPayload = {
  success: true,
  updatedAt: new Date().toISOString(),
  providers: [{ id: 'llm7', keyless: true, modelCount: 2 }],
  models: [
    { id: 'llm7:gemini-3.1-flash-lite', contextWindow: 128000 },
    { id: 'groq:llama-3.1-8b-instant', contextWindow: 131072 },
  ],
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

  it('loads the discovered model list into the picker', async () => {
    render(<App />);

    await userEvent.click(screen.getByRole('button', { name: /gemini|flash/i }));

    await waitFor(() =>
      expect(screen.getByPlaceholderText(/ابحث عن نموذج|search models/i)).toBeInTheDocument()
    );
    await waitFor(() => expect(screen.getByText('Groq')).toBeInTheDocument());
    expect(screen.getByText(/Llama 3.1 8B Instant/i)).toBeInTheDocument();
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
