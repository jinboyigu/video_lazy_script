const fs = require('fs');
let path = require('path');
const write = (str, fileName) => fs.writeFileSync(path.resolve(path.resolve(__dirname, '../'), fileName), str);
const read = (fileName, options) => fs.readFileSync(path.resolve(path.resolve(__dirname, '../'), fileName), options).toString();
const rewrite = (fileName, callback, options) => write(callback(read(fileName, options)), fileName);

const mkdirR = dirPath => !fs.existsSync(dirPath) && fs.mkdirSync(dirPath, {recursive: true});

module.exports = {
  read,
  write,
  mkdirR,
  rewrite,
}
