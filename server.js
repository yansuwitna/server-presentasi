const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*" }
});

const rooms = {}; 
// contoh: rooms["1234"] = { teacher: socketId }

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // guru membuat room
  socket.on("createRoom", ({ token }) => {
    rooms[token] = { teacher: socket.id };
    socket.join(token);
    console.log(`Room ${token} dibuat guru`);
  });

  // siswa join room
  socket.on("joinRoom", ({ token }) => {
    if (rooms[token]) {
      socket.join(token);
      socket.emit("joinSuccess", { msg: "Berhasil masuk" });
      console.log(`Siswa masuk room ${token}`);
    } else {
      socket.emit("joinError", { msg: "Token salah / room tidak ada" });
    }
  });

  // guru ganti halaman
  socket.on("changePage", ({ token, page }) => {
    socket.to(token).emit("updatePage", page);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);

    // bersihkan room jika guru disconnect
    for (const token in rooms) {
      if (rooms[token].teacher === socket.id) {
        delete rooms[token];
        io.to(token).emit("roomClosed", { msg: "Guru keluar, room ditutup" });
        console.log(`Room ${token} dihapus karena guru keluar`);
      }
    }
  });
});

// port dari cPanel atau default 3000
const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log("Server running on port", port);
});

app.get("/", (req, res) => {
  res.send("Node.js App is running!");
});
