const express = require('express');
const bodyParser = require('body-parser');
const multer = require('multer');
const nodemailer = require('nodemailer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const { Pool } = require('pg');
const fs = require('fs');
const http = require('http');

const app = express();
const socketIo = require('socket.io');
const AUDIO_DIR = path.join(__dirname, 'audio');
if (!fs.existsSync(AUDIO_DIR)){
    fs.mkdirSync(AUDIO_DIR);
}

app.use(express.static('public')); // Serve the static files (HTML + JS)

// Middleware
app.use(bodyParser.json());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const server = http.createServer(app);
const io = socketIo(server);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files from the 'frontend' directory and 'uploads' directory
app.use(express.static(path.join(__dirname, '../frontend')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// PostgreSQL connection
const pool = new Pool({
    connectionString: 'postgres://bgckrxlt:OQ2TG25MyY8LMSy-NXsSaY4pLGNxXmTy@salt.db.elephantsql.com/bgckrxlt' // Hardcoded DB URL
});







// Create the SplannesUsers table if it doesn't exist
const createTable = async () => {
    const client = await pool.connect();
    try {
        await client.query(`
            CREATE TABLE IF NOT EXISTS SplannesUsers (
                id SERIAL PRIMARY KEY,
                username VARCHAR(50) NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                password TEXT NOT NULL,
                photo VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('Table created or already exists');
    } finally {
        client.release();
    }
};


// Function to delete all users
const deleteAllUsers = async () => {
    const client = await pool.connect();
    try {
        await client.query('DELETE FROM SplannesUsers');
        console.log('All user data deleted');
    } catch (err) {
        console.error('Error deleting user data:', err);
    } finally {
        client.release();
    }
};

// Uncomment the following line if you want to delete all users on server start
 //deleteAllUsers();

createTable(); // Ensure table exists on server start

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'silvestiriassey@gmail.com',
        pass: 'urzt ftqf caxa rhwk' // Hardcoded email password (not recommended for production)
    }
});







// In-memory store for users and files
let users = {}; // Store connected users by group
let files = {}; // Store uploaded files by group



const upload = multer({ dest: 'uploads/' }); // Ensure 'uploads' directory is inside 'backend'

let otpStore = {}; // Temporary OTP storage, use a persistent solution in production
app.use(express.static("uploads"));
// Function to execute a query
const query = async (text, params) => {
    const client = await pool.connect();
    try {
        const res = await client.query(text, params);
        return res;
    } finally {
        client.release();
    }
};

app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const result = await query('SELECT * FROM SplannesUsers WHERE email = $1', [email]);
        const user = result.rows[0];
        if (user && await bcrypt.compare(password, user.password)) {
            const otp = Math.floor(100000 + Math.random() * 900000);
            otpStore[email] = otp; // Store OTP temporarily
            console.log(otp)
            await transporter.sendMail({
                from: 'folksrooms<silvestiriassey@gmail.com>',
                to: email,
                subject: 'folksrooms login Verification Code',
                text: `Dear User,

You are receiving this email because we want to verify that it's you. For security reasons, please do not share this OTP with anyone. Your folksrooms verification code is ${otp}.

Best regards,
Silivestir Assey, Developer at folksrooms



`
            });
            res.json({ message: 'Login successful, check your email for OTP', otpRequired: true });
        } else {
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

app.post('/register', upload.single('photo'), async (req, res) => {
    const { username, email, password } = req.body;
    const photo = req.file;
    const hashedPassword = await bcrypt.hash(password, 10);

    // Get the relative path of the uploaded photo
    const photoPath = photo ? `uploads/${photo.filename}` : null;

    try {
        await query('INSERT INTO SplannesUsers (username, email, password, photo) VALUES ($1, $2, $3, $4)', [username, email, hashedPassword, photoPath]);
        const otp = Math.floor(100000 + Math.random() * 900000);
        otpStore[email] = otp; // Store OTP temporarily

           console.log(otp)
        await transporter.sendMail({
            from: 'folksrooms<silvestiriassey@gmail.com>',
            to: email,
            subject: 'folksrooms registration  Verification Code',
            text: `Dear User,

You are receiving this email because we want to verify that it's you. For security reasons, please do not share this OTP with anyone. Your folksrooms register verification code is ${otp}.

Best regards,
Silvestir Assey, Developer at folksrooms



`
        });
        res.json({ message: 'Registration successful, check your email for OTP', otpRequired: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

app.post('/verify-otp', (req, res) => {
    const { email, otp } = req.body;

    // Convert OTPs to strings and trim any spaces for comparison
    const storedOtp = otpStore[email]?.toString().trim();  // Ensure it's a string and trim spaces
    const receivedOtp = otp.toString().trim();  // Convert and trim the received OTP

    console.log(`Stored OTP: '${storedOtp}'`);
    console.log(`Received OTP: '${receivedOtp}'`);

    // Compare the OTPs
    if (storedOtp === receivedOtp) {
        delete otpStore[email]; // Clear OTP after successful verification
        const token = jwt.sign({ email }, 'your_jwt_secret', { expiresIn: '1h' }); // Use a stronger secret in production
        res.json({ message: 'OTP verified successfully', token, redirectUrl: '/homepage.html' }); // Redirect URL after login
    } else {
        res.status(400).json({ message: 'Invalid OTP' });
    }
});


app.get('/user-profile', async (req, res) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ message: 'No token provided' });

    try {
        const decoded = jwt.verify(token, 'your_jwt_secret');
        const result = await query('SELECT username, email, photo FROM SplannesUsers WHERE email = $1', [decoded.email]);
        if (result.rows.length > 0) {
            res.json(result.rows[0]);
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (err) {
        console.error(err);
        res.status(401).json({ message: 'Invalid token' });
    }
});






io.on('connection', (socket) => {
  console.log(`User connected`)
  socket.on('join', (payload) => {
    const roomId = payload.room
    const roomClients = io.sockets.adapter.rooms[roomId] || { length: 0 }
    const numberOfClients = roomClients.length
    console.log(`Room ID: ${roomId}`)
    console.log(`roomClients: ${roomClients}`)
    console.log(`numberOfClients of ${roomId}: ${numberOfClients}`)


    // These events are emitted only to the sender socket.
    if (numberOfClients == 0) {
      console.log(`Creating room ${roomId} and emitting room_created socket event`)
      socket.join(roomId)
      socket.emit('room_created', {
        roomId: roomId,
        peerId: socket.id
      })
    } else {
      console.log(`Joining room ${roomId} and emitting room_joined socket event`)
      socket.join(roomId)
      socket.emit('room_joined', {
        roomId: roomId,
        peerId: socket.id
      })
    } 
  })

  // These events are emitted to all the sockets connected to the same room except the sender.
  socket.on('start_call', (event) => {
    console.log(`Broadcasting start_call event to peers in room ${event.roomId} from peer ${event.senderId}`)
    socket.broadcast.to(event.roomId).emit('start_call', {
      senderId: event.senderId
  })})

  //Events emitted to only one peer
  socket.on('webrtc_offer', (event) => {
    console.log(`Sending webrtc_offer event to peers in room ${event.roomId} from peer ${event.senderId} to peer ${event.receiverId}`)
    socket.broadcast.to(event.receiverId).emit('webrtc_offer', {
      sdp: event.sdp,
      senderId: event.senderId
  })})

  socket.on('webrtc_answer', (event) => {
    console.log(`Sending webrtc_answer event to peers in room ${event.roomId} from peer ${event.senderId} to peer ${event.receiverId}`)
    socket.broadcast.to(event.receiverId).emit('webrtc_answer', {
      sdp: event.sdp,
      senderId: event.senderId
  })})

  socket.on('webrtc_ice_candidate', (event) => {
    console.log(`Sending webrtc_ice_candidate event to peers in room ${event.roomId} from peer ${event.senderId} to peer ${event.receiverId}`)
    socket.broadcast.to(event.receiverId).emit('webrtc_ice_candidate', event)
  })
  
  
  
  
  
  socket.on('join class', ({ className, userName }) => {
        socket.join(className);
        console.log(`${userName} joined class ${className}`);
        io.to(className).emit('class joined', { className, userName });
    });

    socket.on('document-update', (msg) => {
        socket.to(msg.className).emit('document-update', msg); // Broadcast to others in the same room
    });

    socket.on('cursor-update', (data) => {
        socket.to(data.className).emit('cursor-update', data); // Relay cursor position to others in the group
    });

    socket.on('disconnect', () => {
        console.log('A user disconnected:', socket.id);
    });
    
    
    
    
    socket.on('audio-data', (data) => {
        const audioFilePath = path.join(AUDIO_DIR, `audio-${Date.now()}.webm`);
        fs.writeFile(audioFilePath, data, 'base64', (err) => {
            if (err) {
                console.error('Error saving audio file:', err);
            } else {
                console.log('Audio file saved:', audioFilePath);
                // You may want to notify clients here
            }
        });
    });

    // Optionally handle requests to play audio by sending the list of filenames
    socket.on('request-audio-list', () => {
        fs.readdir(AUDIO_DIR, (err, files) => {
            if (err) {
                console.error('Error reading audio directory:', err);
                return;
            }
            const audioFiles = files.map(file => `/audio/${file}`); // Prepare paths for the client
            socket.emit('audio-list', audioFiles);
        });
    });
    
    
    
    
    
    
    
  
  
  
})

app.get('/audio/:filename', (req, res) => {
    const filePath = path.join(AUDIO_DIR, req.params.filename);
    res.sendFile(filePath);
});



// START THE SERVER =================================================================



const setupPdfFunction = (server) => {



    const upload = multer({ dest: 'uploads/' });


    let users = {};
    let files = {};

    const io = socketIo(server);


    io.on('connection', (socket) => {
        console.log('A user connected:', socket.id);

        let groupName = null;

        // Join a group when user joins
        socket.on('join-group', (group) => {
            groupName = group;
            if (!users[groupName]) {
                users[groupName] = [];
            }
            users[groupName].push(socket.id);
            socket.join(groupName);
            console.log(`${socket.id} joined group: ${groupName}`);
        });

        // Handle file clicked event (open the file)
        socket.on('file-clicked', (data) => {
            console.log(`File clicked: ${data.filePath}`);
            io.to(groupName).emit('alert-file', data.filePath);
        });

        // Handle drawing events
        socket.on('drawing', (data) => {
            socket.to(groupName).emit('drawing', data);
        });

        // Handle WebRTC signaling events (voice chat)
        socket.on('webrtc-offer', (data) => {
            socket.to(data.peerId).emit('webrtc-offer', data);
        });

        socket.on('webrtc-answer', (data) => {
            socket.to(data.peerId).emit('webrtc-answer', data);
        });

        socket.on('new-peer', (peerId) => {
            socket.to(peerId).emit('new-peer', socket.id);
        });

        // Handle disconnection
        socket.on('disconnect', () => {
            if (groupName) {
                const index = users[groupName].indexOf(socket.id);
                if (index !== -1) {
                    users[groupName].splice(index, 1);
                }
                console.log(`${socket.id} disconnected from group: ${groupName}`);
            }
        });
    });

    // Set up the upload route
    const uploadRoute = express.Router();

    app.post('/upload', upload.single('file'), (req, res) => {
        const filePath = `/uploads/${req.file.filename}`;
        const groupName = req.body.groupName;

        // Save file info in memory (you could save it to a database here)
        if (!files[groupName]) {
            files[groupName] = [];
        }

        files[groupName].push(filePath);

        // Emit file upload event to group members
        io.to(groupName).emit('new-file', { filePath });

        res.json({ filePath });
    });

    // Return the upload route so it can be used in the main app
    return uploadRoute;
};
setupPdfFunction(server)
// Error handling middleware (optional)
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

setInterval(() => {
    fetch("https://folksrooms.onrender.com/index.html")
        .then(() => console.log("-------- --------"))
        .catch(err => console.error("------", err));
}, 30000);

// Start the server
// Start the server
const PORT =10000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
