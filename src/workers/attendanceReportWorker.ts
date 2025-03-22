import { sendDailyAttendanceReport } from '../utils/attendanceAutomation';
import { supabase } from '../config/supabase';

// Configurable schedule
export const REPORT_SCHEDULE = {
    // Default to 6 PM
    DEFAULT_HOUR: 18,
    DEFAULT_MINUTE: 0,
    
    // Allow override through environment variables
    hour: Number(import.meta.env.VITE_REPORT_HOUR) || 18,
    minute: Number(import.meta.env.VITE_REPORT_MINUTE) || 0,
    
    // Retry settings
    MAX_RETRIES: 3,
    RETRY_DELAY: 5 * 60 * 1000, // 5 minutes
    CHECK_INTERVAL: 60 * 1000, // 1 minute
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const isTimeToSendReport = (now: Date): boolean => {
    return now.getHours() === REPORT_SCHEDULE.hour && 
           now.getMinutes() === REPORT_SCHEDULE.minute;
};

const hasReportBeenSentToday = async (): Promise<boolean> => {
    try {
        const today = new Date();
        const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        
        const { data, error } = await supabase
            .from('automation_logs')
            .select('id, created_at')
            .eq('type', 'daily_attendance_report')
            .eq('status', 'success')
            .gte('created_at', startOfDay.toISOString())
            .order('created_at', { ascending: false })
            .limit(1);

        if (error) {
            console.error('Error checking report status:', error);
            return false;
        }

        return data && data.length > 0;
    } catch (error) {
        console.error('Error in hasReportBeenSentToday:', error);
        return false;
    }
};

const sendReportWithRetry = async (retries = REPORT_SCHEDULE.MAX_RETRIES): Promise<boolean> => {
    try {
        await sendDailyAttendanceReport();
        console.log('Daily attendance report sent successfully');
        return true;
    } catch (error) {
        console.error(`Error sending report (attempts left: ${retries}):`, error);
        
        if (retries > 0) {
            console.log(`Retrying in ${REPORT_SCHEDULE.RETRY_DELAY / 1000} seconds...`);
            await sleep(REPORT_SCHEDULE.RETRY_DELAY);
            return sendReportWithRetry(retries - 1);
        }
        
        return false;
    }
};

export const startAttendanceReportWorker = async (): Promise<void> => {
    console.log(`Starting attendance report worker (scheduled for ${REPORT_SCHEDULE.hour}:${String(REPORT_SCHEDULE.minute).padStart(2, '0')})`);
    
    while (true) {
        try {
            const now = new Date();
            
            if (isTimeToSendReport(now) && !(await hasReportBeenSentToday())) {
                console.log('Initiating daily attendance report...');
                await sendReportWithRetry();
            }
            
            // Wait before next check
            await sleep(REPORT_SCHEDULE.CHECK_INTERVAL);
        } catch (error) {
            console.error('Error in attendance report worker:', error);
            // Wait before retrying
            await sleep(REPORT_SCHEDULE.RETRY_DELAY);
        }
    }
}; 