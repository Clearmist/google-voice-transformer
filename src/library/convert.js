import fs from 'fs';
import path from 'path';
import hbjs from 'handbrake-js';

export default function convert(details) {
  return new Promise((resolve, reject) => {
    const extension = path.extname(details.fullPath);
    const relativePath = `${details.relativePath.replace(extension, '')}.mp4`;
    const output = path.join(process.cwd(), 'output', relativePath);

    const options = {
      input: details.fullPath,
      output,
    };

    if (fs.existsSync(output)) {
      console.log(`Skipping existing video file: ${details.filename}`);

      resolve();
    } else {
      console.log(`Converting video file: ${details.filename}`);

      hbjs.exec(options, (err, stdout, stderr) => {
        if (err) {
          console.error(stderr);
        }

        resolve();
      });
    }
  });
}
