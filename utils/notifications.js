const nodemailer = require('nodemailer');
const twilio = require('twilio');
const webpush = require('web-push');
const db = require('../db/connection');

// Configure email transporter
const transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Configure Twilio client
const twilioClient = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
);

// Configure web push
webpush.setVapidDetails(
    'mailto:' + process.env.EMAIL_USER,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
);

async function sendNotification({ userId, title, message, type }) {
    try {
        // Get user notification preferences
        const userPrefs = await db.query(
            'SELECT notification_email, notification_sms, notification_push FROM users WHERE id = $1',
            [userId]
        );

        const { notification_email, notification_sms, notification_push } = userPrefs.rows[0];

        // Store notification in database
        await db.query(
            'INSERT INTO notifications (user_id, title, message, type, created_at) VALUES ($1, $2, $3, $4, NOW())',
            [userId, title, message, type]
        );

        // Send notifications based on user preferences
        if (notification_email) {
            // Implement email sending logic
            await sendEmail(userId, title, message);
        }

        if (notification_sms) {
            // Implement SMS sending logic
            await sendSMS(userId, message);
        }

        if (notification_push) {
            // Implement push notification logic
            await sendPushNotification(userId, title, message);
        }

        return true;
    } catch (error) {
        console.error('Error sending notification:', error);
        return false;
    }
}

async function sendEmail(userId, title, message) {
    const user = await db.query('SELECT email FROM users WHERE id = $1', [userId]);
    const userEmail = user.rows[0].email;

    await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: userEmail,
        subject: title,
        text: message,
        html: `<div style="font-family: sans-serif;">
            <h2>${title}</h2>
            <p>${message}</p>
        </div>`
    });
}

async function sendSMS(userId, message) {
    const user = await db.query('SELECT phone FROM users WHERE id = $1', [userId]);
    const userPhone = user.rows[0].phone;

    await twilioClient.messages.create({
        body: message,
        to: userPhone,
        from: process.env.TWILIO_PHONE_NUMBER
    });
}

async function sendPushNotification(userId, title, message) {
    const subscriptions = await db.query(
        'SELECT push_subscription FROM user_push_subscriptions WHERE user_id = $1',
        [userId]
    );

    const notifications = subscriptions.rows.map(sub =>
        webpush.sendNotification(
            JSON.parse(sub.push_subscription),
            JSON.stringify({ title, message })
        )
    );

    await Promise.all(notifications);
}

module.exports = {
    sendNotification
};