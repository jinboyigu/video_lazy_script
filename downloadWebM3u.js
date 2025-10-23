/**
 * @description 根据网页获取 m3u链接后再通过 ffmpeg 进行下载
 */

const http = require('https');
const fs = require('fs');
const {mkdirR, write, read, rewrite} = require('./lib/fs');
const path = require('path');
const ProgressBar = require('./lib/progressBar');
const pb = new ProgressBar(void 0, 50);
const DEBUG = false;

// 可配置项
let {
  START_EPISODE,
  INCREASE_EPISODES,
  END_EPISODE,
  NOT_COMPLETED_EPISODE,
  EPISODE_NAME,
  HTML_URL,
  VIDEO_DOWNLOAD_PATH,
  AUTO_DOWNLOAD,
  EXPORT_M3U_FILE,
  AUTO_EXPORT_M3U_NEXT,
  M3U_FILE_PATH,
  SIMULTANEOUS_DOWNLOAD_MAX,
  M3U8_FILE_PATH,
  M3U8_REMOVE_TAG,
  getFileName,
} = require('./store');

const getHtmlURL = episode => HTML_URL.replace('$episode', episode);
const getFullPath = episode => path.resolve(VIDEO_DOWNLOAD_PATH, `${getFileName(episode)}.mp4`);

const M3U_HEADER = '#EXTM3U';
let m3uList = [];
const indexM3uList = [];
const ffmpeg = require('fluent-ffmpeg');
const FFMPGEOptionCache = [];

let NEED_STOP_LOOP = false;

