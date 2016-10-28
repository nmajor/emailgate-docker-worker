import fs from 'fs';

export function saveFile(path, data) {
  return new Promise((resolve, reject) => {
    fs.writeFile(path, data, (err) => {
      if (err) { return reject(err); }
      return resolve();
    });
  });
}

export function deleteFile(filePath) {
  return new Promise((resolve) => {
    fs.unlink(filePath, () => {
      resolve();
    });
  });
}

export function deleteFiles(filePaths) {
  return Promise.all(filePaths.map((filePath) => { return deleteFile(filePath); }));
}
