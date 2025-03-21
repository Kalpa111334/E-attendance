import { supabase } from '../config/supabase';
import { format } from 'date-fns';

// SMS Templates
const SMS_TEMPLATES = {
    LATE_CHECK_IN: (employeeName: string, checkInTime: string) =>
        `Late Check-in Alert: ${employeeName} checked in at ${checkInTime}`,
    ABSENT: (employeeName: string) =>
        `Absence Alert: ${employeeName} has not checked in today`,
    EARLY_LEAVE: (employeeName: string, checkOutTime: string) =>
        `Early Leave Alert: ${employeeName} checked out early at ${checkOutTime}`,
    OVERTIME: (employeeName: string, hours: number) =>
        `Overtime Alert: ${employeeName} has worked ${hours} hours overtime`,
    ATTENDANCE_REPORT: (message: string) => message
};

// SMS Status Types
export enum SMSStatus {
    PENDING = 'pending',
    SENT = 'sent',
    FAILED = 'failed',
    DELIVERED = 'delivered'
}

// SMS Notification Parameters
interface SMSNotificationParams {
    employeeName: string;
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

// Validate phone number format
const isValidPhoneNumber = (phone: string): boolean => {
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    return phoneRegex.test(phone);
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

// Send SMS with retry mechanism
const sendSMSWithRetry = async (to: string, message: string, attempt = 1): Promise<boolean> => {
    try {
        if (!isValidPhoneNumber(to)) {
            throw new Error('Invalid phone number format');
        }

        if (isRateLimited()) {
            throw new Error('Rate limit exceeded. Please try again later.');
        }

        const response = await fetch('/api/send-sms', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ to, message }),
        });

        if (!response.ok) {
            throw new Error(`Failed to send SMS: ${response.statusText}`);
        }

        messageCount++;
        
        // Log successful SMS
        await supabase.from('sms_logs').insert({
            phone_number: to,
            message,
            status: SMSStatus.SENT,
            attempts: attempt
        });

        return true;
    } catch (error) {
        console.error(`SMS sending attempt ${attempt} failed:`, error);

        if (attempt < RETRY_ATTEMPTS) {
            await sleep(RETRY_DELAY * attempt);
            return sendSMSWithRetry(to, message, attempt + 1);
        }

        // Log failed SMS
        await supabase.from('sms_logs').insert({
            phone_number: to,
            message,
            status: SMSStatus.FAILED,
            attempts: attempt,
            error: error instanceof Error ? error.message : 'Unknown error'
        });

        return false;
    }
};

// Main SMS notification function
export const sendSMSNotification = async (params: SMSNotificationParams): Promise<boolean> => {
    try {
        // Get admin phone number from settings if not provided
        let recipientPhone = params.phoneNumber;
        if (!recipientPhone) {
            const { data: settings, error: settingsError } = await supabase
                .from('company_settings')
                .select('setting_value')
                .eq('setting_key', 'admin_phone')
                .single();

            if (settingsError) {
                throw new Error('Failed to get admin phone number');
            }

            recipientPhone = settings.setting_value;
        }

        if (!recipientPhone) {
            console.warn('No recipient phone number configured');
            return false;
        }

        // Determine message template based on notification type
        let message: string;
        if (params.isAttendanceReport && params.customMessage) {
            message = SMS_TEMPLATES.ATTENDANCE_REPORT(params.customMessage);
        } else if (params.isLate && params.checkInTime) {
            message = SMS_TEMPLATES.LATE_CHECK_IN(params.employeeName, params.checkInTime);
        } else if (params.isAbsent) {
            message = SMS_TEMPLATES.ABSENT(params.employeeName);
        } else if (params.isEarlyLeave && params.checkOutTime) {
            message = SMS_TEMPLATES.EARLY_LEAVE(params.employeeName, params.checkOutTime);
        } else if (params.overtimeHours !== undefined) {
            message = SMS_TEMPLATES.OVERTIME(params.employeeName, params.overtimeHours);
        } else if (params.customMessage) {
            message = params.customMessage;
        } else {
            throw new Error('Invalid notification type');
        }

        return await sendSMSWithRetry(recipientPhone, message);
    } catch (error) {
        console.error('Error in SMS notification:', error);
        return false;
    }
};

// Batch SMS sending function
export const sendBatchSMS = async (notifications: SMSNotificationParams[]): Promise<{
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
            const success = await sendSMSNotification(notification);
            if (success) {
                results.success++;
            } else {
                results.failed++;
                results.errors.push(`Failed to send SMS to ${notification.employeeName}`);
            }
            // Add delay between messages to respect rate limiting
            await sleep(100);
        } catch (error) {
            results.failed++;
            results.errors.push(
                `Error sending SMS to ${notification.employeeName}: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }

    return results;
}; 