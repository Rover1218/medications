const mongoose = require('mongoose');

const medicationSchema = new mongoose.Schema({
    name: { type: String, required: true },
    dosage: { type: String, required: true },
    frequency: { type: Number, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    notificationSettings: {
        enabled: { type: Boolean, default: true },
        methods: {
            email: { type: Boolean, default: true },
            push: { type: Boolean, default: true }
        },
        reminder: {
            beforeMinutes: { type: Number, default: 5 },
            repeat: { type: Number, default: 0 } // 0 means no repeat
        }
    },
    notificationTimes: [{
        time: { type: String, required: true },
        status: { type: String, enum: ['pending', 'sent', 'failed'], default: 'pending' },
        lastSent: { type: Date },
        nextReminder: { type: Date }
    }],
    notificationEnabled: { type: Boolean, default: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Medication', medicationSchema);