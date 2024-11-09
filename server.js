const express = require('express');
const serverless = require('serverless-http');
const mongoose = require('mongoose');
const session = require('express-session');
const path = require('path');
const MongoStore = require('connect-mongo');
const passport = require('passport');
require('dotenv').config();

const User = require('./models/User');
const Auth = require('./models/Auth');

const app = express();

// Add this near the top of your server configuration
app.use(express.static('public'));

// Connect to database
const mongoUri = process.env.MONGO_URI.startsWith('mongodb+srv://')
    ? process.env.MONGO_URI
    : process.env.MONGO_URI.replace('mongodb://', 'mongodb+srv://');
mongoose.connect(mongoUri)
    .then(() => console.log('MongoDB Connected'))
    .catch(err => console.error(err));

// Set view engine to EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Update static middleware configuration
app.use(express.static('public'));
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use('/js', express.static(path.join(__dirname, 'public/js')));
app.use('/css', express.static(path.join(__dirname, 'public/css')));

// Session configuration
app.use(session({
    secret: process.env.SECRET_KEY || 'your_secret_key',
    resave: false,
    saveUninitialized: true,
    store: MongoStore.create({
        mongoUrl: process.env.MONGO_URI, // Use your MongoDB connection string
        ttl: 14 * 24 * 60 * 60 // = 14 days. Default
    }),
    cookie: { secure: process.env.NODE_ENV === 'production' }
}));

app.use(passport.initialize());
app.use(passport.session());

// Authentication middleware
const authMiddleware = async (req, res, next) => {
    if (!req.session.userId) {
        return res.redirect('/login');
    }
    try {
        const user = await User.findById(req.session.userId);
        if (!user) {
            req.session.destroy();
            return res.redirect('/login');
        }
        req.user = user;
        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        res.redirect('/login');
    }
};

// Add this middleware to check auth status
app.use((req, res, next) => {
    res.locals.isAuthenticated = !!req.session.userId;
    next();
});

// Models
const Medication = require('./models/medication');

const Dose = mongoose.model('Dose', new mongoose.Schema({
    scheduled_time: { type: Date, required: true },
    taken_time: { type: Date, required: false },
    medication_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Medication', required: true }
}));

