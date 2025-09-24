const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
app.use(express.json());
const server = http.createServer(app);

const io = new Server(server, { cors: { origin: "*" } });

const rooms = {}; // { token: { halaman, siswa: [] } }
let logs = [];    // menyimpan log server

// Fungsi menambahkan log
function addLog(msg) {
  const logMsg = `[${new Date().toLocaleString()}] ${msg}`;
  console.log(logMsg);  // tampil di console
  logs.push(logMsg);    // simpan di array
  if (logs.length > 20) logs = logs.slice(-20);

  // Kirim log hanya ke monitoring room
  io.to("monitoring").emit("newLog", logMsg);
}

// Socket.IO connection
io.on("connection", (socket) => {

  // Join monitoring page
  socket.on("joinMonitoring", () => {
    socket.join("monitoring");
    // Kirim semua log terakhir ke monitoring
    socket.emit("initLogs", logs);
  });

  // Guru membuat room
  socket.on("createRoom", ({ token }, callback) => {
    if (!rooms[token]) {
      rooms[token] = { halaman: 1, siswa: {} };
      socket.join(token);
      addLog(`Room ${token} dibuat, halaman: 1, Siswa : 0`);
    } else {
      if (!rooms[token].halaman) rooms[token].halaman = 1;
      socket.join(token);
      addLog(`Room ${token} sudah ada, halaman: ${rooms[token].halaman}, Siswa : ${Object.keys(rooms[token].siswa).length}`);
    }
    io.to(token).emit("peserta", { peserta: Object.values(rooms[token].siswa) });

    callback({ peserta: Object.values(rooms[token].siswa), halaman: rooms[token].halaman });
  });

  // Siswa join room
  socket.on("joinRoom", ({ token, nama }, callback) => {
    //Membuat Room Jika Belum Ada
    if (!rooms[token]) rooms[token] = { halaman: 1, siswa: {} };

    //Join Token 
    socket.join(token);

    //Menambah Id Siswa Ke Token 
    // rooms[token].siswa.push(socket.id, nama);
    rooms[token].siswa[socket.id] = { nama }

    //Mengirim Informasi Ke (Masih Tidak Di Terima Server)
    io.to(token).emit("peserta", { peserta: Object.values(rooms[token].siswa) });

    //Memberikan Informasi
    addLog(`Siswa ${nama} masuk Room ${token}, peserta: ${Object.values(rooms[token].siswa).length}, halaman: ${rooms[token].halaman}`);

    //Mengirim Halaman Ke Siswa
    callback({ halaman: rooms[token].halaman });
  });

  // Guru ganti halaman
  socket.on("changePage", ({ token, page }) => {
    if (!rooms[token]) rooms[token] = { halaman: 1, siswa: [] };

    rooms[token].halaman = page;

    // Kirim pageUpdate ke semua di room token (guru + siswa)
    addLog(`Guru Room ${token} pindah halaman: ${page}`);
    io.to(token).emit("pageUpdate", { halaman: page });

  });

  // Disconnect
  socket.on("disconnect", () => {

    for (const token in rooms) {
      if (rooms[token].siswa[socket.id]) {
        $siswa = rooms[token].siswa[socket.id].nama;
        delete rooms[token].siswa[socket.id];
        addLog(`Siswa ${$siswa} keluar Room ${token}, peserta: ${Object.values(rooms[token].siswa).length}`);

        // Update peserta untuk semua di room
        io.to(token).emit('peserta', { peserta: Object.values(rooms[token].siswa) });
      }
    }
  });
});

// Reset halaman via API
app.post("/reset", (req, res) => {
  const token = req.body.token;
  if (rooms[token]) rooms[token].halaman = 1;
  res.send({ success: true });
});

// Halaman monitoring
app.get("/", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Monitoring Log Server</title>
      <style>
        body { font-family: monospace; background: #111; color: #0f0; padding: 20px; }
        h1 { color: #fff; }
        #logs { white-space: pre-line; }
      </style>
    </head>
    <body>
      <h1>Monitoring Server (V1.1)</h1>
      <hr>
      <div id="logs"></div>

      <script src="/socket.io/socket.io.js"></script>
      <script>
        const logsDiv = document.getElementById("logs");
        const socket = io();
        const maxLogs = 20;

        // Join monitoring room
        socket.emit("joinMonitoring");

        // Terima log awal
        socket.on("initLogs", (data) => {
          data.forEach(log => appendLog(log));
        });

        // Terima log baru
        socket.on("newLog", (log) => {
          appendLog(log);
        });

        function appendLog(log) {
          const div = document.createElement("div");
          div.textContent = log;
          logsDiv.appendChild(div);
          while (logsDiv.children.length > maxLogs) {
            logsDiv.removeChild(logsDiv.firstChild);
          }
          window.scrollTo(0, document.body.scrollHeight);
        }
      </script>
    </body>
    </html>
  `);
});

const port = process.env.PORT || 3000;
server.listen(port, () => console.log("Server running on port", port));
