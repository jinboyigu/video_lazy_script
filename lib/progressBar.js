// 这里用到一个很实用的 npm 模块，用以在同一行打印文本
const slog = require('single-line-log').stdout;

// 封装的 ProgressBar 工具
function ProgressBar(description, bar_length) {
  // 两个基本参数(属性)
  this.description = description || 'Progress';       // 命令行开头的文字信息
  this.length = bar_length || 25;                     // 进度条的长度(单位：字符)，默认设为 25
  const allOptions = [];

  // 刷新进度条图案、文字的方法
  this.render = function (opts) {
    const getText = options => {
      const {completed, total, description = this.description, ignore} = options;
      if (ignore) return '';
      let percent = (completed / total).toFixed(4);    // 计算进度(子任务的 完成数 除以 总数)
      let cellNum = Math.floor(percent * this.length);             // 计算需要多少个 █ 符号来拼凑图案

      // 拼接黑色条
      let cell = '';
      for (let i = 0; i < cellNum; i++) {
        cell += '█';
      }

      // 拼接灰色条
      let empty = '';
      for (let i = 0; i < this.length - cellNum; i++) {
        empty += '░';
      }

      // 拼接最终文本
      return description + ': ' + (100 * percent).toFixed(2) + '% ' + cell + empty + ' ' + completed + '/' + total;
    }

    // 在单行输出文本
    slog([].concat(opts).map(getText).filter(str => str).join('\n'));
  };

  this.update = function (opts) {
    const target = allOptions.find(o => o.description === opts.description);
    if (target) {
      Object.assign(target, opts);
    } else {
      allOptions.push(opts);
    }
    this.render(allOptions);
  }
}

// 模块导出
module.exports = ProgressBar;
