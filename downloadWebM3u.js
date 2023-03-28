/**
 * @description 根据网页获取 m3u链接后再通过 ffmpeg 进行下载
 */

const http = require('https');
const fs = require('fs');
const path = require('path');
const ProgressBar = require('./lib/progressBar');
const pb = new ProgressBar(void 0, 50);

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
} = require('./store');

const getHtmlURL = episode => HTML_URL.replace('$episode', episode);
const getFullPath = episode => path.resolve(VIDEO_DOWNLOAD_PATH, `${episode}.mp4`);

const M3U_HEADER = '#EXTM3U';
let m3uList = [];
const indexM3uList = [];
const ffmpeg = require('fluent-ffmpeg');
const FFMPGEOptionCache = [];

let NEED_STOP_LOOP = false;

const getVideoURL = content => {
  let matched = content.match(/"url":"(https:.*\/index\.m3u8)","url_next/);
  if (!matched) return '';
  return matched[1].replace(/\\/g, '');
};

async function requestUrlContent(url) {
  let rawData = '';
  return new Promise(resolve => {
    http.get(url, {}, res => {
      res.on('data', (chunk) => { rawData += chunk; });
      res.on('end', () => {
        resolve(rawData);
      });
    });
  });
}

async function downloadWebM3u(index) {
  return requestUrlContent(getHtmlURL(index)).then(async html => {
    const url = getVideoURL(html);
    if (!url) {
      NEED_STOP_LOOP = true;
      return;
    }
    const fullPath = getFullPath(index);
    const option = {url, fullPath};
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

/**
 * @example {url: 'xxx', fullPath: '/xxx/xxx/xxx.mp4', status: 0(未开始)|1(进行中)|2(已完成)}
 * @param option {Object}
 */
function handleStartFFMPGE(option) {
  option.status = option.status || 0;
  const {url, fullPath} = option;
  if (option.status > 0) {
    console.log(`${fullPath} 已在下载中!`);
    return;
  }
  ++option.status;
  const description = `已下载 ${fullPath}`;
  // TODO 增加总进度
  ffmpeg(url).on('progress', progress => {
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
  }).outputOptions('-y').outputOptions('-c copy').save(fullPath);
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
AUTO_DOWNLOAD && fs.mkdirSync(VIDEO_DOWNLOAD_PATH);
EXPORT_M3U_FILE && fs.mkdirSync(M3U_FILE_PATH);

main().then();
