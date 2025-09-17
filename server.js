
const { Server } = require("socket.io");

const express = require("express");
const app = express();

const io = new Server({
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
  });
});

// port dari cPanel
const port = process.env.PORT || 3000;
io.listen(port);
console.log("Socket.IO server running on port", port);

app.get("/", (req, res) => {
  res.send("Node.js App is running!");
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});
