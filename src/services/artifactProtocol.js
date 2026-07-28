// Versioned, line-oriented protocol for model-generated static previews.

export const ARTIFACT_VERSION = 1;

export const DEFAULT_ARTIFACT_LIMITS = Object.freeze({
  maxFiles: 50,
  maxFileBytes: 256 * 1024,
  maxTotalBytes: 1024 * 1024,
});

const MARKERS = Object.freeze({
  artifact: ':::xstudio-artifact',
  file: ':::xstudio-file',
  endFile: ':::xstudio-end-file',
  endArtifact: ':::xstudio-end-artifact',
});

const KNOWN_MARKERS = Object.values(MARKERS);
const ENGLISH_ACTION = /\b(?:build|create|make|develop|design|generate|write|code|implement)\b/i;
const ENGLISH_TARGET = /\b(?:web\s*site|website|web\s*page|landing\s*page|web\s*app|web\s*code|html|app(?:lication)?|ui|user\s*interface|dashboard)\b/i;
const ENGLISH_WANT = /\b(?:i\s+(?:want|need|would\s+like)|can\s+you|please)\b/i;
const ARABIC_ACTION = /(?:أنشئ|انشئ|أنشىء|اصنع|ابنِ?|بناء|صم[ّ]?م|طو[ّ]?ر|برمج|اعمل|اكتب|ول[ّ]?د|توليد)/;
const ARABIC_TARGET = /(?:موقع|صفحة\s*(?:ويب|هبوط)|تطبيق|واجهة\s*(?:مستخدم)?|لوحة\s*تحكم|كود\s*(?:ويب|موقع)|HTML)/i;
const ARABIC_WANT = /(?:أريد|اريد|احتاج|أحتاج|ارغب|أرغب|ممكن|لو\s*سمحت)/;

export const detectArtifactIntent = (input) => {
  if (typeof input !== 'string') return false;
  const text = input.trim();
  if (!text) return false;

  const englishAction = text.search(ENGLISH_ACTION);
  const englishTarget = text.search(ENGLISH_TARGET);
  const arabicAction = text.search(ARABIC_ACTION);
  const arabicTarget = text.search(ARABIC_TARGET);
  const explicitEnglish = englishTarget >= 0 && (ENGLISH_WANT.test(text) || (englishAction >= 0 && englishAction < englishTarget));
  const explicitArabic = arabicTarget >= 0 && (ARABIC_WANT.test(text) || (arabicAction >= 0 && arabicAction < arabicTarget));
  return explicitEnglish || explicitArabic;
};

const EDIT_ACTION = /\b(?:change|update|edit|fix|improve|add|remove|replace|redesign|make|continue)\b/i;
const ARABIC_EDIT_ACTION = /(?:غي[ّ]?ر|عد[ّ]?ل|أضف|اضف|احذف|أصلح|اصلح|حس[ّ]?ن|استبدل|كم[ّ]?ل|تابع)/;

export const detectArtifactEditIntent = (input) =>
  typeof input === 'string' && (EDIT_ACTION.test(input) || ARABIC_EDIT_ACTION.test(input));

const byteLength = (value) => {
  let bytes = 0;
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code < 0x80) bytes += 1;
    else if (code < 0x800) bytes += 2;
    else if (code >= 0xd800 && code <= 0xdbff && index + 1 < value.length && value.charCodeAt(index + 1) >= 0xdc00 && value.charCodeAt(index + 1) <= 0xdfff) {
      bytes += 4;
      index += 1;
    } else bytes += 3;
  }
  return bytes;
};

const normalizedLimits = (limits) => {
  const source = limits && typeof limits === 'object' ? limits : {};
  const read = (primary, alias, fallback) => {
    const value = source[primary] ?? source[alias];
    return Number.isSafeInteger(value) && value >= 0 ? value : fallback;
  };
  return {
    maxFiles: read('maxFiles', 'fileCount', DEFAULT_ARTIFACT_LIMITS.maxFiles),
    maxFileBytes: read('maxFileBytes', 'maxFileSize', DEFAULT_ARTIFACT_LIMITS.maxFileBytes),
    maxTotalBytes: read('maxTotalBytes', 'maxTotalSize', DEFAULT_ARTIFACT_LIMITS.maxTotalBytes),
  };
};

