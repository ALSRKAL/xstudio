// ============================================================================
// Server-Sent Events reader for OpenAI-compatible token streams.
// Kept separate from the transport so it can be tested in isolation.
// ============================================================================

/**
 * Consume an SSE body and rebuild the assistant message as tokens arrive.
 *
 * @param {{ getReader: Function }} body  a ReadableStream (or compatible stub)
 * @param {(full: string, delta: string) => void} [onToken]
 * @returns {Promise<string>} the complete message
 */
export const readSseStream = async (body, onToken) => {
  const reader = body.getReader();
  const decoder = new TextDecoder();

  let buffer = '';
  let content = '';
  // Some reasoning models put the answer in `reasoning` and leave `content`
  // empty. Kept as a safety net so the user never sees a blank reply.
  let reasoning = '';
  let done = false;

  const handleLine = (line) => {
    const trimmed = line.trim();
    if (!trimmed.startsWith('data:')) return;

    const data = trimmed.slice(5).trim();
    if (!data) return;
    if (data === '[DONE]') {
      done = true;
      return;
    }

    try {
      const parsed = JSON.parse(data);
      const choice = parsed?.choices?.[0];
      const delta = choice?.delta || {};
      const piece = delta.content ?? choice?.text ?? '';

      if (piece) {
        content += piece;
        onToken?.(content, piece);
      } else if (delta.reasoning || delta.reasoning_content) {
        reasoning += delta.reasoning || delta.reasoning_content;
      }
    } catch {
      /* partial or non-JSON keepalive frame: ignore */
    }
  };

  // eslint-disable-next-line no-constant-condition
  while (true) {
    // eslint-disable-next-line no-await-in-loop
    const { done: finished, value } = await reader.read();
    if (finished) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      handleLine(line);
      if (done) break;
    }
    if (done) break;
  }

  if (!done && buffer) handleLine(buffer);

  if (!content.trim() && reasoning.trim()) {
    content = reasoning.trim();
    onToken?.(content, content);
  }

  return content;
};
