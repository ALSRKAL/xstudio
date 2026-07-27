import {
  ARTIFACT_MARKERS,
  detectArtifactEditIntent,
  detectArtifactIntent,
  parseArtifactResponse,
  parseFencedArtifactResponse,
} from './artifactProtocol';

const projectText = ({
  entry = 'index.html',
  runtime = 'static',
  files = [
    { path: 'index.html', content: '<h1>Hello</h1>' },
    { path: 'app.js', content: 'document.body.dataset.ready = "yes";' },
  ],
} = {}) => [
  'Visible introduction.\n',
  `${ARTIFACT_MARKERS.artifact} ${JSON.stringify({ version: 1, runtime, entry })}\n`,
  ...files.flatMap((file) => [
    `${ARTIFACT_MARKERS.file} ${JSON.stringify({ path: file.path })}\n`,
    `${file.content}\n`,
    `${ARTIFACT_MARKERS.endFile}\n`,
  ]),
  `${ARTIFACT_MARKERS.endArtifact}\n`,
  'Visible conclusion.',
].join('');

describe('detectArtifactIntent', () => {
  test.each([
    'Build me a responsive website',
    'Please create a dashboard UI',
    'I want a web app for my shop',
    'أنشئ لي موقعاً متجاوباً',
    'أريد تطبيق ويب لمتجري',
    'صمم واجهة مستخدم حديثة',
  ])('detects an explicit build request: %s', (prompt) => {
    expect(detectArtifactIntent(prompt)).toBe(true);
  });

  test.each(['What is a website?', 'Explain UI design', 'ما هو الموقع الإلكتروني؟', '', null])(
    'does not infer build intent from discussion: %s',
    (prompt) => expect(detectArtifactIntent(prompt)).toBe(false)
  );
  test.each(['Change the hero color', 'Add a pricing section', 'عدّل الألوان', 'أضف نموذج تواصل'])(
    'detects an iterative project edit: %s',
    (prompt) => expect(detectArtifactEditIntent(prompt)).toBe(true)
  );
});

describe('parseArtifactResponse', () => {
  it('parses a complete project while hiding every protocol byte', () => {
    const parsed = parseArtifactResponse(projectText());
    expect(parsed.status).toBe('complete');
    expect(parsed.error).toBeNull();
    expect(parsed.visibleText).toBe('Visible introduction.\nVisible conclusion.');
    expect(parsed.visibleText).not.toContain('xstudio');
    expect(parsed.project).toEqual({
      version: 1,
      title: '',
      runtime: 'static',
      entry: 'index.html',
      files: [
        { path: 'index.html', content: '<h1>Hello</h1>' },
        { path: 'app.js', content: 'document.body.dataset.ready = "yes";' },
      ],
    });
  });

  it('supports independent cumulative calls across arbitrary fragmentation', () => {
    const complete = projectText();
    const endMarker = complete.indexOf(ARTIFACT_MARKERS.endArtifact);
    const cuts = [0, 5, complete.indexOf(':::xstudio') + 4, 55, 103, endMarker + 8];
    cuts.forEach((cut) => {
      const parsed = parseArtifactResponse(complete.slice(0, cut));
      expect(parsed.project).toBeNull();
      expect(['none', 'streaming']).toContain(parsed.status);
      expect(parsed.visibleText).not.toContain(':::');
    });
    expect(parseArtifactResponse(complete).status).toBe('complete');
  });

  it('distinguishes malformed and truncated artifacts', () => {
    const malformed = 'Prose\n:::xstudio-artifact {bad json}\n';
    const truncated = projectText().split(ARTIFACT_MARKERS.endArtifact)[0];

    expect(parseArtifactResponse(malformed)).toMatchObject({
      visibleText: 'Prose\n', status: 'invalid', project: null,
    });
    expect(parseArtifactResponse(truncated)).toMatchObject({
      visibleText: 'Visible introduction.\n', status: 'streaming', project: null, error: null,
    });
  });

  test.each(['../secret.html', '/index.html', 'https://evil.test/x.html', 'dir\\index.html', 'a/../index.html', 'bad\0name.html'])(
    'rejects unsafe POSIX paths: %s',
    (path) => {
      const parsed = parseArtifactResponse(projectText({
        files: [{ path, content: '<p>unsafe</p>' }, { path: 'index.html', content: '<p>entry</p>' }],
      }));
      expect(parsed.status).toBe('invalid');
      expect(parsed.project).toBeNull();
    }
  );

  it('rejects duplicate files, missing entries, and non-static runtimes', () => {
    const duplicate = projectText({ files: [
      { path: 'index.html', content: 'one' },
      { path: 'index.html', content: 'two' },
    ] });
    expect(parseArtifactResponse(duplicate).status).toBe('invalid');
    expect(parseArtifactResponse(projectText({ entry: 'missing.html' })).status).toBe('invalid');
    expect(parseArtifactResponse(projectText({ runtime: 'react' })).status).toBe('invalid');
  });

  it('enforces file-count, per-file, and total byte limits', () => {
    expect(parseArtifactResponse(projectText(), { maxFiles: 1 }).status).toBe('invalid');
    expect(parseArtifactResponse(projectText({ files: [{ path: 'index.html', content: '12345' }] }), {
      maxFileBytes: 4,
    }).status).toBe('invalid');
    expect(parseArtifactResponse(projectText({ files: [
      { path: 'index.html', content: '1234' },
      { path: 'a.js', content: '5678' },
    ] }), { maxTotalBytes: 7 }).status).toBe('invalid');
  });

  it('recovers a complete fenced static project from less capable models', () => {
    const parsed = parseFencedArtifactResponse([
      'Built the page.\n',
      '```html\n<html><head></head><body><h1>Demo</h1></body></html>\n```\n',
      '```css\nh1{color:blue}\n```\n',
      '```javascript\ndocument.body.dataset.ready="1";\n```',
    ].join(''));
    expect(parsed.status).toBe('complete');
    expect(parsed.visibleText).toBe('Built the page.');
    expect(parsed.project.files).toHaveLength(3);
    expect(parsed.project.files[0].content).toContain('styles.css');
    expect(parsed.project.files[0].content).toContain('app.js');
  });

  it('returns plain prose unchanged', () => {
    expect(parseArtifactResponse('Just an answer.')).toEqual({
      visibleText: 'Just an answer.', status: 'none', project: null, error: null,
    });
  });
});