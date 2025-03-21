import twilio from 'twilio';

const accountSid = import.meta.env.VITE_TWILIO_ACCOUNT_SID;
const authToken = import.meta.env.VITE_TWILIO_AUTH_TOKEN;
const fromNumber = import.meta.env.VITE_TWILIO_FROM_NUMBER;

export const twilioClient = accountSid && authToken 
    ? twilio(accountSid, authToken)
    : null;

export const twilioFromNumber = fromNumber; 