const write = (str, fileName) => require('fs').writeFileSync(require('path').resolve(__dirname, fileName), str);
