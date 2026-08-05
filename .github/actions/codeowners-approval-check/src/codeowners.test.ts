import { matchOwnedFiles, parseCodeowners } from './codeowners';

const CODEOWNERS = `
# comment line
/.github/ @org/github_owners
/.github/instructions @kpatel @jmaccarl
*.py @py-owner
/models/ @models-team
/models/special.py @special-owner
docs/ @docs-owner
`;

describe('matchOwnedFiles', () => {
  const entries = parseCodeowners(CODEOWNERS);

  it('applies last-match-wins for a more specific later rule', () => {
    const matched = matchOwnedFiles(['models/special.py'], entries);
    expect(matched).toHaveLength(1);
    expect(matched[0].owners).toEqual(['@special-owner']);
  });

  it('falls back to a directory rule when no more specific rule matches', () => {
    const matched = matchOwnedFiles(['models/regular.py'], entries);
    expect(matched[0].owners).toEqual(['@models-team']);
  });

  it('matches an anchored directory rule', () => {
    const matched = matchOwnedFiles(['.github/workflows/ci.yml'], entries);
    expect(matched[0].owners).toEqual(['@org/github_owners']);
  });

  it('omits files that match no rule', () => {
    const matched = matchOwnedFiles(['README.md'], entries);
    expect(matched).toHaveLength(0);
  });

  it('returns owners for every owned changed file', () => {
    const matched = matchOwnedFiles(
      ['src/app.py', 'README.md', 'docs/guide.md'],
      entries,
    );
    expect(matched.map((m) => m.path)).toEqual(['src/app.py', 'docs/guide.md']);
    expect(matched[0].owners).toEqual(['@py-owner']);
    expect(matched[1].owners).toEqual(['@docs-owner']);
  });
});
