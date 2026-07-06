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

/**
 * Map changed files to the module names they belong to. A module is one
 * directory below a trigger path (e.g. terraform/modules/vpc/main.tf yields
 * "vpc" when the trigger path is "terraform/modules").
 */
export function extractChangedModules(files: string[], triggerPaths: string[]): string[] {
  const modules = new Set<string>();
  for (const f of files) {
    for (const tp of triggerPaths) {
      if (f.startsWith(`${tp}/`)) {
        const moduleName = f.slice(tp.length + 1).split('/')[0];
        if (moduleName) {
          modules.add(moduleName);
        }
      }
    }
  }
  return [...modules];
}

const SOURCE_RE = /source\s*=\s*"([^"]+)"/g;

/**
 * Return true if any .tf file in a stack's component directories contains a
 * module source ending in `/modules/<name>` for one of the given module names.
 */
export function stackDependsOnModules(
  stackDir: string,
  moduleNames: string[],
  listDir: (dir: string) => string[] | null,
  readFile: (path: string) => string | null,
): boolean {
  const suffixes = moduleNames.map((n) => `/modules/${n}`);
  const topEntries = listDir(stackDir);
  if (!topEntries) {
    return false;
  }

  const dirsToScan = [stackDir, ...topEntries.map((e) => `${stackDir}/${e}`)];
  for (const dir of dirsToScan) {
    const entries = listDir(dir);
    if (!entries) {
      continue;
    }
    for (const entry of entries) {
      if (!entry.endsWith('.tf')) {
        continue;
      }
      const content = readFile(`${dir}/${entry}`);
      if (!content) {
        continue;
      }
      for (const m of content.matchAll(SOURCE_RE)) {
        const source = m[1];
        if (suffixes.some((s) => source.endsWith(s))) {
          return true;
        }
      }
    }
  }
  return false;
}

/**
 * From the full set of stacks, return only those whose .tf files reference at
 * least one of the given module names.
 */
export function findDependentStacks(
  allStacks: string[],
  moduleNames: string[],
  listDir: (dir: string) => string[] | null,
  readFile: (path: string) => string | null,
): string[] {
  return allStacks.filter((stack) => stackDependsOnModules(stack, moduleNames, listDir, readFile));
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