const getVideoURL = content => {
  let matched = content.match(/"url":"(https:.*\/index\.m3u8)","url_next/);
  matched = matched || content.match(/var now="(https:.*\/index\.m3u8)";var pn/);
  if (!matched) return '';
  let url;
  try {
    url = encodeURI(JSON.parse(`{"url":"${matched[1]}"}`).url);
  } catch (e) {
  }
  return url;
};

async function requestUrlContent(url) {
  let rawData = '';
  return new Promise(resolve => {
    http.get(url, {}, res => {
      res.on('data', (chunk) => {
        rawData += chunk;
      });
      res.on('end', () => {
        resolve(rawData);
      });
    });
  });
}

// 将网页中的 m3u8 链接格式化(比如去掉中间广告)
async function formatM3U8URL(url, name) {
  if (!M3U8_REMOVE_TAG || !M3U8_FILE_PATH) return;
  mkdirR(M3U8_FILE_PATH);
  const localFile = path.join(__dirname, `${M3U8_FILE_PATH}/${name}.m3u8`);
  let result;
  if (fs.existsSync(localFile)) {
    result = fs.readFileSync(localFile, 'utf-8');
  } else {
    const originResult = await getRealM3U8();
    const array = originResult.split(`${M3U8_REMOVE_TAG}\n`);
    array.splice(array.length - 2, 1);
    result = array.join('').split('\n').map(str => str.endsWith('\.ts') ? url.replace(getLastPath(url), str) : str).join('\n');
    write(result, localFile);
  }
  const duration = getDuration(result);
  return {localFile, duration};

  function getDuration(content) {
    return content.split('\n').filter(str => {
      return str.startsWith('#EXTINF:');
    }).map(str => {
      return +str.replace(/#EXTINF:(\d+\.?\d*),.*/, '$1');
    }).reduce((a, b) => a + b, 0);
  }

  async function getRealM3U8() {
    const result = await requestUrlContent(url);
    // example: https://vip.ffzy-online1.com/20250808/56252_2ec59b5d/index.m3u8
    // real:  https://vip.ffzy-online1.com/20250808/56252_2ec59b5d/2000k/hls/mixed.m3u8
    const realM3U8 = result.split('\n').find(str => str.match('.m3u8'));
    if (realM3U8) {
      url = url.replace(getLastPath(url), '') + realM3U8;
      return requestUrlContent(url);
    }
    return result;
  }
}

function getLastPath(str) {
  let paths = new URL(str).pathname.split('/');
  return paths[paths.length - 1] || '';
}

async function downloadWebM3u(index) {
  return requestUrlContent(getHtmlURL(index)).then(async html => {
    const url = getVideoURL(html);
    if (!url) {
      rewrite(path.resolve(__dirname, './store.js'), str => str.replace(/const _EPISODE = \d+;/, `const _EPISODE = ${getFileName(index)};`));
      NEED_STOP_LOOP = true;
      return;
    }
    DEBUG && console.log('[ | downloadWebM3u.js:92]', url);
    const fullPath = getFullPath(index);
    const option = {url, fullPath, ...await formatM3U8URL(url, getFileName(index))};
    if (EXPORT_M3U_FILE) {
      const realName = `${EPISODE_NAME}_${path.basename(fullPath).replace(/\..*$/, '')}`;
      console.log(`${realName} m3u url: ${url}`);
      let duration = -1;
      // TODO 获取真正时长
      // await getUrlContent(url).then(content => {});
      m3uList.push(`#EXTINF:${duration},${realName}`);
      m3uList.push(option.url);
    }
    if (!AUTO_DOWNLOAD) return;
    FFMPGEOptionCache.push(option);
    if (FFMPGEOptionCache.length > SIMULTANEOUS_DOWNLOAD_MAX) return;
    handleStartFFMPGE(option);
  });
}

function convertToSeconds(time) {
  const parts = time.split(':'); // 分割字符串
  const hours = parseFloat(parts[0]) || 0; // 小时
  const minutes = parseFloat(parts[1]) || 0; // 分钟
  const seconds = parseFloat(parts[2]) || 0; // 秒

  // 将时间转换为秒
  return hours * 3600 + minutes * 60 + seconds;
}

/**
 * @example {url: 'xxx', fullPath: '/xxx/xxx/xxx.mp4', status: 0(未开始)|1(进行中)|2(已完成)}
 * @param option {Object}
 */
function handleStartFFMPGE(option) {
  option.status = option.status || 0;
  const {url, fullPath, duration = 0, localFile} = option;
  if (option.status > 0) {
    console.log(`${fullPath} 已在下载中!`);
    return;
  }
  ++option.status;
  const description = `已下载 ${fullPath}`;
  // TODO 增加总进度
  ffmpeg(localFile || url).inputOptions('-protocol_whitelist', 'file,http,https,tcp,tls') // 添加输入选项
    .on('start', function (command) {
      DEBUG && console.log('FFmpeg process started:', command);
    }).on('progress', progress => {
    if (!('percent' in progress)) {
      progress.percent = convertToSeconds(progress.timemark) / duration * 100;
    }
    let completed = +(progress.percent || 0).toFixed(2);
    let total = 100;
    if (completed > total) {
      completed = total;
    }
    pb.update({description, completed, total});
  }).on('end', () => {
    ++option.status;
    const nextOption = FFMPGEOptionCache.find(o => !o.status);
    if (nextOption) {
      handleStartFFMPGE(nextOption);
      pb.update({description, ignore: true});
    }
  }).on('error', function (err) {
    DEBUG && console.error('Error occurred:', err.message);
    DEBUG && console.log('FFmpeg stderr:', err.stderr); // Print error output
  }).outputOptions('-c copy').save(fullPath);
}

async function main() {
  let name = [];
  if (NOT_COMPLETED_EPISODE.length) {
    name.push(...NOT_COMPLETED_EPISODE);
    await doNotCompleted();
  } else {
    let i = START_EPISODE;
    for (; i <= END_EPISODE; i++) {
      if (NEED_STOP_LOOP) {
        break;
      }
      await downloadWebM3u(i);
    }
    name.push(START_EPISODE, `${i - 1}`);
  }
  return exportMu3File(name.join('_'));
}

async function doNotCompleted() {
  for (const i of NOT_COMPLETED_EPISODE) {
    await downloadWebM3u(i);
  }
}

async function exportMu3File(name) {
  const _write = (name, content) => {
    fs.writeFileSync(path.resolve(M3U_FILE_PATH || __dirname, name), `${M3U_HEADER}\n${content}`);
  };
  if (!m3uList.length) {
    if (indexM3uList.length) {
      _write('index.m3u', indexM3uList.join('\n'));
    }
    return;
  }
  const fileName = `${name}.m3u`;
  _write(fileName, m3uList.join('\n'));
  console.log(`${fileName} 文件更新成功`);
  if (AUTO_EXPORT_M3U_NEXT) {
    indexM3uList.push(...m3uList);
    // 初始化参数
    START_EPISODE += INCREASE_EPISODES + 1;
    END_EPISODE = START_EPISODE + INCREASE_EPISODES;
    m3uList = [];
    return main();
  }
}

// 先创建文件夹
AUTO_DOWNLOAD && mkdirR(VIDEO_DOWNLOAD_PATH);
EXPORT_M3U_FILE && mkdirR(M3U_FILE_PATH);

main().then();
