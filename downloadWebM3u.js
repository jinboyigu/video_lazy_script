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
  DOWNLOAD_MAX_COUNT,
} = require('./store');

const getHtmlURL = episode => HTML_URL.replace('$episode', episode);
const getFullPath = episode => path.resolve(VIDEO_DOWNLOAD_PATH, `${episode}.mp4`);

const M3U_HEADER = '#EXTM3U';
let m3uList = [];
const ffmpeg = require('fluent-ffmpeg');
const ffmpgeOptionCache = [];

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
    const name = getFullPath(index);
    const option = {url, name};
    if (EXPORT_M3U_FILE) {
      const realName = `${EPISODE_NAME}_${path.basename(name).replace(/\..*$/, '')}`;
      console.log(`${realName} m3u url: ${url}`);
      let duration = -1;
      // TODO 获取真正时长
      // await getUrlContent(url).then(content => {});
      m3uList.push(`#EXTINF:${duration},${EPISODE_NAME}_${realName}`);
      m3uList.push(option.url);
    }
    if (!AUTO_DOWNLOAD) return;
    ffmpgeOptionCache.push(option);
    if (ffmpgeOptionCache.length > DOWNLOAD_MAX_COUNT) return;
    handleFFmpge(option);
  });
}

function handleFFmpge(option) {
  const {url, name} = option;
  if (option.start || option.end) {
    console.log(`${path.basename(name)} 已下载成功!`);
    return;
  }
  option.start = true;
  ffmpeg(url).on('progress', progress => {
    let completed = +(progress.percent || 0).toFixed(2);
    let total = 100;
    if (completed > total) {
      completed = total;
    }
    pb.update({description: `已下载 ${name}`, completed, total});
  }).on('end', () => {
    option.end = true;
    const next = ffmpgeOptionCache.find(o => !o.start);
    next && handleFFmpge(next);
  }).outputOptions('-y').outputOptions('-c copy').save(name);
}

async function main() {
  let name = [EPISODE_NAME];
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
  if (!m3uList.length) return;
  const fileName = `${name}.m3u`;
  fs.writeFileSync(path.resolve(M3U_FILE_PATH || __dirname, fileName), `${M3U_HEADER}\n${m3uList.join('\n')}`);
  console.log(`${fileName} 文件更新成功`);
  if (AUTO_EXPORT_M3U_NEXT) {
    // 初始化参数
    START_EPISODE += INCREASE_EPISODES + 1;
    END_EPISODE = START_EPISODE + INCREASE_EPISODES;
    m3uList = [];
    return main();
  }
}

main().then();
