const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

let board = Array(15).fill().map(() => Array(15).fill(""));

let currentPlayer = "black";

io.on("connection", (socket) => {
    console.log("Player connected");

    socket.emit("boardUpdate", board);

    socket.on("makeMove", ({ row, col }) => {
        if (board[row][col] === "") {
            board[row][col] = currentPlayer;
            currentPlayer = currentPlayer === "black" ? "white" : "black";

            io.emit("boardUpdate", board);
        }
    });
});

server.listen(3000, () => {
    console.log("Server running on http://localhost:3000");
});