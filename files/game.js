import {io} from "https://cdn.socket.io/4.4.1/socket.io.esm.min.js"
const socket = io()
let domain = "http://192.168.0.111:1010"
let canvas = document.querySelector("#board")
let layout = [] //server object
let ctx = canvas.getContext("2d")
let width = canvas.width
let height = canvas.height
let thickness = 2
let padding = 10
let grids = [] //canvas object
let size = "small"
let n
let role
let P1Turn
let sizeDiv = document.querySelector(".size")
let small = document.querySelector(".small")
let big = document.querySelector(".big")
let upper = document.querySelector(".upper")
let roleDiv = document.querySelector(".role")
let turnDiv = document.querySelector(".turn")
let username = localStorage.getItem("username")
let id = localStorage.getItem("id")
let roomName = localStorage.getItem("roomName")
let bigCross = new Image()
bigCross.src = "./images/bigCross.png"
let smallCross = new Image()
smallCross.src = "./images/smallCross.png"
let bigRing = new Image()
bigRing.src = "./images/bigRing.png"
let smallRing = new Image()
smallRing.src = "./images/smallRing.png"

for (let i = 1; i < 10; i++) {
    let x = (i - 1) % 3
    let y = Math.floor((i - 1) / 3)
    grids.push({
        id: i,
        x: x * width / 3,
        y: y * height / 3
    })
}

canvas.addEventListener("click", tap)
sizeDiv.addEventListener("click", changeSize)

socket.on("connect", () => {
    socket.emit("login", id, username, roomName)
    socket.emit("getRole", roomName, id, socket.id)
})

socket.on("refresh", (obj) => {
    layout = obj.grid
    P1Turn = obj.turn
    console.log(obj);
    updateUpper(obj.names)
    refreshBoard()
})
socket.on("role", (r, turn, num) => {
    role = r
    n = num
    P1Turn = turn
    updateUpper()
})

socket.on("return", () => {
    window.alert("Room no longer exists, please return to lobby")
    window.location.href = "./"    
})

function refreshBoard() {
    ctx.clearRect(0,0, width, height)
    ctx.fillRect(0, Math.floor(height/3) + 0.5, width, thickness)
    ctx.fillRect(0, Math.floor(height/3 * 2) + 0.5, width, thickness)
    ctx.fillRect(Math.floor(width/3) + 0.5, 0, thickness, height)
    ctx.fillRect(Math.floor(width/3 * 2) + 0.5, 0, thickness, height)

    for (const obj of layout) {
        let grid = grids.find(g => {return obj.id == g.id})
        let x = grid.x
        let y = grid.y

        if (obj.big == 1) ctx.drawImage(bigCross, padding + x, padding + y, width / 3 - padding * 2, height / 3 - padding * 2)
        if (obj.big == 2) ctx.drawImage(bigRing, padding + x, padding + y, width / 3 - padding * 2, height / 3 - padding * 2)
        if (obj.small == 1) ctx.drawImage(smallCross, padding + x, padding + y, width / 3 - padding * 2, height / 3 - padding * 2)
        if (obj.small == 2) ctx.drawImage(smallRing, padding + x, padding + y, width / 3 - padding * 2, height / 3 - padding * 2)
    }
}

function tap(e) {
    if (role == "spectator" || (n == 1 && !P1Turn) || (n == 2 && P1Turn)) return
    let rect = canvas.getBoundingClientRect()
    let x = e.clientX - rect.left
    let y = e.clientY - rect.top
    let grid = grids.find(g => {return x > g.x && x < (g.x + width / 3) && y > g.y && y < (g.y + height / 3)})

    socket.emit("tap", roomName, grid.id, size, n)
    changeSize()
}

function changeSize() {
    size = (size == "big")? "small": "big"
}

function updateUpper(names) {
    small.classList.toggle("highlight")
    big.classList.toggle("highlight")
    if (role == "spectator") {
        roleDiv.innerText = "Spectating..."
        turnDiv.innerText =  `${names[(P1Turn)? 0: 1]}'s turn`
    }
    else {
        roleDiv.innerText = username
        turnDiv.innerText =  ((n == 1 && !P1Turn) || (n == 2 && P1Turn))? "Their turn": "Your turn"
    }
}

// setInterval(() => {
//     send({}, "GET")
//     refreshBoard()
// }, 1000)
// send({}, "GET")
refreshBoard()
