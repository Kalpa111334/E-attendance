import { supabase } from '../config/supabase';
import { format } from 'date-fns';

// Message Templates
const MESSAGE_TEMPLATES = {
    LATE_CHECK_IN: (employeeName: string, checkInTime: string, department: string) =>
        `🕒 Late Arrival Notice\n` +
        `━━━━━━━━━━━━━━━\n` +
        `👤 ${employeeName}\n` +
        `🏢 ${department}\n` +
        `⏰ Checked in at: ${checkInTime}\n\n` +
        `This employee has arrived later than the scheduled time.\n` +
        `━━━━━━━━━━━━━━━\n` +
        `Digital ID Attendance System`,

    ABSENT: (employeeName: string, department: string) =>
        `❌ Absence Report\n` +
        `━━━━━━━━━━━━━━━\n` +
        `👤 ${employeeName}\n` +
        `🏢 ${department}\n` +
        `📅 Status: Not Present\n\n` +
        `This employee has not checked in today.\n` +
        `━━━━━━━━━━━━━━━\n` +
        `Digital ID Attendance System`,

    EARLY_LEAVE: (employeeName: string, checkOutTime: string, department: string) =>
        `🚶 Early Departure Alert\n` +
        `━━━━━━━━━━━━━━━\n` +
        `👤 ${employeeName}\n` +
        `🏢 ${department}\n` +
        `⏰ Left at: ${checkOutTime}\n\n` +
        `This employee has departed before their scheduled end time.\n` +
        `━━━━━━━━━━━━━━━\n` +
        `Digital ID Attendance System`,

    OVERTIME: (employeeName: string, hours: number, department: string) =>
        `⏱️ Overtime Record\n` +
        `━━━━━━━━━━━━━━━\n` +
        `👤 ${employeeName}\n` +
        `🏢 ${department}\n` +
        `⌛ Extra Hours: ${hours}\n\n` +
        `This employee has worked beyond regular hours.\n` +
        `━━━━━━━━━━━━━━━\n` +
        `Digital ID Attendance System`,

    ATTENDANCE_REPORT: (message: string) =>
        `📊 Attendance Summary\n` +
        `━━━━━━━━━━━━━━━\n\n` +
        `${message}\n\n` +
        `━━━━━━━━━━━━━━━\n` +
        `Generated by Digital ID System\n` +
        `${format(new Date(), 'PPpp')}`
};

// Message Status Types
export enum MessageStatus {
    PENDING = 'pending',
    SENT = 'sent',
    FAILED = 'failed',
    DELIVERED = 'delivered'
}

// Message Types
export enum MessageType {
    SMS = 'sms',
    WHATSAPP = 'whatsapp'
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
    messageType?: MessageType;
}

// Validate phone number format
const isValidPhoneNumber = (phone: string, type: MessageType): boolean => {
    // Remove any whitespace and validate the number
    const cleanNumber = phone.trim();
    // Validate international format with country code
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    return phoneRegex.test(cleanNumber);
};

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

