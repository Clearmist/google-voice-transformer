import fs from 'fs';
import path from 'path';
import { Command, Option } from 'commander';

export const program = new Command();

program
  .name('google-voice-transformer')
  .description('CLI to convert Google Takeout (Voice) to a more readable format')
  .version('0.1.0');

program
  .description('Convert the Google Takeout format to a more readable format.')
  .option('--path <string>', '(optional) The path to your Takeout folder. The program will look for this folder in the same directory')
  .addOption(new Option('--template <type>', '(optional) The output file template').choices(['default', 'whatsapp']));

export const options = {};

program.parse();

const userInput = program.opts();

// Clean the template option.
userInput.template = userInput.template ?? 'default';
options.template = userInput.template.toLowerCase();

// Verify that the path to the data directory exists.
options.path = path.normalize(userInput.path ?? path.join(process.cwd(), 'Takeout')).replaceAll('\\', '/');

if (fs.existsSync(options.path) === false) {
  program.error('The path to the Takeout folder does not exist. Either run this program from the same place where you are storing your Takeout directory or use the --path <fullpath> option to point the program to the location of your Takeout directory.');
}

options.callsPath = path.join(options.path, 'Voice', 'Calls').replaceAll('\\', '/');

// Verify that the Calls sub-directory exists in the Takeout folder.
if (fs.existsSync(options.callsPath) === false) {
  program.error('Your Takeout folder does not contain the ./Takeout/Voice/Calls subdirectory.');
}

export const globOptions = {
  dot: false,
  onlyFiles: true,
};
