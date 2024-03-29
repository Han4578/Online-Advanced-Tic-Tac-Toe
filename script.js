let express = require("../express")
let {Server} = require("socket.io")
let cors = require("cors")
let http = require("http")
let app = express()
let server = http.createServer(app)
let io = new Server(server)
let roomID = 1
let turn = "R"
let users = new Map()
let rooms = new Map()

let corsOptions = {
    origin: ["http://127.0.0.1:5500", "http://localhost:1010", "http://192.168.0.111:1010"]
}

app.use(cors(corsOptions))
app.use(express.json())
app.use(express.static(__dirname + "/files"))

app.get("/", (req, res) => {
    res.sendFile(__dirname + "/files/userList.html")
})

app.get("/room", (req, res) => {
    res.sendFile(__dirname + "/files/game.html")
})

app.delete("/:id", (req, res) => {
    let id = parseInt(req.params.id)
    
    if (!gridTemplate.has(id)) return res.send(`grid with id ${id} not found`)
    gridTemplate.delete(id)

})


io.on("connection", (socket) => {
    socket.on("login", (id, username, from) => {
        users.set(id, {socketID: socket.id, username: username, socket: socket})
        console.log(`${username} is here`);
        if (from == "userList") socket.join("lobby")
        else socket.join(from)
        io.to("lobby").emit("refresh", Array.from(users.entries()).map(([a, {socketID, username}]) => {return {localStorage: a, socketID: socketID, username: username}}))
    })
    socket.on("disconnect", () => {
        let id = [...users.entries()].find(u => {return u[1].socketID == socket.id})[0]
        let username = users.get(id).username
        console.log(`${username} is gone`);
        users.get(id).socketID = ""
        io.to("lobby").emit("refresh", Array.from(users.entries()).map(([a, {socketID, username}]) => {return {localStorage: a, socketID: socketID, username: username}}))
    })
    socket.on("invite", (to, id, username) => {
        io.to(to).emit("invited", id, username)
    })
    socket.on("accepted", (P1, P2) => {
        let roomName = `Room-${roomID}`
        users.get(P1).socket.join(roomName)
        users.get(P2).socket.join(roomName)
        users.get(P1).socket.leave("lobby")
        users.get(P2).socket.leave("lobby")
        rooms.set(roomName, {players: [P1, P2], P1: P1, P2: P2, spectator: [], P1Turn: Math.random() < 0.5, grid: newGrid()})
        io.to(roomName).emit("redirect", "./room", roomName)
        roomID++
    })
    socket.on("rejected", () => {
        console.log("rejected");
    })
    socket.on("getRole", (roomName, id, socketID) => {
        if (!rooms.has(roomName)) return io.to(socketID).emit("return")
        let room = rooms.get(roomName)
        let role = (room.players.includes(id))? "player": "spectator"
        let P1Turn = room.P1Turn
        let n
        if (role == "player") n = (room.P1 == id)? 1 : 2
        else n = 0
        io.to(socketID).emit("role", role, P1Turn, n)
    })
    socket.on("tap", (roomName, gridID, size , n) => {
        let room = rooms.get(roomName)
        let grid = room.grid
        let turn = room.P1Turn
        let i = 1
        room.P1Turn = !turn
        grid.get(gridID)[size] = n
        let names = room.players.map(p => {
            return users.get(p).username
        })

        io.to(roomName).emit("refresh", {
            grid: Array.from(grid.entries()).map(([i, g]) => {
                g.id = i
                return g
            }),
            P1Turn: !turn,
            names: names
        })
    })
})

function newGrid() {
    let grid = new Map()
    for (let i = 1; i < 10; i++) {
        grid.set(i, {
            big: 0,
            small: 0
        })
    }
    return grid
}

server.listen(1010)