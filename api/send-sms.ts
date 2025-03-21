import { Twilio } from 'twilio';

// Initialize Twilio client
const client = new Twilio(
    process.env.TWILIO_ACCOUNT_SID!,
    process.env.TWILIO_AUTH_TOKEN!
);

const fromNumber = process.env.TWILIO_PHONE_NUMBER!;

export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { to, message } = req.body;

    if (!to || !message) {
        return res.status(400).json({ error: 'Missing required parameters' });
    }

    try {
        await client.messages.create({
            body: message,
            to: to,
            from: fromNumber,
        });

        return res.status(200).json({ success: true });
    } catch (error: any) {
        console.error('Failed to send SMS:', error);
        return res.status(500).json({ error: error.message });
    }
} 