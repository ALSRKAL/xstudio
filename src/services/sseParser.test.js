import { readSseStream } from './sseParser';

const encoder = new TextEncoder();

/** Minimal ReadableStream stub: yields the given strings as byte chunks */
const streamOf = (chunks) => {
  let index = 0;
  return {
    getReader: () => ({
      read: async () =>
        index < chunks.length
          ? { done: false, value: encoder.encode(chunks[index++]) }
          : { done: true, value: undefined },
    }),
  };
};

const frame = (delta) => `data: ${JSON.stringify({ choices: [{ delta }] })}\n\n`;

describe('readSseStream', () => {
  it('rebuilds the message from token deltas', async () => {
    const seen = [];
    const content = await readSseStream(
      streamOf([frame({ content: 'Hel' }), frame({ content: 'lo ' }), frame({ content: 'world' }), 'data: [DONE]\n\n']),
      (full) => seen.push(full)
    );

    expect(content).toBe('Hello world');
    expect(seen).toEqual(['Hel', 'Hello ', 'Hello world']);
  });

  it('handles frames split across network chunks', async () => {
    const full = frame({ content: 'split works' });
    const half = Math.floor(full.length / 2);

    const content = await readSseStream(streamOf([full.slice(0, half), full.slice(half)]));
    expect(content).toBe('split works');
  });

  it('ignores keepalives and malformed frames', async () => {
    const content = await readSseStream(
      streamOf([': ping\n\n', 'data: {not json}\n\n', frame({ content: 'ok' })])
    );
    expect(content).toBe('ok');
  });

  it('stops at [DONE] and ignores trailing frames', async () => {
    const content = await readSseStream(
      streamOf([frame({ content: 'done' }), 'data: [DONE]\n\n', frame({ content: 'ignored' })])
    );
    expect(content).toBe('done');
  });

  it('falls back to reasoning when content is empty', async () => {
    const content = await readSseStream(
      streamOf([frame({ reasoning: 'thinking out ' }), frame({ reasoning: 'loud' })])
    );
    expect(content).toBe('thinking out loud');
  });

  it('prefers content over reasoning', async () => {
    const content = await readSseStream(
      streamOf([frame({ reasoning: 'noise' }), frame({ content: 'answer' })])
    );
    expect(content).toBe('answer');
  });

  it('returns an empty string for an empty stream', async () => {
    expect(await readSseStream(streamOf([]))).toBe('');
  });
});
