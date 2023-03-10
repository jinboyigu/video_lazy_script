// 配置文件, 请根据需要更改

// 开始集数
const START_EPISODE = 1;
// 递增集数
const INCREASE_EPISODES = 49;
// 结束集数
let END_EPISODE = START_EPISODE + INCREASE_EPISODES;
// 存放网络问题还未下载好的或者指定集数
const NOT_COMPLETED_EPISODE = [];
// 剧集名称
const EPISODE_NAME = 'name';
// 网页地址(存放 m3u)
const HTML_URL = 'https://xxx/$episode.html';
// 视频下载路径
const VIDEO_DOWNLOAD_PATH = `/xxx/${EPISODE_NAME}/`;

// 是否自动下载文件
const AUTO_DOWNLOAD = 1;
// 导出 m3u 文件
const EXPORT_M3U_FILE = !AUTO_DOWNLOAD;
// 自动继续导出
const AUTO_EXPORT_M3U_NEXT = true;
// m3u 文件存放路径
const M3U_FILE_PATH = '/xxx';
const DOWNLOAD_MAX_COUNT = 10;

module.exports = {
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
};
