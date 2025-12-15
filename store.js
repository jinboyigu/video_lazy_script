// 配置文件, 请根据需要更改

// 真实集数
const _EPISODE = 2702;
// 跟m3u地址的集数差
const _EPISODE_DIFFERENCE = 1543;
// 开始集数
const START_EPISODE = _EPISODE - _EPISODE_DIFFERENCE;
// 递增集数
const INCREASE_EPISODES = 49;
// 结束集数
let END_EPISODE = START_EPISODE + INCREASE_EPISODES;
// 存放网络问题还未下载好的或者指定集数
const NOT_COMPLETED_EPISODE = [];
// 剧集名称
const EPISODE_NAME = '爱回家之开心速递';
// 网页地址(存放 m3u)
const HTML_URL = 'https://yizhuowuye.cn/vod/play/203696-3-$episode.html';
// https://yizhuowuye.cn/vod/play/203696-3-1153.html
// 视频下载路径
const VIDEO_DOWNLOAD_PATH = `/resources/video/${EPISODE_NAME}/`;
// 格式化视频名称
const getFileName = episode => episode + _EPISODE_DIFFERENCE;
// 是否自动下载文件
const AUTO_DOWNLOAD = 1;
// 导出 m3u 文件
const EXPORT_M3U_FILE = !AUTO_DOWNLOAD;
// 自动继续导出
const AUTO_EXPORT_M3U_NEXT = true;
// m3u 文件存放路径
const M3U_FILE_PATH = `m3u/${EPISODE_NAME}`;
// 同时下载最大文件数
const SIMULTANEOUS_DOWNLOAD_MAX = 20;

const M3U8_FILE_PATH = `m3u8/${EPISODE_NAME}`;
const M3U8_REMOVE_TAG = '#EXT-X-DISCONTINUITY';

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
  SIMULTANEOUS_DOWNLOAD_MAX,
  M3U8_FILE_PATH,
  M3U8_REMOVE_TAG,
  getFileName,
};
