// import {io} from "https://cdn.socket.io/4.4.1/socket.io.esm.min.js"
const socket = io("http://localhost:2000")

socket.on("connect", () => {
    socket.emit("foo", "hi in")
})
socket.emit("foo", "hi out")