// API Routes
app.post('/api/auth/register', async (req, res) => {
    try {
        const result = await Auth.registerUser(req.body);
        if (result.success) {
            res.status(201).json({ message: 'User registered successfully', redirect: '/login' });
        } else {
            res.status(400).json({ message: result.error });
        }
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Update login route
app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const result = await Auth.loginUser(username, password);

        if (result.success) {
            req.session.userId = result.user._id; // Changed from user_id to userId
            req.session.username = result.user.username; // Add username to session
            res.status(200).json({
                success: true,
                message: 'Login successful',
                user: {
                    username: result.user.username,
                    id: result.user._id
                }
            });
        } else {
            res.status(401).json({
                success: false,
                message: result.error || 'Invalid credentials'
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Page Routes
app.get('/', async (req, res) => {
    const defaultData = {
        isAuthenticated: false,
        user: { name: 'Guest' },
        stats: {
            activeMedications: 0,
            takenToday: 0,
            totalToday: 0,
            nextDoseTime: 'No upcoming doses',
            adherenceRate: 0
        },
        todaysMedications: [],
        platformStats: [
            { value: '10k+', label: 'Active Users' },
            { value: '98%', label: 'Medication Adherence' },
            { value: '24/7', label: 'Support Available' }
        ],
        testimonials: [
            {
                quote: 'This app has transformed how I manage my medications. The reminders are reliable, and the interface is so easy to use!',
                author: 'Sarah Johnson'
            }
        ]
    };

    if (req.session && req.session.userId) {
        try {
            // Fetch user data
            const user = await User.findById(req.session.userId);
            if (!user) {
                req.session.destroy();
                return res.render('index', defaultData);
            }

            // Fetch user's medications
            const medications = await Medication.find({
                userId: req.session.userId
            });

            // Fetch user's doses for today
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);

            const doses = await Dose.find({
                medication_id: { $in: medications.map(m => m._id) },
                scheduled_time: {
                    $gte: today,
                    $lt: tomorrow
                }
            });

            // Calculate statistics
            const activeMedications = medications.length;
            const takenDoses = doses.filter(d => d.taken_time).length;
            const totalDoses = doses.length;

            const nextDose = await Dose.findOne({
                medication_id: { $in: medications.map(m => m._id) },
                taken_time: null,
                scheduled_time: { $gt: new Date() }
            }).sort('scheduled_time');

            // Prepare medications list for today's schedule
            const todaysMedications = await Promise.all(doses.map(async dose => {
                const medication = medications.find(m => m._id.equals(dose.medication_id));
                return {
                    name: medication.name,
                    dosage: medication.dosage,
                    instructions: medication.frequency,
                    scheduledTime: dose.scheduled_time.toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit'
                    }),
                    status: dose.taken_time ? 'taken' : 'pending'
                };
            }));

            res.render('index', {
                isAuthenticated: true,
                user: {
                    name: user.username
                },
                stats: {
                    activeMedications,
                    takenToday: takenDoses,
                    totalToday: totalDoses,
                    nextDoseTime: nextDose ? nextDose.scheduled_time.toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit'
                    }) : 'No upcoming doses',
                    adherenceRate: totalDoses ? Math.round((takenDoses / totalDoses) * 100) : 0
                },
                todaysMedications,
                medications, // Pass medications to the template
                platformStats: defaultData.platformStats,
                testimonials: defaultData.testimonials
            });
        } catch (error) {
            console.error('Error fetching user data:', error);
            res.render('index', defaultData);
        }
    } else {
        res.render('index', defaultData);
    }
});

app.get('/register', (req, res) => {
    if (req.session.userId) {
        return res.redirect('/');
    }
    res.render('register.ejs');
});

app.get('/login', (req, res) => {
    if (req.session.userId) {
        return res.redirect('/');
    }
    res.render('login.ejs');
});

app.get('/add_medication', authMiddleware, (req, res) => {
    res.render('add_medication');
});

app.post('/add_medication', authMiddleware, async (req, res) => {
    try {
        const {
            name,
            dosage,
            frequency,
            start_date,
            end_date,
            notification_times,
            notifications_enabled,
            notification_email,
            notification_push,
            reminder_before,
            reminder_repeat
        } = req.body;

        // Validate notification times
        if (!notification_times || notification_times.length === 0) {
            throw new Error('At least one notification time is required');
        }

        // Create medication document
        const medication = new Medication({
            name,
            dosage,
            frequency: parseInt(frequency),
            startDate: new Date(start_date),
            endDate: new Date(end_date),
            notificationSettings: {
                enabled: notifications_enabled,
                methods: {
                    email: notification_email,
                    push: notification_push
                },
                reminder: {
                    beforeMinutes: parseInt(reminder_before),
                    repeat: parseInt(reminder_repeat)
                }
            },
            notificationTimes: notification_times.map(time => ({
                time: time,
                status: 'pending'
            })),
            userId: req.session.userId
        });

        await medication.save();

        res.json({
            success: true,
            message: 'Medication added successfully',
            redirectUrl: '/'
        });
    } catch (error) {
        console.error('Error adding medication:', error);
        res.status(400).json({
            success: false,
            message: 'Error adding medication',
            error: error.message
        });
    }
});

app.post('/api/medications', async (req, res) => {
    try {
        const { name, dosage, frequency, startDate, endDate, notificationSettings } = req.body;

        if (!notificationSettings.notificationTimes || notificationSettings.notificationTimes.length === 0) {
            throw new Error('At least one notification time is required');
        }

        const newMedication = new Medication({
            name,
            dosage,
            frequency,
            startDate,
            endDate,
            notificationSettings
        });

        await newMedication.save();
        res.json({ success: true, medication: newMedication });
    } catch (error) {
        console.error('Error adding medication:', error);
        res.status(400).json({ success: false, message: error.message });
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

// Add these routes before the error handling middleware
app.get('/about', (req, res) => {
    res.render('about', {
        isAuthenticated: !!req.session.userId,
        pageTitle: 'About Us'
    });
});

app.get('/features', (req, res) => {
    res.render('features', {
        isAuthenticated: !!req.session.userId,
        pageTitle: 'Features',
        features: [
            {
                icon: 'fa-bell',
                title: 'Smart Reminders',
                description: 'Get notifications at the right time, never miss a dose'
            },
            {
                icon: 'fa-chart-line',
                title: 'Progress Tracking',
                description: 'Monitor your medication adherence with detailed analytics'
            },
            {
                icon: 'fa-mobile-alt',
                title: 'Mobile Friendly',
                description: 'Access your medication schedule from any device'
            },
            {
                icon: 'fa-user-shield',
                title: 'Data Security',
                description: 'Your health information is encrypted and secure'
            },
            {
                icon: 'fa-pills',
                title: 'Medication Management',
                description: 'Easily manage all your medications in one place'
            },
            {
                icon: 'fa-file-medical',
                title: 'Health Reports',
                description: 'Generate detailed reports for your healthcare provider'
            }
        ]
    });
});

// Add these routes before the error handling middleware
app.get('/help', (req, res) => {
    res.render('help', {
        isAuthenticated: !!req.session.userId,
        pageTitle: 'Help Center'
    });
});

app.get('/contact', (req, res) => {
    res.render('contact', {
        isAuthenticated: !!req.session.userId,
        pageTitle: 'Contact Us'
    });
});

app.post('/contact', (req, res) => {
    // Handle contact form submission
    // Add your email sending logic here
    res.redirect('/contact?success=true');
});

app.get('/privacy', (req, res) => {
    res.render('privacy', {
        isAuthenticated: !!req.session.userId,
        pageTitle: 'Privacy Policy'
    });
});

// Add a route to get medications for a user
app.get('/api/medications', authMiddleware, async (req, res) => {
    try {
        const { search, status, sort } = req.query;
        let query = { userId: req.session.userId };
        let sortQuery = {};

        // Add search filter
        if (search) {
            query.name = { $regex: search, $options: 'i' };
        }

        // Add status filter
        if (status && status !== 'all') {
            const now = new Date();
            switch (status) {
                case 'active':
                    query.startDate = { $lte: now };
                    query.endDate = { $gt: now };
                    break;
                case 'completed':
                    query.endDate = { $lt: now };
                    break;
                case 'upcoming':
                    query.startDate = { $gt: now };
                    break;
            }
        }

        // Add sort
        switch (sort) {
            case 'name':
                sortQuery.name = 1;
                break;
            case 'startDate':
                sortQuery.startDate = 1;
                break;
            case 'endDate':
                sortQuery.endDate = 1;
                break;
            default:
                sortQuery.name = 1;
        }

        const medications = await Medication.find(query).sort(sortQuery);

        console.log('Found medications:', medications.length);

        res.json({
            success: true,
            medications
        });
    } catch (error) {
        console.error('Error fetching medications:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching medications',
            error: error.message
        });
    }
});

app.delete('/api/medications/:id', authMiddleware, async (req, res) => {
    const medicationId = req.params.id;
    const userId = req.session.userId;

    console.log(`Delete request received - Medication ID: ${medicationId}, User ID: ${userId}`);

    if (!mongoose.Types.ObjectId.isValid(medicationId)) {
        console.log('Invalid medication ID format');
        return res.status(400).json({
            success: false,
            message: 'Invalid medication ID'
        });
    }

    try {
        const result = await Medication.findOneAndDelete({
            _id: medicationId,
            userId: userId
        });

        if (!result) {
            console.log('Medication not found or unauthorized');
            return res.status(404).json({
                success: false,
                message: 'Medication not found or unauthorized'
            });
        }

        console.log('Medication deleted successfully');
        return res.json({
            success: true,
            message: 'Medication deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting medication:', error);
        return res.status(500).json({
            success: false,
            message: 'Error deleting medication',
            error: error.message
        });
    }
});

// Add a route to update a medication
app.put('/api/medications/:id', authMiddleware, async (req, res) => {
    try {
        const beforeMinutes = parseInt(req.body.reminder_before, 10);
        if (isNaN(beforeMinutes)) {
            return res.status(400).json({
                success: false,
                message: 'Reminder Before (minutes) must be a valid number'
            });
        }

        const reminderRepeat = parseInt(req.body.reminder_repeat);
        const updatedMedication = await Medication.findOneAndUpdate(
            {
                _id: req.params.id,
                userId: req.session.userId
            },
            {
                $set: {
                    name: req.body.name,
                    dosage: req.body.dosage,
                    frequency: parseInt(req.body.frequency),
                    startDate: new Date(req.body.start_date),
                    endDate: new Date(req.body.end_date),
                    'notificationSettings.enabled': req.body.notifications_enabled === 'on',
                    'notificationSettings.methods': {
                        email: req.body.notification_email === 'on',
                        push: req.body.notification_push === 'on'
                    },
                    'notificationSettings.reminder': {
                        beforeMinutes: beforeMinutes,
                        repeat: isNaN(reminderRepeat) ? 0 : reminderRepeat
                    },
                    notificationTimes: Array.isArray(req.body.notification_times)
                        ? req.body.notification_times.map(time => ({
                            time,
                            status: 'pending'
                        }))
                        : [{ time: req.body.notification_times, status: 'pending' }]
                }
            },
            { new: true }
        );

        if (!updatedMedication) {
            return res.status(404).json({
                success: false,
                message: 'Medication not found'
            });
        }

        res.json({
            success: true,
            medication: updatedMedication
        });
    } catch (error) {
        console.error('Error updating medication:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating medication',
            error: error.message
        });
    }
});

app.get('/medications', authMiddleware, async (req, res) => {
    console.log('Accessing medications route');
    console.log('Session user ID:', req.session.userId);

    try {
        const medications = await Medication.find({ userId: req.session.userId })
            .sort({ name: 1 })
            .exec();

        console.log('Found medications:', medications.length);

        res.render('medications', {
            medications,
            user: req.user,
            title: 'My Medications'
        });
    } catch (error) {
        console.error('Error fetching medications:', error);
        res.render('medications', {
            medications: [],
            user: req.user,
            title: 'My Medications',
            error: 'Failed to load medications'
        });
    }
});

// Get single medication
app.get('/api/medications/:id', authMiddleware, async (req, res) => {
    try {
        const medication = await Medication.findOne({
            _id: req.params.id,
            userId: req.session.userId
        });

        if (!medication) {
            return res.status(404).json({
                success: false,
                message: 'Medication not found'
            });
        }

        res.json({
            success: true,
            medication
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching medication'
        });
    }
});

// Add a route to provide the localhost link
app.get('/localhost', (req, res) => {
    res.json({ link: 'http://localhost:3000' });
});

app.use((req, res, next) => {
    res.status(404).render('404');
});

// Handle other errors (500)
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).render('500');
});

// Export the app as a serverless handler
module.exports.handler = serverless(app);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});