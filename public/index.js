// Special thanks to @jayantjain100 for amazing work on this!
// Make sure to checkout his repo
// https://github.com/jayantjain100/video-synchronisation
// Also the explaining article:
// https://levelup.gitconnected.com/tired-of-making-to-do-list-applications-acce875fe617?source=friends_link&sk=0b093661d00424f08e20ae5294c3f84b

const videoPlayer = document.querySelector("#player");

let isHost = false;
let isPlaying = false;
let isPaused = true;

const num_time_sync_cycles = 10;
const PLAYING_THRESH = 1;
const PAUSED_THRESH = 0.01;

let over_estimates = [];
let under_estimates = [];
let over_estimate = 0;
let under_estimate = 0;
let correction = 0;

const socket = io();

socket.on("host", (host) => {
  isHost = host;

  if (host) {
    console.log("im the host");
  }

  init();
});

const handleHostTimeUpdate = () => {
  socket.emit("timeupdate", {
    videoTime: videoPlayer.currentTime,
    hostTime: get_global_time(correction),
  });
};

const handleHostPlay = () => {
  socket.emit("play");
};

const handleHostPause = () => {
  socket.emit("pause");
};

const handleViewerTimeUpdate = ({ videoTime, hostTime }) => {
  let proposed_time = isPlaying
    ? videoTime - hostTime + get_global_time(correction)
    : videoTime;

  let gap = Math.abs(proposed_time - videoPlayer.currentTime);

  console.log(
    `%cGap was ${proposed_time - videoPlayer.currentTime}`,
    "font-size:12px; color:purple"
  );

  if (isPlaying) {
    if (gap > PLAYING_THRESH) {
      // tolerance while the video is playing
      videoPlayer.currentTime = proposed_time;
    }
    videoPlayer.play();
  } else {
    videoPlayer.pause();
    if (gap > PAUSED_THRESH) {
      // condition to prevent an unnecessary seek
      videoPlayer.currentTime = proposed_time;
    }
  }
};

const handleViewerPlay = () => {
  isPlaying = true;
  isPaused = false;

  videoPlayer.play();
};

const handleViewerPause = () => {
  isPaused = true;
  isPlaying = true;

  videoPlayer.pause();
};

function init() {
  if (isHost) {
    videoPlayer.addEventListener("timeupdate", handleHostTimeUpdate);
    videoPlayer.addEventListener("play", handleHostPlay);
    videoPlayer.addEventListener("pause", handleHostPause);
  } else {
    socket.on("timeupdate", handleViewerTimeUpdate);
    socket.on("play", handleViewerPlay);
    socket.on("pause", handleViewerPause);

    timeSync();
  }
}

function median(values) {
  const cloned = [...values];

  if (cloned.length === 0) {
    return 0;
  }
  cloned.sort((x, y) => x - y);
  let half = Math.floor(cloned.length / 2);
  if (cloned.length % 2) {
    return cloned[half];
  }
  return (cloned[half - 1] + cloned[half]) / 2.0;
}

function get_global_time(delta = 0) {
  let d = new Date();
  let t = d.getTime() / 1000;
  // delta is the correction parameter
  return t + delta;
}

function timeout(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function timeSync() {
  for (let i = 0; i < num_time_sync_cycles; i++) {
    await timeout(1000);
    socket.emit("request-time_sync_backward");
    await timeout(1000);
    socket.emit("request-time_sync_forward", get_global_time(0));
  }
}

socket.on("response-time_sync_backward", (time_at_server) => {
  under_estimate_latest = time_at_server - get_global_time(0);
  under_estimates.push(under_estimate_latest);
  under_estimate = median(under_estimates);
  correction = (under_estimate + over_estimate) / 2;
  console.log(
    `%c Updated val for under_estimate is ${under_estimate}`,
    "color:green"
  );
  console.log(
    `%c New correction time is ${correction} seconds`,
    "color:red; font-size:12px"
  );
});

socket.on("response-time_sync_forward", (calculated_diff) => {
  over_estimate_latest = calculated_diff;
  over_estimates.push(over_estimate_latest);
  over_estimate = median(over_estimates);
  correction = (under_estimate + over_estimate) / 2;
  console.log(
    `%c Updated val for over_estimate is ${over_estimate}`,
    "color:green"
  );
  console.log(
    `%c New correction time is ${correction} seconds`,
    "color:red; font-size:12px"
  );
});
