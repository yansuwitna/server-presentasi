const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*" }
});

const rooms = {}; 
let logs = []; // simpan log

// function addLog(msg) {
//   const logMsg = `[${new Date().toLocaleString()}] ${msg}`;
//   console.log(logMsg);          // tampil di console server
//   logs.push(logMsg);            // simpan di array
//   io.emit("newLog", logMsg);    // kirim ke semua client yang terhubung
// }

io.on("connection", (socket) => {
  addLog(`User connected: ${socket.id}`);

  // kirim log lama ke client baru
  socket.emit("initLogs", logs);

  socket.on("createRoom", ({ token }) => {
    if (!rooms[token]) {
      rooms[token] = { teacher: socket.id };
      socket.join(token);
      addLog(`Room ${token} dibuat guru`);
    } else {
      addLog(`Room ${token} sudah ada, tidak dibuat ulang`);
    }
  });

  socket.on("joinRoom", ({ token }) => {
    if (rooms[token]) {
      socket.join(token);
      socket.emit("joinSuccess", { msg: "Berhasil masuk" });
      addLog(`Siswa masuk room ${token}`);
    } else {
      socket.emit("joinError", { msg: "Token salah / room tidak ada" });
      addLog(`Siswa gagal join, room ${token} tidak ditemukan`);
    }
  });

  socket.on("changePage", ({ token, page }) => {
    socket.to(token).emit("updatePage", page);
    addLog(`Guru di room ${token} ganti halaman ke ${page}`);
  });

  // socket.on("disconnect", () => {
  //   addLog(`User disconnected: ${socket.id}`);
  //   for (const token in rooms) {
  //     if (rooms[token].teacher === socket.id) {
  //       delete rooms[token];
  //       io.to(token).emit("roomClosed", { msg: "Guru keluar, room ditutup" });
  //       addLog(`Room ${token} dihapus karena guru keluar`);
  //     }
  //   }
  // });
});

// halaman monitoring realtime
app.get("/", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Node.js App</title>
      <style>
        body { font-family: monospace; background: #111; color: #0f0; padding: 20px; }
        h1 { color: #fff; }
        #logs { white-space: pre-line; }
      </style>
    </head>
    <body>
      <h1>Node.js App is running! V1.00</h1>
      <hr>
      <div id="logs"></div>

      <script src="/socket.io/socket.io.js"></script>
      <script>
        const socket = io();
        const logsDiv = document.getElementById("logs");

        socket.on("initLogs", (data) => {
          data.forEach(log => appendLog(log));
        });

        socket.on("newLog", (log) => {
          appendLog(log);
        });

        function appendLog(log) {
          const div = document.createElement("div");
          div.textContent = log;
          logsDiv.appendChild(div);
          window.scrollTo(0, document.body.scrollHeight);
        }
      </script>
    </body>
    </html>
  `);
});

const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log("Server running on port", port);
});
