import * as core from '@actions/core';

export type ProcessedImage = {
  name: string
  context: string
  dockerfile: string
  platform: string
  build_args: string
  secret_files: string
  argus_root: string
  files_matched: boolean
  branch_matched: boolean
  should_build: boolean
};

export function getCommaDelimitedArrayInput(name: string, opts: core.InputOptions): string[] {
  return core.getInput(name, opts).split(',').map((s: string) => s.trim()).filter((s: string) => s.length > 0);
}
