// Pure helpers for resolving Terragrunt stacks from base paths and changed files.
// A "stack" is one directory below a configured base path. For the fogg layout,
// env stacks aggregate their component subdirs and account stacks sit directly
// under the base, but this logic makes no fogg-specific assumptions.

export function parseBases(stackPaths: string): string[] {
  return stackPaths
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
}

export function stackForFile(file: string, bases: string[]): string | null {
  const base = bases.find((b) => file === b || file.startsWith(`${b}/`));
  if (!base) {
    return null;
  }
  const depth = base.split('/').length + 1;
  return file.split('/').slice(0, depth).join('/');
}

export function stacksFromChangedFiles(files: string[], bases: string[]): string[] {
  const stacks = files
    .map((f) => stackForFile(f, bases))
    .filter((s): s is string => s !== null);
  return [...new Set(stacks)];
}

export function hasSharedChanges(files: string[], triggerPaths: string[]): boolean {
  if (triggerPaths.length === 0) {
    return false;
  }
  return files.some((f) =>
    triggerPaths.some((tp) => f === tp || f.startsWith(`${tp}/`)),
  );
}

export function enumerateStacks(
  bases: string[],
  listDir: (base: string) => string[] | null,
): string[] {
  const stacks = bases.flatMap((base) => {
    const entries = listDir(base);
    return entries ? entries.map((name) => `${base}/${name}`) : [];
  });
  return [...new Set(stacks)];
}
