import { supabase } from '../config/supabase';
import { format } from 'date-fns';

// Message Templates
const MESSAGE_TEMPLATES = {
    LATE_CHECK_IN: (employeeName: string, checkInTime: string, department: string) =>
        `🚨 *Late Check-in Alert*\n\n` +
        `Employee: *${employeeName}*\n` +
        `Department: *${department}*\n` +
        `Check-in Time: *${checkInTime}*\n\n` +
        `This is an automated notification from the Digital ID system.`,
    ABSENT: (employeeName: string, department: string) =>
        `⚠️ *Absence Alert*\n\n` +
        `Employee: *${employeeName}*\n` +
        `Department: *${department}*\n` +
        `Status: Not checked in today\n\n` +
        `This is an automated notification from the Digital ID system.`,
    EARLY_LEAVE: (employeeName: string, checkOutTime: string, department: string) =>
        `📤 *Early Leave Alert*\n\n` +
        `Employee: *${employeeName}*\n` +
        `Department: *${department}*\n` +
        `Check-out Time: *${checkOutTime}*\n\n` +
        `This is an automated notification from the Digital ID system.`,
    OVERTIME: (employeeName: string, hours: number, department: string) =>
        `⏰ *Overtime Alert*\n\n` +
        `Employee: *${employeeName}*\n` +
        `Department: *${department}*\n` +
        `Overtime Hours: *${hours} hours*\n\n` +
        `This is an automated notification from the Digital ID system.`,
    ATTENDANCE_REPORT: (message: string) => message
};

// Message Status Types
export enum MessageStatus {
    PENDING = 'pending',
    SENT = 'sent',
    FAILED = 'failed',
    DELIVERED = 'delivered'
}

// Notification Parameters
interface NotificationParams {
    employeeName: string;
    department?: string;
    checkInTime?: string;
    checkOutTime?: string;
    isLate?: boolean;
    isAbsent?: boolean;
    isEarlyLeave?: boolean;
    overtimeHours?: number;
    phoneNumber?: string;
    customMessage?: string;
    isAttendanceReport?: boolean;
}

// Validate WhatsApp number format
const isValidWhatsAppNumber = (phone: string): boolean => {
    // Remove 'whatsapp:' prefix and any whitespace
    const cleanNumber = phone.replace(/^whatsapp:/, '').trim();
    // Validate international format with country code
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    return phoneRegex.test(cleanNumber);
};

// Retry configuration
const RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 1000; // milliseconds

// Rate limiting configuration
const RATE_LIMIT = 10; // messages per minute
let messageCount = 0;
let lastResetTime = Date.now();

const resetRateLimit = () => {
    const now = Date.now();
    if (now - lastResetTime >= 60000) { // 1 minute
        messageCount = 0;
        lastResetTime = now;
    }
};

const isRateLimited = (): boolean => {
    resetRateLimit();
    return messageCount >= RATE_LIMIT;
};

// Sleep utility function
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Send WhatsApp message with retry mechanism
const sendWhatsAppMessageWithRetry = async (to: string, message: string, attempt = 1): Promise<boolean> => {
    try {
        // Remove 'whatsapp:' prefix if it exists and clean the number
        const cleanNumber = to.replace(/^whatsapp:/, '').trim();
        
        if (!isValidWhatsAppNumber(cleanNumber)) {
            throw new Error('Invalid WhatsApp number format. Please include country code (e.g., +1234567890)');
        }

        if (isRateLimited()) {
            throw new Error('Rate limit exceeded. Please try again later.');
        }

        // Get the base URL and handle both development and production environments
        const baseUrl = process.env.NODE_ENV === 'production' 
            ? window.location.origin 
            : 'http://localhost:3000';

        const response = await fetch(`${baseUrl}/api/send-message`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                to: `whatsapp:${cleanNumber}`,
                message,
                useWhatsApp: true
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Failed to send message: ${response.statusText}`);
        }

        const responseData = await response.json();

        if (!responseData.success) {
            throw new Error(responseData.error || 'Failed to send message');
        }

        messageCount++;
        
        // Log successful message
        await supabase.from('message_logs').insert({
            phone_number: to,
            message,
            type: 'whatsapp',
            status: MessageStatus.SENT,
            attempts: attempt
        });

        return true;
    } catch (error) {
        console.error(`Message sending attempt ${attempt} failed:`, error);

        // Log failed message
        await supabase.from('message_logs').insert({
            phone_number: to,
            message,
            type: 'whatsapp',
            status: MessageStatus.FAILED,
            attempts: attempt,
            error: error instanceof Error ? error.message : 'Unknown error'
        });

        if (attempt < RETRY_ATTEMPTS) {
            await sleep(RETRY_DELAY * attempt);
            return sendWhatsAppMessageWithRetry(to, message, attempt + 1);
        }

        throw error;
    }
};

// Main notification function
export const sendNotification = async (params: NotificationParams): Promise<boolean> => {
    try {
        // Get admin WhatsApp number from settings if not provided
        let recipientContact = params.phoneNumber;
        if (!recipientContact) {
            const { data: settings, error: settingsError } = await supabase
                .from('company_settings')
                .select('setting_value')
                .eq('setting_key', 'admin_whatsapp')
                .single();

            if (settingsError) {
                throw new Error('Failed to get admin WhatsApp number');
            }

            recipientContact = settings.setting_value;
        }

        if (!recipientContact) {
            throw new Error('Please configure an admin WhatsApp number in settings');
        }

        // Determine message template based on notification type
        let message: string;
        if (params.isAttendanceReport && params.customMessage) {
            message = MESSAGE_TEMPLATES.ATTENDANCE_REPORT(params.customMessage);
        } else if (params.isLate && params.checkInTime) {
            message = MESSAGE_TEMPLATES.LATE_CHECK_IN(params.employeeName, params.checkInTime, params.department || '');
        } else if (params.isAbsent) {
            message = MESSAGE_TEMPLATES.ABSENT(params.employeeName, params.department || '');
        } else if (params.isEarlyLeave && params.checkOutTime) {
            message = MESSAGE_TEMPLATES.EARLY_LEAVE(params.employeeName, params.checkOutTime, params.department || '');
        } else if (params.overtimeHours !== undefined) {
            message = MESSAGE_TEMPLATES.OVERTIME(params.employeeName, params.overtimeHours, params.department || '');
        } else if (params.customMessage) {
            message = params.customMessage;
        } else {
            throw new Error('Invalid notification type');
        }

        return await sendWhatsAppMessageWithRetry(recipientContact, message);
    } catch (error) {
        console.error('Error in notification:', error);
        throw error;
    }
};

// Batch notification sending function
export const sendBatchNotifications = async (notifications: NotificationParams[]): Promise<{
    success: number;
    failed: number;
    errors: string[];
}> => {
    const results = {
        success: 0,
        failed: 0,
        errors: [] as string[]
    };

    for (const notification of notifications) {
        try {
            const success = await sendNotification(notification);
            if (success) {
                results.success++;
            } else {
                results.failed++;
                results.errors.push(`Failed to send notification to ${notification.employeeName}`);
            }
            // Add delay between messages to respect rate limiting
            await sleep(100);
        } catch (error) {
            results.failed++;
            results.errors.push(
                `Error sending notification to ${notification.employeeName}: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }

    return results;
}; 