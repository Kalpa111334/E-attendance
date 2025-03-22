import { supabase } from '../config/supabase';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { sendNotification, MessageType } from './whatsappNotification';

interface AttendanceRecord {
    id: string;
    employee_id: string;
    check_in: string;
    check_out: string | null;
    status: string;
    employee: {
        name: string;
        department: string;
    };
}

interface AttendanceSummary {
    totalEmployees: number;
    present: number;
    absent: number;
    late: number;
    earlyLeave: number;
    departments: {
        [key: string]: {
            total: number;
            present: number;
            absent: number;
            late: number;
            earlyLeave: number;
        };
    };
    lateEmployees: Array<{
        name: string;
        department: string;
        checkInTime: string;
    }>;
    absentEmployees: Array<{
        name: string;
        department: string;
    }>;
    earlyLeaveEmployees: Array<{
        name: string;
        department: string;
        checkOutTime: string;
    }>;
}

export const generateAttendanceSummary = async (date: Date = new Date()): Promise<AttendanceSummary> => {
    try {
        // Get all employees
        const { data: employees, error: employeesError } = await supabase
            .from('employees')
            .select('id, name, department')
            .eq('status', 'active');

        if (employeesError) throw new Error('Failed to fetch employees');

        // Get attendance records for the specified date
        const { data: records, error: recordsError } = await supabase
            .from('attendance')
            .select(`
                id,
                employee_id,
                check_in,
                check_out,
                status,
                employee:employees (
                    name,
                    department
                )
            `)
            .gte('check_in', startOfDay(date).toISOString())
            .lte('check_in', endOfDay(date).toISOString());

        if (recordsError) throw new Error('Failed to fetch attendance records');

        const summary: AttendanceSummary = {
            totalEmployees: employees?.length || 0,
            present: 0,
            absent: 0,
            late: 0,
            earlyLeave: 0,
            departments: {},
            lateEmployees: [],
            absentEmployees: [],
            earlyLeaveEmployees: []
        };

        // Initialize department summaries
        employees?.forEach(emp => {
            if (!summary.departments[emp.department]) {
                summary.departments[emp.department] = {
                    total: 0,
                    present: 0,
                    absent: 0,
                    late: 0,
                    earlyLeave: 0
                };
            }
            summary.departments[emp.department].total++;
        });

        // Process attendance records
        records?.forEach((record: any) => {
            const dept = record.employee?.department;
            if (!dept) return; // Skip if department is not available
            
            if (record.status === 'present') {
                summary.present++;
                summary.departments[dept].present++;
            }
            
            if (record.status === 'late') {
                summary.late++;
                summary.departments[dept].late++;
                summary.lateEmployees.push({
                    name: record.employee.name,
                    department: dept,
                    checkInTime: format(new Date(record.check_in), 'hh:mm a')
                });
            }
            
            if (record.status === 'early_leave' && record.check_out) {
                summary.earlyLeave++;
                summary.departments[dept].earlyLeave++;
                summary.earlyLeaveEmployees.push({
                    name: record.employee.name,
                    department: dept,
                    checkOutTime: format(new Date(record.check_out), 'hh:mm a')
                });
            }
        });

        // Calculate absences
        employees?.forEach(emp => {
            const isPresent = records?.some(rec => rec.employee_id === emp.id);
            if (!isPresent) {
                summary.absent++;
                summary.departments[emp.department].absent++;
                summary.absentEmployees.push({
                    name: emp.name,
                    department: emp.department
                });
            }
        });

        return summary;
    } catch (error) {
        console.error('Error generating attendance summary:', error);
        throw error;
    }
};

export const formatAttendanceSummary = (summary: AttendanceSummary, date: Date = new Date()): string => {
    const dateStr = format(date, 'PPP');
    let message = `📊 Daily Attendance Report\n`;
    message += `📅 ${dateStr}\n`;
    message += `━━━━━━━━━━━━━━━\n\n`;
    
    message += `📈 Overall Summary:\n`;
    message += `• Total Employees: ${summary.totalEmployees}\n`;
    message += `• Present: ${summary.present}\n`;
    message += `• Absent: ${summary.absent}\n`;
    message += `• Late: ${summary.late}\n`;
    message += `• Early Leave: ${summary.earlyLeave}\n\n`;

    message += `🏢 Department Summary:\n`;
    Object.entries(summary.departments).forEach(([dept, stats]) => {
        message += `\n${dept}:\n`;
        message += `• Present: ${stats.present}/${stats.total}\n`;
        message += `• Absent: ${stats.absent}\n`;
        message += `• Late: ${stats.late}\n`;
        message += `• Early Leave: ${stats.earlyLeave}\n`;
    });

    if (summary.lateEmployees.length > 0) {
        message += `\n⏰ Late Arrivals:\n`;
        summary.lateEmployees.forEach(emp => {
            message += `• ${emp.name} (${emp.department}) - ${emp.checkInTime}\n`;
        });
    }

    if (summary.earlyLeaveEmployees.length > 0) {
        message += `\n🚶 Early Departures:\n`;
        summary.earlyLeaveEmployees.forEach(emp => {
            message += `• ${emp.name} (${emp.department}) - ${emp.checkOutTime}\n`;
        });
    }

    if (summary.absentEmployees.length > 0) {
        message += `\n❌ Absent Employees:\n`;
        summary.absentEmployees.forEach(emp => {
            message += `• ${emp.name} (${emp.department})\n`;
        });
    }

    message += `\n━━━━━━━━━━━━━━━\n`;
    message += `Generated by Digital ID System`;

    return message;
};

export const sendDailyAttendanceReport = async (date: Date = new Date()): Promise<void> => {
    try {
        const summary = await generateAttendanceSummary(date);
        const message = formatAttendanceSummary(summary, date);

        // Get admin WhatsApp number from settings
        const { data: settings, error: settingsError } = await supabase
            .from('company_settings')
            .select('setting_value')
            .eq('setting_key', 'admin_whatsapp')
            .single();

        if (settingsError) {
            throw new Error('Failed to get admin WhatsApp number');
        }

        if (!settings?.setting_value) {
            throw new Error('Admin WhatsApp number not configured');
        }

        // Send the report
        await sendNotification({
            employeeName: 'System',
            customMessage: message,
            isAttendanceReport: true,
            phoneNumber: settings.setting_value,
            messageType: MessageType.WHATSAPP
        });

        // Log the successful report
        await supabase.from('automation_logs').insert({
            type: 'daily_attendance_report',
            status: 'success',
            details: {
                date: format(date, 'yyyy-MM-dd'),
                summary: {
                    total: summary.totalEmployees,
                    present: summary.present,
                    absent: summary.absent,
                    late: summary.late,
                    earlyLeave: summary.earlyLeave
                }
            }
        });

    } catch (error) {
        console.error('Error sending daily attendance report:', error);
        
        // Log the failed attempt
        await supabase.from('automation_logs').insert({
            type: 'daily_attendance_report',
            status: 'failed',
            details: {
                date: format(date, 'yyyy-MM-dd'),
                error: error instanceof Error ? error.message : 'Unknown error'
            }
        });

        throw error;
    }
}; 