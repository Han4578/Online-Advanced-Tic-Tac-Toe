let express = require("../express")
let {Server} = require("socket.io")
let cors = require("cors")
let http = require("http")
let app = express()
let server = http.createServer(app)
let io = new Server(server)
let roomID = 1
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
        users.set(id, {socketID: socket.id, username: username, socket: socket, id: id})
        console.log(`${username} is here`);
        if (from == "lobby") {
            socket.join("lobby")
            users.get(id).room = "lobby"
        }
        else {
            if (!rooms.has(from)) return io.to(socket.id).emit("return")
            io.to(from).emit("reconnected", id)
            socket.join(from)
            users.get(id).room = from
            rooms.get(from).disconnected.delete(id)
        }
        refreshLobby()
    })
    socket.on("disconnect", () => {
        let id = [...users.entries()].find(u => {return u[1].socketID == socket.id})

        if (!id) return
        else id = id[0]

        let username = users.get(id).username
        let room = users.get(id).room

        if (room != "lobby" && rooms.has(room) && rooms.get(room).players.includes(id)) {
            io.to(room).emit("disconnected", username, id)
            rooms.get(room).disconnected.set(id, username)
        }

        console.log(`${username} is gone`);
        users.get(id).socketID = ""
        refreshLobby()
    })
    socket.on("invite", (to, id, username) => {
        io.to(to).emit("invited", id, username)
    })
    socket.on("accepted", (P1, P2) => {
        if (users.get(P2).room != "lobby") {
            io.to(users.get(P1).socketID).emit("timeOut", users.get(P2).username)
            return
        } else if (users.get(P1).room != "lobby") {
            io.to(users.get(P2).socketID).emit("timeOut", users.get(P1).username)
            return
        } 
        let roomName = `Room-${roomID++}`
        users.get(P1).room = roomName
        users.get(P2).room = roomName
        rooms.set(roomName, {
            players: [P1, P2], 
            P1: P1, 
            P2: P2, 
            spectator: [], 
            P1Turn: Math.random() < 0.5, 
            grid: newGrid(), 
            disconnected: new Map(), 
            result: false, 
            winner: 0,
            size: ["small", "small"],
            P1Moved: false,
            P2Moved: false
        })
        io.to(users.get(P1).socketID).to(users.get(P2).socketID).emit("redirect", "./room", roomName)
    })
    socket.on("rejected", (rejectedId, username) => {
        io.to(users.get(rejectedId).socketID).emit("rejected", username)
    })
    socket.on("getRole", (roomName, id, socketID) => {
        if (!rooms.has(roomName)) return io.to(socketID).emit("return")
        let room = rooms.get(roomName)
        let role = (room.players.includes(id))? "player": "spectator"
        let P1Turn = room.P1Turn
        let n
        let names = room.players.map(p => {
            return users.get(p).username
        })
        if (role == "player") n = (room.P1 == id)? 1 : 2
        else n = 0

        io.to(socketID).emit("role", {
                role: role,
                P1Turn: P1Turn, 
                n: n, 
                layout: Array.from(room.grid.values()), 
                names: names,
                disconnected: Array.from(room.disconnected.entries()),
                result: room.result,
                winner: room.winner,
                size: room.size[n - 1],
                moved: (n == 1)? room.P1Moved: room.P2Moved
        })
    })
    socket.on("tap", (roomName, gridID, size , n) => {
        let room = rooms.get(roomName)
        let grid = room.grid
        let turn = room.P1Turn
        room.P1Turn = !turn
        grid.get(gridID)[size] = n
        let names = room.players.map(p => {
            return users.get(p).username
        })
        let [result, winner] = checkWin(grid)
        if (n == 1) room.P1Moved = true
        else room.P2Moved = true
        io.to(roomName).emit("refresh", {
            grid: Array.from(grid.values()),
            P1Turn: !turn,
            names: names,
            result: result,
            winner: winner
        })
        if (result) {
            room.winner = winner
            room.result = result
        }
    })
    socket.on("forfeit", (roomName, n) => {
        let room = rooms.get(roomName)
        let grid = room.grid
        let turn = room.P1Turn
        let names = room.players.map(p => {
            return users.get(p).username
        })
        io.to(roomName).emit("refresh", {
            grid: Array.from(grid.values()),
            P1Turn: !turn,
            names: names,
            result: true,
            winner: (n == 1)? 2: 1
        })
        room.winner = (n == 1)? 2: 1
        room.result = true
    })
    socket.on("join", (id, roomName) => {
        users.get(id).room = roomName

    })
    socket.on("rename", (id, name) => {
        users.get(id).username = name
        refreshLobby()
    })
    socket.on("size", (n, size, roomName) => {
        let room = rooms.get(roomName)
        room.size[n - 1] = size
    })
})

function newGrid() {
    let grid = new Map()
    for (let i = 1; i < 10; i++) {
        grid.set(i, {
            id: i,
            big: 0,
            small: 0
        })
    }
    return grid
}

function checkWin(grid) {
    let ones = Array.from(grid.entries()).filter(([id, obj]) => {
        return obj.small == 1 || obj.big == 1
    }).map((g) => {return g[0]})
    let twos = Array.from(grid.entries()).filter(([id, obj]) => {
        return obj.small == 2 || obj.big == 2
    }).map(g => {return g[0]})
    let wins = [
        [1,2,3],
        [4,5,6],
        [7,8,9],
        [1,4,7],
        [2,5,8],
        [3,6,9],
        [1,5,9],
        [3,5,7]
    ]
    let winner = 0
    let result = false

    if (wins.some(arr => {return arr.every(n => {return ones.includes(n)})})) winner = 1
    else if (wins.some(arr => {return arr.every(n => {return twos.includes(n)})})) winner = 2
    if (winner > 0) result = true

    return [result, winner]
}

function refreshLobby() {
    io.to("lobby").emit("refresh", Array.from(users.entries()).map(([id, obj]) => {
        obj = {...obj}
        obj.socket = ""
        return [id, obj]
    }))
}

server.listen(1010)
