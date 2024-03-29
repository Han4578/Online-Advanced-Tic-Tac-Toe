import {io} from "https://cdn.socket.io/4.4.1/socket.io.esm.min.js"
const socket = io()
let list = document.querySelector(".list")
let inviteContainer = document.querySelector(".invite-container")
let id = localStorage.getItem("id")
let username = localStorage.getItem("username")

if (!id) {
    id = Math.floor(Math.random() * 1e6)
    localStorage.setItem("id", id)
}

if (!username) {
    username = `User#${id}`
    localStorage.setItem("username", username)
}

socket.on("connect", () => {
    socket.emit("login", id, username, "userList")
})

socket.on("refresh", (array) => {
    list.innerHTML = ""
    array = array.filter(u => {return u.socketID != "" && u.localStorage != id})
    let template = document.querySelector("[data-template = item]")
    for (const obj of array) {
        let item = template.content.cloneNode(true)
        let name = item.querySelector(".name")
        let button = item.querySelector("button")
        name.innerText = `user#${obj.localStorage}`
        button.addEventListener("click", () => {
            invite(obj.socketID)
            button.disabled = true
            setTimeout(() => {
                button.disabled = false
            }, 5000);
        })
        list.appendChild(item)
    }
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
        socket.emit("rejected")
    }, 10000)
    
    accept.addEventListener("click", () => {
        socket.emit("accepted", theirId, id)
        inviteContainer.removeChild(child)
        clearTimeout(timeoutID)
    })
    deny.addEventListener("click", () => {
        socket.emit("rejected", theirId)
        inviteContainer.removeChild(child)
        clearTimeout(timeoutID)
    })
})

function invite(to) {
    socket.emit("invite", to, id, username)
}