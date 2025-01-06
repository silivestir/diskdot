const userList = document.getElementById("users");
const chatWith = document.getElementById("chatWith");
const messagesContainer = document.getElementById("messages");
const messageInput = document.getElementById("messageInput");
const sendMessageButton = document.getElementById("sendMessageButton");
// Function to decode JWT token
function parseJwt(token) {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64));
}





const token = localStorage.getItem('authToken');
/*
if (!token) {
    window.location.href = '/index.html'; // Redirect to login if no token
    return;
}

// Fetch user data
fetch('/user-profile', {
        headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(response => response.json())
    .then(user => {
        document.getElementById('profile-photo').src = user.photo || "avatar.webp";
    })
    .catch(err => console.error('Error:', err));*/





// Retrieve the token from localStorage
//const token = localStorage.getItem('authToken');

let socket = io();
let currentChatUser = null;
initializeSocketConnection()

// Predefined list of emojis to assign to users
const emojis = ["😀", "😅", "😂", "🥰", "😎", "🤔", "😢", "🥳", "😇", "🤖", "👻", "🦄", "🐱", "🐶", "🐼", "🦊", "🦁", "🐯", "🐰", "🐸"];

// Function to hash username and consistently pick an emoji
function getEmojiForUser(username) {
    let hash = 0;
    for (let i = 0; i < username.length; i++) {
        hash = username.charCodeAt(i) + ((hash << 5) - hash);
    }
    const emojiIndex = Math.abs(hash) % emojis.length;
    return emojis[emojiIndex];
}

// Function to format the timestamp
function formatTimestamp(timestamp) {
    const now = Date.now();

    const diffInSeconds = Math.floor((now - new Date(timestamp).getTime()) / 1000);

    if (diffInSeconds < 10) { return "just now"; } else if (diffInSeconds < 60) { return `${diffInSeconds} seconds ago`; } else if (diffInSeconds < 3600) { return `${Math.floor(diffInSeconds / 60)} minutes ago`; } else if (diffInSeconds < 86400) {
        return `${Math.floor(diffInSeconds / 3600)} hours ago`;
        return new Date(timestamp).toLocaleDateString();
    }
}



// Initialize socket connection with authentication
function initializeSocketConnection() {


    socket.on("connect", () => {
        console.log("Connected to the server with socket ID:", socket.id);
    });

    socket.on("disconnect", () => {
        console.log("Disconnected from the server.");
    });

    socket.on("users", (users) => {
        updateUsers(users);
    });

    socket.on("privateChatHistory", ({ recipient, messages }) => {
        openPrivateChatWindow(recipient, messages);
    });

    socket.on("privateMessage", (message) => {
        displayMessage(message, message.sender === currentChatUser);
    });

    // Send message event
    sendMessageButton.addEventListener("click", () => {
        const message = messageInput.value;
        if (message.trim() && currentChatUser) {
            socket.emit("privateMessage", { recipient: currentChatUser, message });

            messageInput.value = "";
        }
    });
}

// Update users list on the client-side
function updateUsers(users) {
    userList.innerHTML = "";
    users.forEach((user) => {
        const li = document.createElement("li");
        li.textContent = `${getEmojiForUser(user.username)} ${user.username}`;
        li.addEventListener("click", () => {
            currentChatUser = user.username;
            socket.emit("startPrivateChat", { recipient: user.username });
        });
        userList.appendChild(li);
    });
}

// Open chat window
function openPrivateChatWindow(recipient, messages) {
    chatWith.textContent = `Chatting with ${recipient}`;
    messagesContainer.innerHTML = "";
    messages.forEach((message) => {
        displayMessage(message, message.sender === recipient);
    });
}

// Display message in chat window with timestamp and emoji
function displayMessage(message, isIncoming) {
    const messageDiv = document.createElement("div");
    messageDiv.classList.add("message");

    // Get the emoji for the user
    const userEmoji = getEmojiForUser(message.sender);

    // Determine if the message is incoming or outgoing and style accordingly
    if (isIncoming) {
        message.timestamp = Date.now();


        messageDiv.classList.add("incoming");
        messageDiv.style.backgroundColor = "#d1e7dd"; // Receiver's message bubble color
        messageDiv.innerHTML = `

<div class="message receiver">
${message.sender}
<div class="person-icon"><img class="person-icon" src="avatar.webp" alt="user  profile" ></div>
<div class="speech-bubble">${message.message}</div>
     <span class="timestamp">${formatTimestamp(message.timestamp)}</span>
</div>














         
        `;
    } else {

        message.timestamp = Date.now();

        formatTimestamp(message.timestamp)
        messageDiv.classList.add("private-message");
        messageDiv.innerHTML = `
<div class="message sender">
<div class="person-icon"><img src="avatar.webp" alt="user  profile" ></div>
<div class="speech-bubble">${message.message}</div>
    <span class="timestamp">${formatTimestamp(message.timestamp)}</span>
</div>








        `;
    }

    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight; // Auto-scroll to the bottom
}