const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const session = require('express-session');
const path = require('path');
require('dotenv').config();

const app = express();

// Connect to database
const mongoUri = process.env.MONGO_URI.startsWith('mongodb+srv://')
    ? process.env.MONGO_URI
    : process.env.MONGO_URI.replace('mongodb://', 'mongodb+srv://');
mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true,
    useFindAndModify: false
})
    .then(() => console.log('MongoDB Connected'))
    .catch(err => console.error(err));

// Set view engine to EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/css', express.static(path.join(__dirname, 'public/css')));
app.use('/js', express.static(path.join(__dirname, 'public/js')));

// Session configuration
app.use(session({
    secret: process.env.SECRET_KEY || 'your_secret_key',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: process.env.NODE_ENV === 'production' }
}));

// Authentication middleware
const authMiddleware = (req, res, next) => {
    if (!req.session.user_id) {
        return res.redirect('/login');
    }
    next();
};

// Models
const User = mongoose.model('User', new mongoose.Schema({
    username: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    email: { type: String, unique: true, required: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    medications: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Medication' }],
    doctor_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: false }
}));

const Medication = mongoose.model('Medication', new mongoose.Schema({
    name: { type: String, required: true },
    dosage: { type: String, required: true },
    frequency: { type: String, required: true },
    start_date: { type: Date, required: true },
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    doctor_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: false }
}));

const Dose = mongoose.model('Dose', new mongoose.Schema({
    scheduled_time: { type: Date, required: true },
    taken_time: { type: Date, required: false },
    medication_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Medication', required: true }
}));

const Doctor = mongoose.model('Doctor', new mongoose.Schema({
    name: { type: String, required: true },
    specialty: { type: String, required: true },
    users: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    medications: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Medication' }]
}));

// API Routes
app.post('/api/auth/register', async (req, res) => {
    try {
        const { firstName, lastName, email, username, password } = req.body;
        const user = new User({ firstName, lastName, email, username, password });
        await user.save();
        res.status(201).json({ message: 'User registered successfully' });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username, password });
        if (user) {
            req.session.user_id = user._id;
            res.status(200).json({ message: 'Login successful' });
        } else {
            res.status(401).json({ message: 'Invalid credentials' });
        }
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Page Routes
app.get('/', (req, res) => {
    res.render('index');
});

app.get('/register', (req, res) => {
    res.render('register');
});

app.get('/login', (req, res) => {
    res.render('login');
});

app.get('/add_medication', authMiddleware, (req, res) => {
    res.render('add_medication');
});

app.post('/add_medication', authMiddleware, async (req, res) => {
    try {
        const { name, dosage, frequency, start_date } = req.body;
        const medication = new Medication({
            name,
            dosage,
            frequency,
            start_date: new Date(start_date),
            user_id: req.session.user_id
        });
        await medication.save();

        // Update user's medications array
        await User.findByIdAndUpdate(
            req.session.user_id,
            { $push: { medications: medication._id } }
        );

        res.redirect('/medications');
    } catch (error) {
        res.status(400).send('Error adding medication');
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Error destroying session:', err);
        }
        res.redirect('/');
    });
});

// API endpoints for medication management
app.get('/api/medications', authMiddleware, async (req, res) => {
    try {
        const medications = await Medication.find({ user_id: req.session.user_id });
        res.json(medications);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.post('/api/medications', authMiddleware, async (req, res) => {
    try {
        const medication = new Medication({
            ...req.body,
            user_id: req.session.user_id
        });
        await medication.save();
        res.status(201).json(medication);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Route to provide the link to the localhost
app.get('/localhost', (req, res) => {
    res.send(`Server running at http://localhost:${PORT}`);
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
