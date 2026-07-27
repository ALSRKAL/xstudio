// Compiles an untrusted static artifact into a network-isolated iframe srcDoc.

const CSP = [
  "default-src 'none'",
  "script-src 'unsafe-inline'",
  "style-src 'unsafe-inline'",
  'img-src data: blob:',
  'font-src data:',
  "media-src 'none'",
  "connect-src 'none'",
  "frame-src 'none'",
  "child-src 'none'",
  "object-src 'none'",
  "form-action 'none'",
  "base-uri 'none'",
  "navigate-to 'none'",
].join('; ');

const PATH_SCHEME = /^[a-z][a-z\d+.-]*:/i;
const DANGEROUS_ELEMENTS = 'base,iframe,object,embed,form';
const URL_ATTRIBUTES = [
  'src', 'href', 'srcset', 'action', 'formaction', 'poster', 'data',
  'cite', 'background', 'xlink:href',
];

const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

const projectFileMap = (project) => {
  const map = new Map();
  if (Array.isArray(project.files)) {
    project.files.forEach((file) => {
      if (isObject(file) && typeof file.path === 'string' && typeof file.content === 'string' && !map.has(file.path)) {
        map.set(file.path, file.content);
      }
    });
  } else if (isObject(project.files)) {
    Object.keys(project.files).forEach((path) => {
      if (typeof project.files[path] === 'string') map.set(path, project.files[path]);
    });
  }
  return map;
};

const resolveLocalPath = (entry, reference) => {
  if (typeof reference !== 'string') return null;
  const cleanReference = reference.trim().split(/[?#]/, 1)[0];
  if (!cleanReference || cleanReference.startsWith('//') || PATH_SCHEME.test(cleanReference) || cleanReference.includes('\\')) return null;
  let decoded;
  try {
    decoded = decodeURIComponent(cleanReference);
  } catch {
    return null;
  }
  const base = decoded.startsWith('/') ? [] : entry.split('/').slice(0, -1);
  const parts = decoded.replace(/^\/+/, '').split('/');
  for (const part of parts) {
    if (!part || part === '.') continue;
    if (part === '..') {
      if (!base.length) return null;
      base.pop();
    } else {
      base.push(part);
    }
  }
  return base.join('/') || null;
};

const safeCss = (css) => String(css)
  .replace(/@import\s+(?:url\()?\s*[^;]+;?/gi, '')
  .replace(/url\(\s*(['"]?)(?!data:image\/|#)[^)]*\1\s*\)/gi, 'url("")')
  .replace(/<\/style/gi, '<\\/style');

const safeScript = (script) => String(script).replace(/<\/script/gi, '<\\/script');

const allowedEmbeddedUrl = (value, element, attribute) => {
  const trimmed = value.trim();
  if (!trimmed) return true;
  if ((attribute === 'href' || attribute === 'xlink:href') && trimmed.startsWith('#')) return true;
  return (element.tagName === 'IMG' || element.tagName === 'IMAGE') && /^data:image\/(?:png|gif|jpeg|webp|svg\+xml);/i.test(trimmed);
};

const sanitizeAttributes = (doc) => {
  Array.from(doc.querySelectorAll('*')).forEach((element) => {
    Array.from(element.attributes).forEach((attribute) => {
      const name = attribute.name.toLowerCase();
      if (name.startsWith('on') || name === 'target' || name === 'ping' || name === 'download') {
        element.removeAttribute(attribute.name);
      } else if (name === 'style') {
        element.setAttribute(attribute.name, safeCss(attribute.value));
      } else if (URL_ATTRIBUTES.includes(name) && !allowedEmbeddedUrl(attribute.value, element, name)) {
        element.removeAttribute(attribute.name);
      }
    });
  });
};

const inlineLocalResources = (doc, entry, files) => {
  Array.from(doc.querySelectorAll('link')).forEach((link) => {
    const rel = (link.getAttribute('rel') || '').toLowerCase().split(/\s+/);
    const path = resolveLocalPath(entry, link.getAttribute('href'));
    if (rel.includes('stylesheet') && path && files.has(path)) {
      const style = doc.createElement('style');
      style.textContent = safeCss(files.get(path));
      link.replaceWith(style);
    } else {
      link.remove();
    }
  });

  Array.from(doc.querySelectorAll('script[src]')).forEach((script) => {
    const path = resolveLocalPath(entry, script.getAttribute('src'));
    if (!path || !files.has(path)) {
      script.remove();
      return;
    }
    script.removeAttribute('src');
    script.removeAttribute('integrity');
    script.removeAttribute('crossorigin');
    script.textContent = safeScript(files.get(path));
  });

  Array.from(doc.querySelectorAll('style')).forEach((style) => {
    style.textContent = safeCss(style.textContent || '');
  });
  Array.from(doc.querySelectorAll('script:not([src])')).forEach((script) => {
    script.textContent = safeScript(script.textContent || '');
  });
};

const injectCspFirst = (doc) => {
  const existingHead = doc.head || doc.documentElement.insertBefore(doc.createElement('head'), doc.body || null);
  const csp = doc.createElement('meta');
  csp.setAttribute('http-equiv', 'Content-Security-Policy');
  csp.setAttribute('content', CSP);
  existingHead.insertBefore(csp, existingHead.firstChild);
};

/**
 * Compile an artifact project into iframe srcDoc. Invalid model/user input is
 * reported as data instead of escaping as an exception.
 */
export const compilePreview = (project) => {
  try {
    if (!isObject(project) || project.runtime !== 'static' || typeof project.entry !== 'string') {
      return { srcDoc: '', error: 'Invalid static preview project.' };
    }
    if (typeof DOMParser === 'undefined') return { srcDoc: '', error: 'HTML preview compilation is unavailable.' };

    const files = projectFileMap(project);
    const entryHtml = files.get(project.entry);
    if (typeof entryHtml !== 'string' || !/\.html?$/i.test(project.entry)) {
      return { srcDoc: '', error: 'Preview entry HTML file was not found.' };
    }

    const doc = new DOMParser().parseFromString(entryHtml, 'text/html');
    if (!doc || !doc.documentElement) return { srcDoc: '', error: 'Preview entry HTML is invalid.' };

    Array.from(doc.querySelectorAll('meta')).forEach((meta) => meta.remove());
    Array.from(doc.querySelectorAll(DANGEROUS_ELEMENTS)).forEach((element) => element.remove());
    inlineLocalResources(doc, project.entry, files);
    sanitizeAttributes(doc);
    injectCspFirst(doc);

    return { srcDoc: `<!doctype html>\n${doc.documentElement.outerHTML}` };
  } catch {
    return { srcDoc: '', error: 'Unable to compile this preview safely.' };
  }
};

// Descriptive aliases for callers that prefer project-oriented names.
export const compileProject = compilePreview;
export const compilePreviewProject = compilePreview;

export { CSP as PREVIEW_CSP };