import twilio from 'twilio';

// Initialize Twilio client
const client = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
);

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { to, message } = req.body;

        if (!to || !message) {
            return res.status(400).json({ error: 'Missing required parameters' });
        }

        // Send SMS using Twilio
        const response = await client.messages.create({
            body: message,
            to: to,
            from: process.env.TWILIO_PHONE_NUMBER,
        });

        return res.status(200).json({ success: true, messageId: response.sid });
    } catch (error) {
        console.error('Error sending SMS:', error);
        return res.status(500).json({ error: 'Failed to send SMS' });
    }
} 