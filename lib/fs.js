const fs = require('fs');
const write = (str, fileName) => fs.writeFileSync(require('path').resolve(__dirname, fileName), str);

const mkdirR = dirPath => !fs.existsSync(dirPath) && fs.mkdirSync(dirPath, {recursive: true});

module.exports = {
  write,
  mkdirR,
}
