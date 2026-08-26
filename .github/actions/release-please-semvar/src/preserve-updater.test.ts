import { parseDiffHunks, applyPreserveHunks, PreserveUpdater } from './preserve-updater';

describe('parseDiffHunks', () => {
  it('parses a single-line replacement hunk', () => {
    const diff = [
      '@@ -5,1 +5,1 @@',
      '-  tag: sha-abc123',
      '+  tag: sha-def456',
    ].join('\n');
    const hunks = parseDiffHunks(diff);
    expect(hunks).toHaveLength(1);
    expect(hunks[0].rem).toEqual(['  tag: sha-abc123']);
    expect(hunks[0].add).toEqual(['  tag: sha-def456']);
  });

  it('parses multiple hunks', () => {
    const diff = [
      '@@ -3,1 +3,1 @@',
      '-  tag: sha-aaa',
      '+  tag: sha-bbb',
      '@@ -10,1 +10,1 @@',
      '-  tag: sha-ccc',
      '+  tag: sha-ddd',
    ].join('\n');
    const hunks = parseDiffHunks(diff);
    expect(hunks).toHaveLength(2);
  });

  it('handles multi-line hunks', () => {
    const diff = [
      '@@ -3,2 +3,1 @@',
      '-  line1',
      '-  line2',
      '+  combined',
    ].join('\n');
    const hunks = parseDiffHunks(diff);
    expect(hunks).toHaveLength(1);
    expect(hunks[0].rem).toHaveLength(2);
    expect(hunks[0].add).toHaveLength(1);
  });

  it('returns empty for empty diff', () => {
    expect(parseDiffHunks('')).toHaveLength(0);
  });
});

describe('applyPreserveHunks', () => {
  it('replaces a line directly when old value is present', () => {
    const content = 'image:\n  tag: sha-abc123\nreplicas: 1\n';
    const hunks = [{ rem: ['  tag: sha-abc123'], add: ['  tag: sha-def456'] }];
    const result = applyPreserveHunks(content, hunks, 'values.yaml');
    expect(result.changed).toBe(true);
    expect(result.content).toContain('tag: sha-def456');
    expect(result.content).not.toContain('tag: sha-abc123');
  });

  it('skips when content already contains the new value', () => {
    const content = 'image:\n  tag: sha-def456\nreplicas: 1\n';
    const hunks = [{ rem: ['  tag: sha-abc123'], add: ['  tag: sha-def456'] }];
    const result = applyPreserveHunks(content, hunks, 'values.yaml');
    expect(result.changed).toBe(false);
  });

  it('uses key-prefix matching when main also changed the line', () => {
    const content = 'image:\n  tag: sha-xyz789\nreplicas: 1\n';
    const hunks = [{ rem: ['  tag: sha-abc123'], add: ['  tag: sha-def456'] }];
    const result = applyPreserveHunks(content, hunks, 'values.yaml');
    expect(result.changed).toBe(true);
    expect(result.content).toContain('tag: sha-def456');
    expect(result.content).not.toContain('tag: sha-xyz789');
  });

  it('skips non-scalar hunks', () => {
    const content = 'foo: bar\n';
    const hunks = [{ rem: ['line1', 'line2'], add: ['combined'] }];
    const result = applyPreserveHunks(content, hunks, 'values.yaml');
    expect(result.changed).toBe(false);
  });

  it('warns when line cannot be located and has no YAML key separator', () => {
    const content = 'something else entirely\n';
    const hunks = [{ rem: ['no-colon-line'], add: ['replacement'] }];
    const result = applyPreserveHunks(content, hunks, 'values.yaml');
    expect(result.changed).toBe(false);
  });

  it('handles anchored tag lines', () => {
    const content = 'image:\n  tag: &backendImage sha-old111\nreplicas: 1\n';
    const hunks = [{ rem: ['  tag: &backendImage sha-old111'], add: ['  tag: &backendImage sha-new222'] }];
    const result = applyPreserveHunks(content, hunks, 'values.yaml');
    expect(result.changed).toBe(true);
    expect(result.content).toContain('tag: &backendImage sha-new222');
  });
});

describe('PreserveUpdater', () => {
  it('applies hunks via updateContent', () => {
    const hunks = [{ rem: ['  tag: sha-old'], add: ['  tag: sha-new'] }];
    const updater = new PreserveUpdater(hunks, 'test.yaml');
    const result = updater.updateContent('image:\n  tag: sha-old\n');
    expect(result).toContain('tag: sha-new');
  });

  it('returns empty string for undefined content', () => {
    const updater = new PreserveUpdater([], 'test.yaml');
    expect(updater.updateContent(undefined)).toBe('');
  });
});
