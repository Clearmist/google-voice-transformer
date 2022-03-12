import fs, { existsSync } from 'fs';
import path from 'path';
import fg from 'fast-glob';
import { parse } from 'node-html-parser';
import { formatSeparator, formatTime } from './format.js';
import { globOptions, options } from './options.js';
import { compile, outputName } from './output.js';

const audioExtensions = ['amr', 'mp3'];
const imageExtensions = ['gif', 'jpg', 'jpeg', 'png', 'webp'];
const videoExtensions = ['3gp', 'mp4', 'mpg'];
const attachmentExtensions = [
  ...audioExtensions,
  ...imageExtensions,
  ...videoExtensions,
  // Virtual contact file
  'vcf',
];

// Get a list of all attachment files.
const attachmentSources = [];

fg.sync([`${options.callsPath}/* - Text - *.{${attachmentExtensions.join(',')}}`], { ...globOptions, objectMode: true }).forEach((attachment) => {
  attachmentSources.push(attachment.name);
});

const batch = {
  contact: {
    name: '',
    tel: '',
    me: '',
  },
  messages: [],
};

function extractContact(telephoneLinks, filepath) {
  const details = {
    name: '',
    tel: '',
  };

  telephoneLinks.forEach((link) => {
    const child = link.querySelector('span.fn');

    if (child !== null) {
      // This is a message sent by the other person.
      // Extract the telephone number.
      details.tel = link.getAttribute('href').replace('tel:', '');
      details.name = child.text;
    }

    if (batch.contact.me === '' || typeof batch.contact.me === 'undefined') {
      const childMe = link.querySelector('abbr.fn');

      if (childMe !== null) {
        const telephone = link.getAttribute('href').trim();

        if (telephone !== 'tel:') {
          batch.contact.me = telephone;
        }
      }
    }
  });

  // Fallback on extracting either the name or telephone number from the filename.
  const basename = path.basename(filepath, path.extname(filepath));
  const filenameContact = basename.split(' - ')[0].trim();

  if (details.tel === '' && filenameContact.charAt(0) === '+') {
    details.tel = filenameContact;
  }

  if (details.name === '') {
    details.name = filenameContact;
  }

  return details;
}

function findMedia(type, basename) {
  const details = {
    filename: basename,
    fullPath: '',
    relativePath: '',
  };
  let extensions = attachmentExtensions;

  if (type === 'audio') {
    extensions = audioExtensions;
  } else if (type === 'image') {
    extensions = imageExtensions;
  } else if (type === 'vcard') {
    extensions = ['vcf'];
  } else if (type === 'video') {
    extensions = videoExtensions;
  }

  if (!existsSync(path.join('data', basename))) {
    // This media basename does not exist as a complete filename. Try looking for it with some extensions.
    extensions.some((extension) => {
      const filename = `${basename}.${extension}`;
      const fullPath = path.join(options.callsPath, filename);

      if (attachmentSources.includes(filename)) {
        details.filename = filename;
        details.fullPath = fullPath;
        details.relativePath = path.join('media', batch.contact.outputName, filename).replaceAll('\\', '/');

        return true;
      }

      // The filename on disk may be truncated.
      attachmentSources.some((attachment) => {
        if (path.extname(attachment).toLowerCase() === `.${extension}`) {
          const base = path.basename(attachment, path.extname(attachment));

          if (basename.includes(base)) {
            details.filename = `${base}.${extension}`;
            details.fullPath = path.join(options.callsPath, details.filename);
            details.relativePath = path.join('media', batch.contact.outputName, details.filename).replaceAll('\\', '/');

            return true;
          }
        }

        return false;
      });

      return false;
    });
  }

  if (details.fullPath === '') {
    console.warn('[WARN] A media file referenced in the text message is not present in your Takeout directory.');
    console.log(`\tType: ${type} Basename: ${basename}`);
  }

  return details;
}

let previousTimestamp = '';

function parseSourceFile(filepath) {
  // Read the source file.
  const data = fs.readFileSync(filepath, 'utf8');

  // Parse the file contents into a DOM tree.
  const root = parse(data);

  // Extract the wrapper that holds all of the messages.
  const hChatLog = root.querySelector('div.hChatLog');

  // Find all of the message containers within the wrapper.
  const messageContainers = hChatLog.querySelectorAll('div.message');

  // Extract the contact's name and telephone number.
  const { name, tel } = extractContact(hChatLog.querySelectorAll('a.tel'), filepath);

  if (batch.messages.length > 0 && batch.contact.name !== name && batch.contact.tel !== tel) {
    // This source file is from a different contact than the last contact we processed.
    // Compile the previously saved contact's messages.
    compile(batch);

    // Clear the previous contact's messages.
    batch.contact.name = '';
    batch.contact.tel = '';
    batch.messages = [];

    // Clear the timestamp.
    previousTimestamp = '';
  }

  if (batch.contact.name === '') {
    batch.contact.name = name;
  }

  if (batch.contact.tel === '') {
    batch.contact.tel = tel;
  }

  batch.contact.outputName = outputName(batch);

  // Process each text message within this source file.
  messageContainers.forEach((message) => {
    const senderTelephone = message.querySelector('a.tel').getAttribute('href');
    const audioElement = message.querySelector('a.audio');
    const imageElement = message.querySelector('img');
    const vcardElement = message.querySelector('a.vcard');
    const videoElement = message.querySelector('a.video');
    const messageElement = message.querySelector('q');
    let messageText = messageElement.removeWhitespace().rawText.replace(/\s+/g, ' ');
    let type = 'text';

    if (audioElement !== null) {
      type = 'audio';
      messageText = audioElement.getAttribute('href');
    }

    if (imageElement !== null) {
      type = 'image';
      messageText = imageElement.getAttribute('src');
    }

    if (vcardElement !== null) {
      type = 'vcard';
      messageText = vcardElement.getAttribute('href');
    }

    if (videoElement !== null) {
      type = 'video';
      messageText = videoElement.getAttribute('href');
    }

    if (type !== 'text') {
      // Verify that the media file exists and append its file extension.
      messageText = findMedia(type, messageText);
    }

    const timestamp = message.querySelector('abbr').getAttribute('title');
    const separator = formatSeparator(previousTimestamp, timestamp);

    if (separator) {
      batch.messages.push({
        type: 'separator',
        messageText: separator,
        direction: 'center',
      });
    }

    previousTimestamp = timestamp;

    const details = {
      type,
      messageText,
      metadata: {
        time: formatTime(timestamp),
        timestamp,
      },
      direction: senderTelephone === batch.contact.me ? 'sent' : 'received',
    };

    batch.messages.push(details);
  });
}

export default function parseSourceFiles(textSources) {
  textSources.forEach((filepath) => {
    parseSourceFile(filepath);
  });

  if (batch.messages.length > 0) {
    compile(batch);
  }
}
