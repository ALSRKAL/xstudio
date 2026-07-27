import { compilePreview } from './previewCompiler';

const project = (html, extraFiles = []) => ({
  version: 1,
  runtime: 'static',
  entry: 'index.html',
  files: [{ path: 'index.html', content: html }, ...extraFiles],
});

const parse = (srcDoc) => new DOMParser().parseFromString(srcDoc, 'text/html');

describe('compilePreview', () => {
  it('inlines local stylesheets and scripts', () => {
    const output = compilePreview(project(
      '<!doctype html><html><head><link rel="stylesheet" href="styles/site.css"></head>' +
        '<body><h1>Preview</h1><script src="scripts/app.js"></script></body></html>',
      [
        { path: 'styles/site.css', content: 'h1 { color: rebeccapurple; }' },
        { path: 'scripts/app.js', content: 'document.body.dataset.loaded = "true";' },
      ]
    ));

    expect(output.error).toBeUndefined();
    expect(output.srcDoc).toContain('h1 { color: rebeccapurple; }');
    expect(output.srcDoc).toContain('document.body.dataset.loaded = "true";');
    expect(output.srcDoc).not.toContain('href="styles/site.css"');
    expect(output.srcDoc).not.toContain('src="scripts/app.js"');
  });

  it('places its restrictive CSP as the first head child', () => {
    const output = compilePreview(project('<html><head><title>X</title></head><body></body></html>'));
    const doc = parse(output.srcDoc);
    const first = doc.head.firstElementChild;

    expect(first.tagName).toBe('META');
    expect(first.getAttribute('http-equiv')).toBe('Content-Security-Policy');
    const policy = first.getAttribute('content');
    expect(policy).toContain("default-src 'none'");
    expect(policy).toContain("connect-src 'none'");
    expect(policy).toContain("form-action 'none'");
    expect(policy).toContain("navigate-to 'none'");
  });

  it('strips hostile elements, metadata, handlers, and network resources', () => {
    const html = `<!doctype html><html><head>
      <meta http-equiv="refresh" content="0;url=https://evil.test">
      <base href="https://evil.test/"><link rel="stylesheet" href="https://evil.test/a.css">
      <style>@import "https://evil.test/b.css"; .x{background:url(https://evil.test/x.png)}</style>
      </head><body onload="steal()">
      <iframe src="https://evil.test"></iframe><object data="/bad"></object><embed src="/bad">
      <form action="https://evil.test"><input></form>
      <img src="https://evil.test/pixel" srcset="//evil.test/a 2x">
      <a href="https://evil.test" target="_top" ping="https://evil.test/p">leave</a>
      <script src="https://evil.test/payload.js"></script>
      </body></html>`;
    const output = compilePreview(project(html));
    const doc = parse(output.srcDoc);

    expect(doc.querySelectorAll('base,iframe,object,embed,form').length).toBe(0);
    expect(doc.querySelectorAll('meta').length).toBe(1);
    expect(doc.querySelector('script')).toBeNull();
    expect(doc.body.hasAttribute('onload')).toBe(false);
    expect(doc.querySelector('img').hasAttribute('src')).toBe(false);
    expect(doc.querySelector('img').hasAttribute('srcset')).toBe(false);
    expect(doc.querySelector('a').hasAttribute('href')).toBe(false);
    expect(output.srcDoc).not.toContain('https://evil.test');
    expect(output.srcDoc).not.toContain('//evil.test');
  });

  it('resolves local resources relative to a nested entry', () => {
    const nested = {
      runtime: 'static',
      entry: 'pages/index.html',
      files: [
        { path: 'pages/index.html', content: '<link rel="stylesheet" href="../assets/x.css"><script src="./x.js"></script>' },
        { path: 'assets/x.css', content: 'body{color:green}' },
        { path: 'pages/x.js', content: 'document.title="ok"' },
      ],
    };
    const output = compilePreview(nested);
    expect(output.srcDoc).toContain('body{color:green}');
    expect(output.srcDoc).toContain('document.title="ok"');
  });

  test.each([null, {}, { runtime: 'server', entry: 'index.html', files: [] }, {
    runtime: 'static', entry: 'missing.html', files: [],
  }])('never throws for invalid project input', (input) => {
    expect(() => compilePreview(input)).not.toThrow();
    expect(compilePreview(input)).toEqual(expect.objectContaining({ srcDoc: '', error: expect.any(String) }));
  });
});