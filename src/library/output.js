import fs from 'fs';
import path from 'path';
import { writeFile } from 'fs/promises';
import convert from './convert.js';
import { formatMessage } from './format.js';
import { options } from './options.js';

import templateDefault from '../templates/default.html';
import templateWhatsapp from '../templates/whatsapp.html';
import stylesDefault from '../templates/default.css';
import stylesWhatsapp from '../templates/whatsapp.css';

const templates = {
  default: templateDefault,
  whatsapp: templateWhatsapp,
};

const styles = {
  default: stylesDefault,
  whatsapp: stylesWhatsapp,
};

export function createFolder(name) {
  const outputPath = path.join(process.cwd(), name);

  if (fs.existsSync(outputPath) === false) {
    fs.mkdirSync(outputPath, { recursive: true });
  }

  return outputPath;
}

export function outputName(batch) {
  let contact = 'Unknown';

  if (batch.contact.name !== '' && batch.contact.tel !== '' && batch.contact.name !== batch.contact.tel) {
    contact = `${batch.contact.name} (${batch.contact.tel})`;
  } else if (batch.contact.name === '' && batch.contact.tel !== '') {
    contact = batch.contact.tel;
  } else if (batch.contact.name !== '' && batch.contact.tel === '') {
    contact = batch.contact.name;
  } else if (batch.contact.tel !== '') {
    contact = batch.contact.tel;
  }

  return contact;
}

export async function compile(batch) {
  const output = [];
  const promises = [];
  const mediaFolder = `output/media/${outputName(batch)}`;

  createFolder(mediaFolder);

  batch.messages.forEach((message) => {
    if (['audio', 'image', 'vcard', 'video'].includes(message.type)) {
      if (message.type === 'video' && path.extname(message.messageText.relativePath) !== '.mp4') {
        promises.push(convert(message.messageText));
      } else if (message.messageText.fullPath !== '') {
        const sourceExists = fs.existsSync(message.messageText.fullPath);
        const targetExists = fs.existsSync(mediaFolder);

        // This is not a video media file.
        if (!sourceExists) {
          console.warn('[WARN] The source media file is not accessible.');
          console.log(`\t${message.messageText.fullPath}`);
        } else if (!targetExists) {
          console.warn('[WARN] The target media folder is not accessible.');
          console.log(`\t${mediaFolder}`);
        } else {
          fs.copyFileSync(message.messageText.fullPath, path.join(mediaFolder, message.messageText.filename));
        }
      }
    }

    output.push(formatMessage(message));
  });

  if (promises.length > 0) {
    await Promise.all(promises);
  }

  const html = templates[options.template]
    .replace('{{messages}}', output.join(''))
    .replace('{{styles}}', styles[options.template])
    .replace('{{contact.name}}', batch.contact.name)
    .replace('{{contact.tel}}', batch.contact.tel);

  const filename = `${outputName(batch)}.html`;

  writeFile(`output/${filename}`, html).then(() => {
    console.log(`Compiled ${filename}`);
  });
}
