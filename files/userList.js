import {io} from "https://cdn.socket.io/4.4.1/socket.io.esm.min.js"
const socket = io()
let list = document.querySelector(".list")
let inviteContainer = document.querySelector(".invite-container")
let renameButton = document.querySelector(".rename-button")
let renameInput = document.querySelector(".rename")
let usernameDiv = document.querySelector(".username")
let searchInput = document.querySelector(".search")
let id = localStorage.getItem("id")
let username = localStorage.getItem("username")
let userMap = new Map()

if (!id) {
    id = Math.floor(Math.random() * 1e6)
    localStorage.setItem("id", id)
}

if (!username) {
    username = `User#${id}`
    localStorage.setItem("username", username)
}

renameButton.addEventListener("click", rename)
searchInput.addEventListener("input", search)

renameInput.addEventListener("keydown", (e) => {
    if (e.key == "Enter") rename()
})

usernameDiv.innerText = username

socket.on("connect", () => {
    socket.emit("login", id, username, "lobby")
})

socket.on("refresh", (array) => {
    let template = document.querySelector("[data-template = item]")
    array = array.filter(u => {return u[1].socketID != "" && u[1].id != id})
    let collator = new Intl.Collator()
    array.sort((a, b) => {return collator.compare(a[1].username, b[1].username)})
    let i = 1
    for (const [id, obj] of array) {
        let item = template.content.cloneNode(true)
        let name = item.querySelector(".name")
        let button = item.querySelector("button")

        if (userMap.has(id)) {
            let user = userMap.get(id)
            let item = document.querySelector(`#U${id}`)
            if (user.username != obj.username) {
                item.querySelector(".name").innerText = obj.username
                item.remove()
                list.insertBefore(item, list.children[i - 1])
            }
            i++
            continue
        }
        name.innerText = obj.username
        item.querySelector(".item-container").id = `U${id}`
        button.innerText = (obj.room == "lobby")? "invite": "spectate"
        button.addEventListener("click", () => {
            (obj.room == "lobby")? invite(obj.socketID, button): spectate(obj.room)            
        })
        if (list.children.length > i) list.insertBefore(item, list.children[i - 1])
        else list.appendChild(item)
        i++
    }
    for (const id of userMap.keys()) {
        let exists = array.find(a => {return a[0] == id})
        if (exists) continue
        document.querySelector(`#U${id}`).remove()
    }
    userMap = new Map(array)
    if (searchInput.value != "") search()
})

socket.on("redirect", (route, roomName) => {
    localStorage.setItem("roomName", roomName)
    window.location.href = route
})

socket.on("invited", (theirId, username) => {
    let template = document.querySelector("[data-template = invite]")
    let invite = template.content.cloneNode(true)
    let inviteName = invite.querySelector(".invite-name")
    let accept = invite.querySelector(".accept")
    let deny = invite.querySelector(".deny")

    inviteContainer.appendChild(invite)
    let child = inviteContainer.children[inviteContainer.children.length - 1]
    inviteName.innerText = `${username} invites you to a match!`
    let timeoutID = setTimeout(() => {
        inviteContainer.removeChild(child)
        socket.emit("rejected", theirId, username)
    }, 10000)
    
    accept.addEventListener("click", () => {
        socket.emit("accepted", theirId, id)
        inviteContainer.removeChild(child)
        clearTimeout(timeoutID)
    })
    deny.addEventListener("click", () => {
        socket.emit("rejected", theirId, username)
        inviteContainer.removeChild(child)
        clearTimeout(timeoutID)
    })
})

socket.on("rejected", (username) => {
    window.alert(`${username} declined your invitation`)
})

socket.on("timeOut", (username) => {
    window.alert(`${username} has already entered a match`)
})

function invite(to, button) {
    socket.emit("invite", to, id, username)
    button.disabled = true
    setTimeout(() => {
        button.disabled = false
    }, 5000);
}

function spectate(room) {
    socket.emit("spectate", id, room)
    localStorage.setItem("roomName", room)
    window.location.href = "./room"
}

function rename() {
    username = renameInput.value
    localStorage.setItem("username", username)
    socket.emit("rename", id, username)
    renameInput.blur()
    usernameDiv.innerText = username
}

function search() {
    let value = searchInput.value.toLowerCase()
    for (const obj of userMap.values()) {
        document.querySelector(`#U${obj.id}`).style.display = (obj.username.toLowerCase().includes(value))? "inline-block": "none"
    }
}