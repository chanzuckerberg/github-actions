import { deletesCodeowners, ChangedFile } from './github';

const PATH = '.github/CODEOWNERS';

function file(filename: string, status: string, previousFilename?: string): ChangedFile {
  return { filename, status, previousFilename };
}

describe('deletesCodeowners', () => {
  it('is true when CODEOWNERS is removed', () => {
    expect(deletesCodeowners([file(PATH, 'removed')], PATH)).toBe(true);
  });

  it('is true when CODEOWNERS is renamed away', () => {
    expect(deletesCodeowners([file('docs/OWNERS', 'renamed', PATH)], PATH)).toBe(true);
  });

  it('is false when CODEOWNERS is merely modified', () => {
    expect(deletesCodeowners([file(PATH, 'modified')], PATH)).toBe(false);
  });

  it('is false when a different file is removed', () => {
    expect(deletesCodeowners([file('src/app.ts', 'removed')], PATH)).toBe(false);
  });

  it('is false for an empty changeset', () => {
    expect(deletesCodeowners([], PATH)).toBe(false);
  });
});
