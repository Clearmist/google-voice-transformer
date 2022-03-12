import path from 'path';
import { options } from './options.js';
import components from './components.js';

const months = {
  abbreviated: {
    0: 'Jan',
    1: 'Feb',
    2: 'Mar',
    3: 'Apr',
    4: 'May',
    5: 'Jun',
    6: 'Jul',
    7: 'Aug',
    8: 'Sep',
    9: 'Oct',
    10: 'Nov',
    11: 'Dec',
  },
  full: {
    0: 'January',
    1: 'February',
    2: 'March',
    3: 'April',
    4: 'May',
    5: 'June',
    6: 'July',
    7: 'August',
    8: 'September',
    9: 'October',
    10: 'November',
    11: 'December',
  },
};

export function formatTime(timestamp) {
  const date = new Date(timestamp);
  const hours24 = date.getHours();
  const hours12 = hours24 > 12 ? hours24 - 12 : hours24;
  const meridian = hours24 > 11 ? 'PM' : 'AM';

  let timeString = date.toLocaleTimeString();

  if (options.template === 'whatsapp') {
    timeString = `${hours12}:${date.getMinutes()} ${meridian}`;
  } else {
    const left = `${months.abbreviated[date.getMonth()]} ${date.getDate()}`;
    const right = `${hours12}:${date.getMinutes()} ${meridian}`;

    timeString = `<span title="${left} ${date.getFullYear()}, ${right}">
        ${left}, ${right}
      </span>`;
  }

  return timeString;
}

export function formatSeparator(previousTimestamp, timestamp) {
  let separator = false;

  const previousDate = new Date(previousTimestamp);
  const date = new Date(timestamp);

  if (previousTimestamp === '' || previousDate.toDateString() !== date.toDateString()) {
    separator = `${months.full[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
  }

  return separator;
}

function formatMetadata(message) {
  let metadata = '';

  if (message.type !== 'separator') {
    if (options.template === 'whatsapp') {
      metadata = components.whatsapp.metadata.replace('{{time}}', message.metadata.time);
    } else {
      metadata = `</div><div class="status ${message.direction}">${message.metadata.time}`;
    }
  }

  return metadata;
}

export function formatMessage(message) {
  let metadata = formatMetadata(message);
  let html = message.messageText;
  let divClass = 'message';

  if (message.type === 'audio') {
    html = `<div class="media audio">
        <audio controls src="${message.messageText.relativePath}">
      </div>`;
  } else if (message.type === 'image') {
    html = `<div class="media image">
        <a target="_blank" href="${message.messageText.relativePath}">
          <img src="${message.messageText.relativePath}" />
        </a>
      </div>`;
    metadata = '';
  } else if (message.type === 'vcard') {
    html = `<a href="${message.messageText.relativePath}">Contact card</a>`;
  } else if (message.type === 'video') {
    // All video is either already mp4 or has been converted to mp4.
    const relativePath = message.messageText.relativePath.replace(path.extname(message.messageText.relativePath), '.mp4');

    html = `<div class="media video">
        <video controls>
          <source src="${relativePath}" type="video/mp4">
          Sorry, your browser doesn't support embedded videos.
        </video>
      </div>`;
  } else if (message.type === 'separator') {
    divClass = '';
  }

  return `\n<div class="${divClass} ${message.direction}">
      ${html}${metadata}
    </div>`;
}
