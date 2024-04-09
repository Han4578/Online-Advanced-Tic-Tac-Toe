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
let disconnectIDs = new Map()
let sizeDiv = document.querySelector(".size")
let small = document.querySelector(".small")
let big = document.querySelector(".big")
let display = document.querySelector(".display")
let roleDiv = document.querySelector(".role")
let turnDiv = document.querySelector(".turn")
let returnButton = document.querySelector(".return")
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
returnButton.addEventListener("click", confirmReturn)

socket.on("connect", () => {
    socket.emit("login", id, username, roomName)
    socket.emit("getRole", roomName, id, socket.id)
})

socket.on("refresh", (obj) => {
    layout = obj.grid
    P1Turn = obj.P1Turn
    updateUpper(obj.names)
    refreshBoard()
    if (obj.result) declareWin(obj.winner, obj.names)
})
socket.on("role", (obj) => {
    role = obj.role
    layout = obj.layout
    n = obj.n
    P1Turn = obj.P1Turn
    if (obj.size == "big") changeSize(false)
    updateUpper(obj.names)
    refreshBoard()
    if (role == "spectator") {
        changeButton()
        sizeDiv.remove()
    }
    for (const [id, username] of obj.disconnected) {
        display.innerHTML += `<div id="${id}">${username} has disconnected</div>`
    }
    if (obj.result) declareWin(obj.winner, obj.names)
    if (obj.moved) sizeDiv.removeEventListener("click", changeSize)
})

socket.on("return", () => {
    window.alert("Room no longer exists, please return to lobby")
    window.location.href = "./"    
})

socket.on("disconnected", (username, id) => {
    let disconnectID = setTimeout(() => {
        display.innerHTML += `<div id="${id}">${username} has disconnected</div>`
    }, 1000);
    disconnectIDs.set(id, disconnectID)
})

socket.on("reconnected", (id) => {
    let disconnectID = disconnectIDs.get(id)
    clearTimeout(disconnectID)
    let div = document.getElementById(id) ?? false
    if (div) div.remove()
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
    let layoutGrid = layout.find(g => {return g.id == grid.id})
    if (layoutGrid.small > 0 || (layoutGrid.big > 0 && size == "big")) return
    socket.emit("tap", roomName, grid.id, size, n)
    changeSize()
    sizeDiv.removeEventListener("click", changeSize)
}

function changeSize(updateServer = true) {
    size = (size == "big")? "small": "big"
    small.classList.toggle("selected")
    big.classList.toggle("selected")
    if (updateServer) socket.emit("size", n, size, roomName)
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

function declareWin(winner, names) {
    let winnerName = names[winner - 1]
    display.innerHTML += (winner == n)? `<div>You win</div>`: `<div>${winnerName} wins</div>`
    canvas.removeEventListener("click", tap)
    let timerDiv = document.createElement("div")
    let t = 60
    timerDiv.classList.add("timer")
    display.appendChild(timerDiv)
    changeButton()
    timerDiv.innerText = `Returning to lobby in ${t--} seconds`
    setInterval(() => {
        let div = document.querySelector(".timer")
        div.innerText = `Returning to lobby in ${t--} seconds`
    }, 1000);
    setTimeout(() => {
        timerDiv.remove()
        window.location.href = "./"
    }, 60000);
    localStorage.setItem("roomName", "")
}

function confirmReturn() {
    if (window.confirm("Are you sure?")) socket.emit("forfeit", roomName, n)
}

function changeButton() {
    returnButton.removeEventListener("click", confirmReturn)
    returnButton.addEventListener("click", () => {
        localStorage.setItem("roomName", "")
        window.location.href = "./"
    })
    returnButton.innerText = "Return to lobby"
}

refreshBoard()
