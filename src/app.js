import fg from 'fast-glob';
import { globOptions, options } from './library/options.js';
import { createFolder } from './library/output.js';
import parseSourceFiles from './library/parse.js';

// Get a list of text messages.
const textSources = fg.sync([`${options.callsPath}/* - Text - *.{htm,html}`], globOptions);

if (Array.isArray(textSources)) {
  createFolder('output/media');

  parseSourceFiles(textSources);
}
