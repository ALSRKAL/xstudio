import {
  clearArtifacts,
  createArtifact,
  deleteArtifactsForChat,
  getArtifact,
  getLatestArtifactForChat,
  saveArtifact,
} from './artifactStore';

const sourceProject = {
  title: 'Stored project',
  runtime: 'static',
  entry: 'index.html',
  files: [{ path: 'index.html', content: '<h1>One</h1>' }],
};

describe('artifactStore', () => {
  beforeEach(() => clearArtifacts());
  afterEach(() => clearArtifacts());

  it('creates and retrieves a project by id and chat', async () => {
    const created = await createArtifact(sourceProject, { chatId: 'chat-a' });
    expect((await getArtifact(created.id)).title).toBe('Stored project');
    expect((await getLatestArtifactForChat('chat-a')).id).toBe(created.id);
  });

  it('keeps bounded snapshots when edited', async () => {
    const created = await createArtifact(sourceProject, { chatId: 'chat-b' });
    const saved = await saveArtifact({
      ...created,
      files: [{ path: 'index.html', content: '<h1>Two</h1>' }],
    });
    expect(saved.version).toBe(2);
    expect(saved.versions).toHaveLength(1);
    expect(saved.versions[0].files[0].content).toContain('One');
  });

  it('deletes only projects belonging to the requested chat', async () => {
    const first = await createArtifact(sourceProject, { chatId: 'chat-c' });
    const second = await createArtifact(sourceProject, { chatId: 'chat-d' });
    await deleteArtifactsForChat('chat-c');
    expect(await getArtifact(first.id)).toBeNull();
    expect(await getArtifact(second.id)).not.toBeNull();
  });
});