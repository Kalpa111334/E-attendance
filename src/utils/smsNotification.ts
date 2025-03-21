import { supabase } from '../config/supabase';

interface SMSNotificationParams {
    employeeName: string;
    checkInTime: string;
    isLate: boolean;
}

export const sendLateCheckInSMS = async ({ employeeName, checkInTime, isLate }: SMSNotificationParams) => {
    try {
        // Get admin phone number from settings
        const { data: settings, error: settingsError } = await supabase
            .from('company_settings')
            .select('setting_value')
            .eq('setting_key', 'admin_phone')
            .single();

        if (settingsError) {
            throw new Error('Failed to get admin phone number');
        }

        const adminPhone = settings.setting_value;
        if (!adminPhone) {
            console.warn('No admin phone number configured');
            return;
        }

        // Call your SMS API endpoint
        const response = await fetch('/api/send-sms', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                to: adminPhone,
                message: `Late Check-in Alert: ${employeeName} checked in at ${checkInTime}`,
            }),
        });

        if (!response.ok) {
            throw new Error('Failed to send SMS notification');
        }

        console.log('SMS notification sent successfully');
    } catch (error) {
        console.error('Error sending SMS notification:', error);
    }
}; 