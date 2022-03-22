const express = require("express");
const app = express();
const http = require("http");
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

let hostUserId = "";

app.use(express.static("public"));

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/public/index.html");
});

io.on("connection", (socket) => {
  console.log("a user connected");

  if (!hostUserId) {
    hostUserId = socket.id;
  }

  socket.emit("host", hostUserId === socket.id);

  socket.on("timeupdate", (currentTime) => {
    socket.broadcast.emit("timeupdate", currentTime);
  });

  socket.on("play", () => {
    socket.broadcast.emit("play");
  });

  socket.on("pause", () => {
    socket.broadcast.emit("pause");
  });

  socket.on("request-time_sync_backward", () => {
    let d = new Date();
    let t = d.getTime() / 1000;

    socket.emit("response-time_sync_backward", t);
  });

  socket.on("request-time_sync_forward", (time_at_client) => {
    let d = new Date();
    let t = d.getTime() / 1000;

    socket.emit("response-time_sync_forward", t - time_at_client);
  });
});

server.listen(3000, () => {
  console.log("listening on *:3000");
});
