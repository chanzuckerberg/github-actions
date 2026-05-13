import * as core from '@actions/core';
// eslint-disable-next-line import/no-relative-packages
import { getBuildTag, getTriggerSha } from '../../common';

async function run() {
  const tag = getBuildTag();
  const sha = getTriggerSha();
  core.setOutput('image_tag', tag);
  core.setOutput('trigger_sha', sha);
}

if (process.env.NODE_ENV !== 'test') {
  run();
}
