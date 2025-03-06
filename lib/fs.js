const fs = require('fs');
let path = require('path');
const write = (str, fileName) => fs.writeFileSync(path.resolve(path.resolve(__dirname, '../'), fileName), str);

const mkdirR = dirPath => !fs.existsSync(dirPath) && fs.mkdirSync(dirPath, {recursive: true});

module.exports = {
  write,
  mkdirR,
}