// Send WhatsApp message using WhatsApp URL scheme
const sendWhatsAppMessage = async (to: string, message: string): Promise<boolean> => {
    try {
        // Remove any prefix and clean the number
        const cleanNumber = to.replace(/^whatsapp:|\+/g, '').trim();
        
        if (!isValidPhoneNumber('+' + cleanNumber, MessageType.WHATSAPP)) {
            throw new Error('Invalid WhatsApp number format. Please include country code (e.g., +1234567890)');
        }

        if (isRateLimited()) {
            throw new Error('Rate limit exceeded. Please try again later.');
        }

        // Create WhatsApp URL
        const whatsappUrl = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(message)}`;
        
        // Open WhatsApp in a new window
        window.open(whatsappUrl, '_blank');

        messageCount++;
        
        // Log successful message
        await supabase.from('message_logs').insert({
            phone_number: to,
            message,
            type: MessageType.WHATSAPP,
            status: MessageStatus.SENT,
            attempts: 1
        });

        return true;
    } catch (error) {
        console.error('Error sending WhatsApp message:', error);

        // Log failed message
        await supabase.from('message_logs').insert({
            phone_number: to,
            message,
            type: MessageType.WHATSAPP,
            status: MessageStatus.FAILED,
            attempts: 1,
            error: error instanceof Error ? error.message : 'Unknown error'
        });

        throw error;
    }
};

// Send SMS using Free SMS API
const sendSMSMessage = async (to: string, message: string): Promise<boolean> => {
    try {
        // Remove any prefix and clean the number
        const cleanNumber = to.replace(/^\+/, '').trim();
        
        if (!isValidPhoneNumber('+' + cleanNumber, MessageType.SMS)) {
            throw new Error('Invalid phone number format. Please include country code (e.g., +1234567890)');
        }

        if (isRateLimited()) {
            throw new Error('Rate limit exceeded. Please try again later.');
        }

        // For development/testing, log the message and simulate success
        if (import.meta.env.MODE === 'development') {
            console.log('Development Mode - SMS would be sent:', {
                to: cleanNumber,
                message: message
            });
            
            // Log successful test message
            await supabase.from('message_logs').insert({
                phone_number: to,
                message,
                type: MessageType.SMS,
                status: MessageStatus.SENT,
                attempts: 1,
                response: JSON.stringify({ mode: 'development', status: 'simulated success' })
            });

            return true;
        }

        // Using Free SMS API service
        const apiUrl = 'https://freesmsapi.com/send';
        const params = new URLSearchParams({
            number: cleanNumber,
            message: encodeURIComponent(message),
            sender_id: 'DigitalID',
            type: 'text'
        });

        // Make API request
        const response = await fetch(`${apiUrl}?${params.toString()}`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Cache-Control': 'no-cache',
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('SMS API Error Response:', errorText);
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('SMS API Response:', JSON.stringify(data, null, 2));

        if (data.status !== 'success') {
            throw new Error(data.message || 'Failed to send SMS');
        }

        messageCount++;
        
        // Log successful message
        await supabase.from('message_logs').insert({
            phone_number: to,
            message,
            type: MessageType.SMS,
            status: MessageStatus.SENT,
            attempts: 1,
            response: JSON.stringify(data, null, 2)
        });

        return true;
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('Error sending SMS message:', errorMessage);

        // Log failed message
        await supabase.from('message_logs').insert({
            phone_number: to,
            message,
            type: MessageType.SMS,
            status: MessageStatus.FAILED,
            attempts: 1,
            error: errorMessage
        });

        throw new Error(`Failed to send SMS: ${errorMessage}`);
    }
};

// Main notification function
export const sendNotification = async (params: NotificationParams): Promise<boolean> => {
    try {
        // Get admin contact number from settings if not provided
        let recipientContact = params.phoneNumber;
        if (!recipientContact) {
            const settingKey = params.messageType === MessageType.WHATSAPP ? 'admin_whatsapp' : 'admin_phone';
            const { data: settings, error: settingsError } = await supabase
                .from('company_settings')
                .select('setting_value')
                .eq('setting_key', settingKey)
                .single();

            if (settingsError) {
                throw new Error(`Failed to get admin ${params.messageType === MessageType.WHATSAPP ? 'WhatsApp' : 'phone'} number: ${settingsError.message}`);
            }

            recipientContact = settings?.setting_value;
        }

        if (!recipientContact) {
            throw new Error(`Please configure an admin ${params.messageType === MessageType.WHATSAPP ? 'WhatsApp' : 'phone'} number in settings`);
        }

        // Determine message template based on notification type
        let message: string;
        try {
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
                throw new Error('Invalid notification type or missing required parameters');
            }
        } catch (error) {
            throw new Error(`Error formatting message: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }

        // Send message based on type
        return params.messageType === MessageType.WHATSAPP
            ? await sendWhatsAppMessage(recipientContact, message)
            : await sendSMSMessage(recipientContact, message);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error in notification service';
        console.error('Error in notification:', errorMessage);
        throw new Error(errorMessage);
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