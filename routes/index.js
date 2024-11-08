const express = require('express');
const router = express.Router();
const Medication = require('../models/medication'); // ensure this path matches your project structure
const User = require('../models/User');

// Helper functions with error handling
async function getPlatformStats() {
    try {
        const userCount = await User.countDocuments();
        const medicationCount = await Medication.countDocuments();
        return [
            { value: userCount || 0, label: 'Active Users' },
            { value: medicationCount || 0, label: 'Total Medications' },
            { value: 95, label: 'Adherence Rate (%)' }
        ];
    } catch (error) {
        console.error('Error fetching platform stats:', error);
        return [];
    }
}

async function getTestimonials() {
    // Implement the logic to fetch testimonials
    return [
        { quote: 'This app has changed my life!', author: 'John Doe' },
        { quote: 'I never miss a dose now.', author: 'Jane Smith' }
    ];
}

router.get('/', async (req, res) => {
    try {
        const isAuthenticated = req.isAuthenticated();
        let user = null;
        let stats = {
            activeMedications: 0,
            takenToday: 0,
            totalToday: 0,
            nextDoseTime: 'N/A',
            adherenceRate: 0
        };
        let todaysMedications = [];
        let platformStats = [];
        let testimonials = [];

        if (isAuthenticated) {
            user = req.user;
            const userId = user._id;

            // Get query parameters
            const { search, status, sort } = req.query;

            // Build query
            let query = { userId };

            if (search) {
                query.name = { $regex: search, $options: 'i' };
            }

            if (status && status !== 'all') {
                const now = new Date();
                switch (status) {
                    case 'active':
                        query.startDate = { $lte: now };
                        query.endDate = { $gte: now };
                        break;
                    case 'completed':
                        query.endDate = { $lt: now };
                        break;
                    case 'upcoming':
                        query.startDate = { $gt: now };
                        break;
                }
            }

            // Build sort options
            let sortOption = {};
            switch (sort) {
                case 'name':
                    sortOption = { name: 1 };
                    break;
                case 'startDate':
                    sortOption = { startDate: 1 };
                    break;
                case 'endDate':
                    sortOption = { endDate: 1 };
                    break;
                default:
                    sortOption = { scheduledTime: 1 };
            }

            // Fetch user's medications with proper error handling
            const medications = await Medication.find(query).sort(sortOption);
            console.log('Filtered medications:', medications); // Debug log

            if (medications && medications.length > 0) {
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                todaysMedications = medications.filter(med => {
                    const medDate = new Date(med.scheduledTime);
                    medDate.setHours(0, 0, 0, 0);
                    return medDate.getTime() === today.getTime();
                });

                // Calculate stats
                stats.activeMedications = medications.length;
                stats.takenToday = todaysMedications.filter(med => med.status === 'taken').length;
                stats.totalToday = todaysMedications.length;

                // Find next scheduled medication
                const nextMed = medications.find(med => new Date(med.scheduledTime) > new Date());
                stats.nextDoseTime = nextMed ? new Date(nextMed.scheduledTime).toLocaleTimeString() : 'N/A';

                stats.adherenceRate = stats.totalToday > 0
                    ? Math.round((stats.takenToday / stats.totalToday) * 100)
                    : 0;
            }

            platformStats = await getPlatformStats();

            // Default testimonials if none in database
            testimonials = [
                { quote: "This app helps me stay on track!", author: "John D." },
                { quote: "Never miss my medications now", author: "Sarah M." }
            ];
        }

        console.log('Rendering with data:', { stats, todaysMedications }); // Debug log

        res.render('index', {
            isAuthenticated,
            user,
            stats,
            todaysMedications,
            platformStats,
            testimonials
        });
    } catch (error) {
        console.error('Error in main route:', error);
        res.status(500).render('error', {
            message: 'Unable to load medication data',
            error: process.env.NODE_ENV === 'development' ? error : {}
        });
    }
});

router.delete('/api/medications/:id', async (req, res) => {
    try {
        const medicationId = req.params.id;
        const result = await Medication.findByIdAndDelete(medicationId);
        if (result) {
            res.json({ success: true });
        } else {
            res.status(404).json({ success: false, message: 'Medication not found' });
        }
    } catch (error) {
        console.error('Error deleting medication:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// ...existing code...

module.exports = router;