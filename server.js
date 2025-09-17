const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
app.use(express.json());
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*" }
});

const rooms = {};
let logs = []; // simpan log

function addLog(msg) {
  const logMsg = `[${new Date().toLocaleString()}] ${msg}`;
  console.log(logMsg);          // tampil di console server
  logs.push(logMsg);            // simpan di array

  if (logs.length > 10) {
    logs = logs.slice(-10);
  }

  io.emit("newLog", logMsg);    // kirim ke semua client yang terhubung
}

io.on("connection", (socket) => {
  addLog(`User connected: ${socket.id}`);

  // kirim log lama ke client baru
  socket.emit("initLogs", logs);

  socket.on("createRoom", ({ token }) => {
    if (!rooms[token]) {
      rooms[token] = { teacher: socket.id, halaman: 1, siswa: [] };
      socket.join(token);
      addLog(`Room ${token} dibuat guru dengan Halaman ${rooms[token].halaman}`);
    } else {
      addLog(`Room ${token} sudah ada, tidak dibuat ulang dengan Halaman  ${rooms[token].halaman}`);
    }
  });

  socket.on("joinRoom", ({ token }) => {
    if (rooms[token]) {
      socket.join(token);
      socket.emit("joinSuccess", { msg: "Berhasil masuk" });
      rooms[token].siswa.push(socket.id);
      addLog(`Siswa masuk room ${token} jml ${rooms[token].siswa.length}`);
    } else {
      socket.emit("errorMessage", { msg: "Room tidak ditemukan atau belum dibuat guru." });
      // socket.emit("joinError", { msg: "Token salah / room tidak ada" });
      addLog(`Siswa gagal join, room ${token} tidak ditemukan`);
    }
  });

  socket.on("changePage", ({ token, page }) => {
    socket.to(token).emit("updatePage", page);
    rooms[token].halaman = page;
    io.to(token).emit("pageUpdate", { page });
    addLog(`Guru di room ${token} ganti halaman ke ${page}`);
  });

  // Guru minta data halaman (saat refresh / masuk kembali)
  socket.on("getPage", (token, callback) => {
    addLog(`Cari Halaman dalam ${token} yaitu ${rooms[token].halaman}`);
    if (rooms[token]) {
      callback({ page: rooms[token].halaman });
    } else {
      callback({ error: "Room tidak ditemukan" });
    }
  });

  socket.on("disconnect", () => {
    for (const token in rooms) {
      const room = rooms[token];

      // cek apakah siswa ada di list
      const index = room.siswa.indexOf(socket.id);
      if (index !== -1) {
        room.siswa.splice(index, 1); // hapus dari list
      }
      addLog(`Siswa keluar dari room ${token}, total sekarang: ${room.siswa.length}`);

    }
  });

});

app.post("/reset", (req, res) => {
  const token = req.body.token;
  if (rooms[token]) {
    rooms[token].halaman = 1;
    // rooms[token].siswa = [];
  }
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
