import { sendDailyAttendanceReport } from '../utils/attendanceAutomation';
import { supabase } from '../config/supabase';

const REPORT_SCHEDULE = {
    hour: 18, // 6 PM
    minute: 0
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const isTimeToSendReport = (now: Date): boolean => {
    return now.getHours() === REPORT_SCHEDULE.hour && 
           now.getMinutes() === REPORT_SCHEDULE.minute;
};

const hasReportBeenSentToday = async (): Promise<boolean> => {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    const { data, error } = await supabase
        .from('automation_logs')
        .select('id')
        .eq('type', 'daily_attendance_report')
        .eq('status', 'success')
        .gte('created_at', startOfDay.toISOString())
        .limit(1);

    if (error) {
        console.error('Error checking report status:', error);
        return false;
    }

    return data && data.length > 0;
};

export const startAttendanceReportWorker = async (): Promise<void> => {
    console.log('Starting attendance report worker...');
    
    while (true) {
        try {
            const now = new Date();
            
            if (isTimeToSendReport(now) && !(await hasReportBeenSentToday())) {
                console.log('Sending daily attendance report...');
                await sendDailyAttendanceReport(now);
                console.log('Daily attendance report sent successfully.');
                
                // Wait until the next minute to avoid duplicate sends
                await sleep(60000);
            }
            
            // Check every minute
            await sleep(60000);
        } catch (error) {
            console.error('Error in attendance report worker:', error);
            // Wait before retrying
            await sleep(300000); // 5 minutes
        }
    }
}; 