const safePath = (path) => {
  if (typeof path !== 'string' || !path || path.length > 1024) return false;
  if ([...path].some((character) => {
    const code = character.charCodeAt(0);
    return code < 32 || code === 127;
  }) || path.includes('\\') || path.startsWith('/') || /[?#]/.test(path)) return false;
  if (/^[a-z][a-z\d+.-]*:/i.test(path) || path.includes('://')) return false;
  const parts = path.split('/');
  return parts.every((part) => part && part !== '.' && part !== '..' && !part.includes(':'));
};

const makeLines = (text) => {
  const lines = [];
  let start = 0;
  while (start < text.length) {
    const newline = text.indexOf('\n', start);
    const end = newline === -1 ? text.length : newline;
    const raw = text.slice(start, end).replace(/\r$/, '');
    lines.push({ raw, start, end: newline === -1 ? end : newline + 1, terminated: newline !== -1 });
    if (newline === -1) break;
    start = newline + 1;
  }
  return lines;
};

const markerAt = (line, marker) => line === marker || line.startsWith(`${marker} `) || line.startsWith(`${marker}\t`);

const protocolStart = (lines) => {
  for (let index = 0; index < lines.length; index += 1) {
    const value = lines[index].raw.trimStart();
    if (value.startsWith(':::xstudio-')) return { index, partial: false };
    if (!lines[index].terminated && value.length >= 3 && KNOWN_MARKERS.some((marker) => marker.startsWith(value))) {
      return { index, partial: true };
    }
  }
  return null;
};

const result = (visibleText, status, project = null, error = null) => ({
  visibleText,
  status,
  project,
  error,
});

const markerJson = (line, marker) => {
  if (!markerAt(line, marker)) return { error: `Expected ${marker}.` };
  const json = line.slice(marker.length).trim();
  if (!json) return { error: `${marker} requires JSON metadata.` };
  try {
    const value = JSON.parse(json);
    return isPlainObject(value) ? { value } : { error: `${marker} metadata must be an object.` };
  } catch {
    return { error: `Malformed JSON after ${marker}.` };
  }
};

const isPlainObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

/**
 * Parses the complete text accumulated so far. It deliberately keeps no state,
 * so callers can invoke it independently for every streaming update.
 */
export const parseArtifactResponse = (cumulativeText, limits) => {
  const text = typeof cumulativeText === 'string' ? cumulativeText : '';
  const lines = makeLines(text);
  const start = protocolStart(lines);
  if (!start) return result(text, 'none');

  const visibleBefore = text.slice(0, lines[start.index].start);
  if (start.partial) return result(visibleBefore, 'streaming');

  const openingLine = lines[start.index];
  const opening = openingLine.raw.trimStart();
  if (!markerAt(opening, MARKERS.artifact)) {
    return result(visibleBefore, 'invalid', null, 'Protocol content must begin with an artifact marker.');
  }
  const envelopeResult = markerJson(opening, MARKERS.artifact);
  if (envelopeResult.error) {
    return openingLine.terminated
      ? result(visibleBefore, 'invalid', null, envelopeResult.error)
      : result(visibleBefore, 'streaming');
  }

  const envelope = envelopeResult.value;
  if (envelope.version !== ARTIFACT_VERSION) return result(visibleBefore, 'invalid', null, 'Unsupported artifact version.');
  if (envelope.runtime !== 'static') return result(visibleBefore, 'invalid', null, 'Only the static runtime is supported.');
  if (!safePath(envelope.entry)) return result(visibleBefore, 'invalid', null, 'Artifact entry path is unsafe.');
  if (!/\.html?$/i.test(envelope.entry)) return result(visibleBefore, 'invalid', null, 'Artifact entry must be an HTML file.');

  const appliedLimits = normalizedLimits(limits);
  const files = [];
  const paths = new Set();
  let totalBytes = 0;
  let current = null;
  let fileStart = 0;

  for (let index = start.index + 1; index < lines.length; index += 1) {
    const line = lines[index];
    const value = line.raw.trimStart();

    if (!line.terminated && value.length >= 3 && KNOWN_MARKERS.some(
      (marker) => marker !== value && marker.startsWith(value)
    )) {
      return result(visibleBefore, 'streaming');
    }

    if (current) {
      if (value === MARKERS.endFile) {
        const contentLines = lines.slice(fileStart, index).map((item) => item.raw);
        const content = contentLines.join('\n');
        const size = byteLength(content);
        if (size > appliedLimits.maxFileBytes) return result(visibleBefore, 'invalid', null, `File exceeds ${appliedLimits.maxFileBytes} bytes.`);
        totalBytes += size;
        if (totalBytes > appliedLimits.maxTotalBytes) return result(visibleBefore, 'invalid', null, `Artifact exceeds ${appliedLimits.maxTotalBytes} bytes.`);
        files.push({ path: current.path, content });
        current = null;
        continue;
      }
      if (KNOWN_MARKERS.some((marker) => markerAt(value, marker))) {
        return result(visibleBefore, 'invalid', null, `Unexpected protocol marker inside ${current.path}.`);
      }
      continue;
    }

    if (!value) continue;
    if (markerAt(value, MARKERS.file)) {
      if (files.length >= appliedLimits.maxFiles) return result(visibleBefore, 'invalid', null, `Artifact exceeds ${appliedLimits.maxFiles} files.`);
      const fileMetadata = markerJson(value, MARKERS.file);
      if (fileMetadata.error) {
        return line.terminated ? result(visibleBefore, 'invalid', null, fileMetadata.error) : result(visibleBefore, 'streaming');
      }
      if (!safePath(fileMetadata.value.path)) return result(visibleBefore, 'invalid', null, 'Artifact contains an unsafe file path.');
      if (paths.has(fileMetadata.value.path)) return result(visibleBefore, 'invalid', null, `Duplicate file path: ${fileMetadata.value.path}.`);
      paths.add(fileMetadata.value.path);
      current = { path: fileMetadata.value.path };
      fileStart = index + 1;
      continue;
    }
    if (value === MARKERS.endArtifact) {
      if (!paths.has(envelope.entry)) return result(visibleBefore, 'invalid', null, 'Artifact entry file does not exist.');
      const visibleText = visibleBefore + text.slice(line.end);
      return result(visibleText, 'complete', {
        version: ARTIFACT_VERSION,
        title: typeof envelope.title === 'string' ? envelope.title.slice(0, 120) : '',
        runtime: 'static',
        entry: envelope.entry,
        files,
      });
    }
    return result(visibleBefore, 'invalid', null, `Unexpected content in artifact envelope: ${value.slice(0, 80)}.`);
  }

  if (current) {
    const partial = lines.slice(fileStart).map((item) => item.raw).join('\n');
    if (byteLength(partial) > appliedLimits.maxFileBytes) return result(visibleBefore, 'invalid', null, `File exceeds ${appliedLimits.maxFileBytes} bytes.`);
  }
  return result(visibleBefore, 'streaming');
};

export { MARKERS as ARTIFACT_MARKERS };

/**
 * Compatibility path for models that ignore the structured protocol but return
 * complete fenced HTML/CSS/JS. Used only after generation has finished.
 */
export const parseFencedArtifactResponse = (text, limits) => {
  if (typeof text !== 'string') return null;
  const blocks = [];
  const pattern = /```(html|css|javascript|js)\s*\n([\s\S]*?)```/gi;
  let match;
  while ((match = pattern.exec(text))) {
    blocks.push({ language: match[1].toLowerCase(), content: match[2].trim(), start: match.index, end: pattern.lastIndex });
  }
  const html = blocks.find((block) => block.language === 'html');
  if (!html || !/<(?:!doctype\s+html|html|body|main|div)\b/i.test(html.content)) return null;

  const css = blocks.find((block) => block.language === 'css');
  const script = blocks.find((block) => block.language === 'js' || block.language === 'javascript');
  let entryContent = html.content;
  if (css && !/href=["']styles\.css["']/i.test(entryContent)) {
    entryContent = /<\/head>/i.test(entryContent)
      ? entryContent.replace(/<\/head>/i, '<link rel="stylesheet" href="styles.css"></head>')
      : `<link rel="stylesheet" href="styles.css">${entryContent}`;
  }
  if (script && !/src=["']app\.js["']/i.test(entryContent)) {
    entryContent = /<\/body>/i.test(entryContent)
      ? entryContent.replace(/<\/body>/i, '<script src="app.js"></script></body>')
      : `${entryContent}<script src="app.js"></script>`;
  }

  const files = [{ path: 'index.html', content: entryContent }];
  if (css) files.push({ path: 'styles.css', content: css.content });
  if (script) files.push({ path: 'app.js', content: script.content });

  const appliedLimits = normalizedLimits(limits);
  if (files.length > appliedLimits.maxFiles) return null;
  let total = 0;
  for (const file of files) {
    const size = byteLength(file.content);
    if (size > appliedLimits.maxFileBytes) return null;
    total += size;
  }
  if (total > appliedLimits.maxTotalBytes) return null;

  const visibleText = blocks
    .reduceRight((output, block) => `${output.slice(0, block.start)}${output.slice(block.end)}`, text)
    .trim();
  return result(visibleText, 'complete', {
    version: ARTIFACT_VERSION,
    title: '',
    runtime: 'static',
    entry: 'index.html',
    files,
  });
};