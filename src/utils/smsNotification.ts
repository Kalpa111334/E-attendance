import { supabase } from '../config/supabase';

interface AdminNotification {
    admin_id: string;
    phone_number: string;
}

export async function sendLateCheckInNotification(
    employeeId: string,
    scanTime: string,
    minutesLate: number
) {
    try {
        // Get employee details
        const { data: employee, error: employeeError } = await supabase
            .from('employees')
            .select('first_name, last_name, department')
            .eq('employee_id', employeeId)
            .single();

        if (employeeError) throw employeeError;

        // Get admin notification settings
        const { data: adminSettings, error: settingsError } = await supabase
            .from('admin_notification_settings')
            .select('admin_id, phone_number')
            .eq('notify_on_late', true);

        if (settingsError) throw settingsError;

        // Format the message
        const message = `Late Check-in Alert:\n${employee.first_name} ${employee.last_name} (${employeeId}) from ${employee.department} checked in ${minutesLate} minutes late at ${new Date(scanTime).toLocaleTimeString()}.`;

        // Send SMS to each admin
        const notifications = adminSettings.map(async (admin: AdminNotification) => {
            try {
                const response = await fetch('/api/send-sms', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        to: admin.phone_number,
                        message: message,
                    }),
                });

                if (!response.ok) {
                    throw new Error(`Failed to send SMS to ${admin.phone_number}`);
                }

                return true;
            } catch (error) {
                console.error(`Failed to send notification to admin ${admin.admin_id}:`, error);
                return false;
            }
        });

        await Promise.all(notifications);
    } catch (error) {
        console.error('Error sending late check-in notification:', error);
        throw error;
    }
} 