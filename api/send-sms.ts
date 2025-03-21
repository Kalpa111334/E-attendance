import twilio from 'twilio';

// Initialize Twilio client
const initTwilioClient = () => {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const phoneNumber = process.env.TWILIO_PHONE_NUMBER;

    if (!accountSid || !authToken || !phoneNumber) {
        throw new Error('Missing Twilio configuration. Please check your environment variables.');
    }

    return twilio(accountSid, authToken);
};

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ 
            success: false,
            error: 'Method not allowed' 
        });
    }

    try {
        const { to, message } = req.body;

        if (!to || !message) {
            return res.status(400).json({ 
                success: false,
                error: 'Missing required parameters: to and message are required' 
            });
        }

        // Initialize Twilio client
        const client = initTwilioClient();
        const phoneNumber = process.env.TWILIO_PHONE_NUMBER;

        // Send SMS using Twilio
        const response = await client.messages.create({
            body: message,
            to: to,
            from: phoneNumber,
        });

        return res.status(200).json({ 
            success: true, 
            messageId: response.sid 
        });
    } catch (error) {
        console.error('Error sending SMS:', error);

        // Handle specific Twilio errors
        if (error.code) {
            return res.status(400).json({
                success: false,
                error: `Twilio Error ${error.code}: ${error.message}`,
                details: error.moreInfo
            });
        }

        return res.status(500).json({ 
            success: false,
            error: error.message || 'Failed to send SMS'
        });
    }
} 