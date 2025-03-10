const express = require('express'); 
const path = require('path');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');

const port = 3000;
const app = express();

// Middleware to parse URL-encoded data and JSON payloads
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json()); // This is needed to parse JSON bodies
app.use(express.static(path.join(__dirname, 'public')));

// MongoDB Connection
const connectDB = async () => {
    try {
        await mongoose.connect("mongodb://localhost:27017/fitness-application", {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log("Database connected 🖇️ ✅");
    } catch (error) {
        console.error("Database connection failed ⚠️😖", error);
        process.exit(1);
    }
};
connectDB();

// User Schema
const userSchema = new mongoose.Schema({
    email: { type: String, unique: true, required: true },
    username: { type: String, unique: true, required: true },
    name: String,
    password: String,
    role: { type: String, enum: ['user', 'trainer'], required: true }
});
const User = mongoose.model('User', userSchema);

// Appointment Schema
const appointmentSchema = new mongoose.Schema({
    name: String,
    email: String,
    trainerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    gender: String,
    age: Number,
    date: Date,
    time: String,
    appointmentType: String,
    appointmentPhone: Number
});
const Appointments = mongoose.model('Appointments', appointmentSchema);

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Signup Route
app.post('/signup', async (req, res) => {
    try {
        const { name, username, password, email, role } = req.body;
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: 'Email already registered! Try another.' });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ email, username, name, password: hashedPassword, role });
        await newUser.save();
        res.redirect('/');
    } catch (err) {
        res.status(500).json({ error: `Error occurred: ${err.message}` });
    }
});

// Login Route
app.post('/login', async (req, res) => {
    try {
        console.log("Received login request:", req.body); // Debugging log

        const { username, password } = req.body;
        const user = await User.findOne({ username });
        if (!user) {
            console.log("User not found!");
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            console.log("Incorrect password!");
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        console.log(`Login successful for: ${username}`);
        res.json({
            role: user.role,
            redirect: user.role === 'user' ? '/user_dashboard.html' : '/trainer_dashboard.html',
            trainerId: user.role === 'trainer' ? user._id : null
        });
    } catch (err) {
        console.error("Error in login:", err);
        res.status(500).json({ error: `Error occurred: ${err.message}` });
    }
});
// Logout Route
app.post('/logout', (req, res) => {
    // Remove the trainerId from localStorage on the client-side (this will be handled in JavaScript)
    res.json({ success: true, message: 'Logged out successfully' });
  });
  
app.post('/userappointment', async (req, res) => {
    try {
        const { name, email, trainerId, gender, age, date, time, appointmentType, appointmentPhone } = req.body;
        console.log("Trainer ID received:", trainerId); // Should now show a valid trainer ID

        // Validate the trainer ID format
        if (!mongoose.Types.ObjectId.isValid(trainerId)) {
            console.log("Invalid ObjectId format");
            return res.status(400).json({ error: 'Invalid trainer ID. Please select a valid trainer.' });
        }

        // Check if the trainer exists and if they are a trainer
        const trainer = await User.findById(trainerId);
        console.log("Trainer found:", trainer);

        if (!trainer || trainer.role !== 'trainer') {
            console.log("Trainer not found or not a trainer");
            return res.status(400).json({ error: 'Trainer not found. Please select a valid trainer.' });
        }

        // Create the appointment
        const newAppointment = new Appointments({
            name, email, trainerId, gender, age, date, time, appointmentType, appointmentPhone
        });
        await newAppointment.save();
        res.redirect('/asucces.html');
    } catch (err) {
        console.error("Error in /userappointment:", err);
        res.status(500).json({ error: `Error occurred: ${err.message}` });
    }
});
// Route for trainer to fetch details of a user (client) based on user ID
// Fetch appointments for a specific trainer
app.get('/trainer/appointments/:trainerId', async (req, res) => {
    try {
        const { trainerId } = req.params;

        // Validate trainerId format
        if (!mongoose.Types.ObjectId.isValid(trainerId)) {
            return res.status(400).json({ error: 'Invalid Trainer ID format' });
        }

        // Check if trainer exists and is actually a trainer
        const trainer = await User.findOne({ _id: trainerId, role: 'trainer' });
        if (!trainer) {
            return res.status(404).json({ error: 'Trainer not found' });
        }

        // Fetch appointments for this trainer
        const appointments = await Appointments.find({ trainerId }).populate('trainerId', 'name');

        res.json(appointments);
    } catch (err) {
        console.error("Error fetching trainer's appointments:", err);
        res.status(500).json({ error: `Error fetching appointments: ${err.message}` });
    }
});

// Fetch All Appointments Route
app.get('/api/appointments', async (req, res) => {
    try {
        const appointments = await Appointments.find();
        res.json(appointments);
    } catch (err) {
        res.status(500).json({ error: `Error fetching appointments: ${err.message}` });
    }
});

// Route to serve User Dashboard
app.get("/user_dashboard", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "user_dashboard.html"));
});

// Route to serve Trainer Dashboard
app.get("/trainer_dashboard", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "trainer_dashboard.html"));
});


// Fetch All Trainers Route
app.get('/api/trainers', async (req, res) => {
    try {
        const trainers = await User.find({ role: 'trainer' }).select('_id name');
        res.json(trainers);
    } catch (err) {
        res.status(500).json({ error: `Error fetching trainers: ${err.message}` });
    }
});

// Start Server
app.listen(port, () => {
    console.log(`Server running at ${port}`);
});
