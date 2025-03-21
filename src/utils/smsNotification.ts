import { supabase } from '../config/supabase';
import { twilioClient, twilioFromNumber } from '../config/twilio';

interface SMSNotificationParams {
    employeeId: string;
    employeeName: string;
    scanTime: Date;
    isLate: boolean;
}

export const sendSMSNotification = async ({ employeeId, employeeName, scanTime, isLate }: SMSNotificationParams) => {
    try {
        // If Twilio is not configured, just log and return
        if (!twilioClient || !twilioFromNumber) {
            console.log('SMS Notification would be sent:', {
                employeeId,
                employeeName,
                scanTime,
                isLate
            });
            return;
        }

        // Get admin phone numbers
        const { data: admins, error: adminError } = await supabase
            .from('auth.users')
            .select('admin_phone')
            .not('admin_phone', 'is', null);

        if (adminError) {
            console.error('Error fetching admin phone numbers:', adminError);
            return;
        }

        // If no admin phone numbers found, log and return
        if (!admins || admins.length === 0) {
            console.log('No admin phone numbers configured');
            return;
        }

        // Format the message
        const formattedTime = scanTime.toLocaleTimeString();
        const message = isLate
            ? `LATE CHECK-IN ALERT: Employee ${employeeName} (${employeeId}) checked in late at ${formattedTime}`
            : `Employee ${employeeName} (${employeeId}) checked in at ${formattedTime}`;

        // Send SMS to each admin
        const smsPromises = admins.map(admin => 
            twilioClient.messages.create({
                body: message,
                to: admin.admin_phone,
                from: twilioFromNumber
            })
        );

        // Wait for all SMS to be sent
        await Promise.all(smsPromises);
        
        console.log('SMS Notifications sent successfully to:', admins.map(admin => admin.admin_phone));
    } catch (error) {
        console.error('Error sending SMS notification:', error);
    }
}; 