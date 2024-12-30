// socketHandler.js

const { Server } = require("socket.io");
const { ioAuthMiddleware } = require("../middleware/authMiddleware");
const chatHistory = [];
const setupSocket = (server) => {

    const io = new Server(server);

    // Use the authentication middleware globally for the Socket.io server
    io.use(ioAuthMiddleware);

    // Socket.io connection
    io.on("connection", (socket) => {
        console.log(`${socket.username} connected`);

        // Emit the list of logged-in users to the newly connected client
        const connectedUsers = Array.from(io.sockets.sockets.values()).map((s) => ({
            username: s.username,
        }));
        io.emit("users", connectedUsers);

        // Private chat initiation
        socket.on("startPrivateChat", ({ recipient }) => {
            const recipientSocket = Array.from(io.sockets.sockets.values()).find(
                (s) => s.username === recipient
            );

            if (recipientSocket) {
                const chatKey = [socket.username, recipient].sort().join("-");
                const messages = chatHistory[chatKey] || [];
                socket.emit("privateChatHistory", { recipient, messages });
            }
        });

        // Private message handling
        socket.on("privateMessage", ({ recipient, message }) => {
            const chatKey = [socket.username, recipient].sort().join("-");
            const newMessage = { sender: socket.username, message };

            // Save message to chat history
            if (!chatHistory[chatKey]) {
                chatHistory[chatKey] = [];
            }
            chatHistory[chatKey].push(newMessage);

            // Send message to recipient if they are online
            const recipientSocket = Array.from(io.sockets.sockets.values()).find(
                (s) => s.username === recipient
            );

            if (recipientSocket) {
                recipientSocket.emit("privateMessage", newMessage);
            }
            socket.emit("privateMessage", newMessage);
        });

        // Handle disconnect
        socket.on("disconnect", () => {
            console.log(`${socket.username} disconnected`);
            // Update the list of logged-in users when a user disconnects
            const connectedUsers = Array.from(io.sockets.sockets.values()).map((s) => ({
                username: s.username,
            }));
            io.emit("users", connectedUsers);
        });
    });



    return io;
};

module.exports = setupSocket;