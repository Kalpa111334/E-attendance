import React, { useState } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Button,
    Stack,
    ToggleButton,
    ToggleButtonGroup,
    TextField,
    Alert,
    CircularProgress,
    alpha,
    useTheme,
    Avatar,
    Paper,
} from '@mui/material';
import {
    PictureAsPdf as PdfIcon,
    CalendarToday as CalendarIcon,
    DateRange as DateRangeIcon,
} from '@mui/icons-material';
import { supabase } from '../config/supabase';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import AttendanceTable from './AttendanceTable';
import { hexToRgb } from '@mui/material';

interface AutoTableOptions {
    head: string[][];
    body: any[][];
    startY?: number;
    styles?: any;
    headStyles?: any;
    alternateRowStyles?: any;
    margin?: { top: number };
}

type ReportType = 'daily' | 'weekly' | 'monthly';

interface AttendanceRecord {
    employee_id: string;
    first_name: string;
    last_name: string;
    department: string;
    scan_time: string;
}

const AttendanceReport: React.FC = () => {
    const theme = useTheme();
    const [reportType, setReportType] = useState<ReportType>('daily');
    const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);

    const generateDateRange = () => {
        const date = new Date(selectedDate);
        switch (reportType) {
            case 'daily':
                return {
                    start: format(date, 'yyyy-MM-dd'),
                    end: format(date, 'yyyy-MM-dd'),
                    title: format(date, 'MMMM dd, yyyy')
                };
            case 'weekly':
                return {
                    start: format(startOfWeek(date), 'yyyy-MM-dd'),
                    end: format(endOfWeek(date), 'yyyy-MM-dd'),
                    title: `Week of ${format(startOfWeek(date), 'MMMM dd')} - ${format(endOfWeek(date), 'MMMM dd, yyyy')}`
                };
            case 'monthly':
                return {
                    start: format(startOfMonth(date), 'yyyy-MM-dd'),
                    end: format(endOfMonth(date), 'yyyy-MM-dd'),
                    title: format(date, 'MMMM yyyy')
                };
        }
    };

    const fetchAttendanceRecords = async () => {
        try {
            setLoading(true);
            setError(null);

            const dateRange = generateDateRange();
            
            const { data: attendance, error: fetchError } = await supabase
                .from('scans')
                .select(`
                    employee_id,
                    employees (
                        first_name,
                        last_name,
                        department
                    ),
                    created_at
                `)
                .gte('created_at', dateRange.start)
                .lte('created_at', dateRange.end)
                .order('created_at', { ascending: true });

            if (fetchError) throw fetchError;
            setAttendanceRecords(attendance || []);

        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const generatePDF = async () => {
        try {
            setLoading(true);
            setError(null);

            const dateRange = generateDateRange();
            
            // Format data for table
            const tableData = attendanceRecords.map((record: any) => [
                record.employee_id,
                `${record.employees.first_name} ${record.employees.last_name}`,
                record.employees.department,
                format(new Date(record.created_at), 'MMM dd, yyyy hh:mm a')
            ]);

            // Create PDF document with 'p' (portrait) orientation
            const doc = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });
            
            // Add header
            doc.setFontSize(20);
            const pageWidth = doc.internal.pageSize.width;
            doc.text('Attendance Report', pageWidth / 2, 15, { align: 'center' });
            doc.setFontSize(12);
            doc.text(dateRange.title, pageWidth / 2, 25, { align: 'center' });

            // Add company logo or name
            doc.setFontSize(16);
            doc.text('Your Company Name', pageWidth / 2, 35, { align: 'center' });

            // Add table
            autoTable(doc, {
                head: [['Employee ID', 'Name', 'Department', 'Scan Time']],
                body: tableData,
                startY: 45,
                styles: {
                    fontSize: 10,
                    cellPadding: 5,
                },
                headStyles: {
                    fillColor: [71, 71, 71],
                    textColor: 255,
                    fontStyle: 'bold',
                },
                alternateRowStyles: {
                    fillColor: [240, 240, 240],
                },
                margin: { top: 45 },
            });

            // Add footer
            const pageCount = (doc.internal as any).getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(8);
                doc.text(
                    `Generated on ${format(new Date(), 'MMM dd, yyyy hh:mm a')} - Page ${i} of ${pageCount}`,
                    (doc.internal as any).pageSize.getWidth() / 2,
                    (doc.internal as any).pageSize.getHeight() - 10,
                    { align: 'center' }
                );
            }

            // Save the PDF
            doc.save(`attendance-report-${dateRange.start}-${dateRange.end}.pdf`);

        } catch (err: any) {
            console.error('PDF Generation Error:', err);
            setError(err.message || 'Failed to generate PDF');
        } finally {
            setLoading(false);
        }
    };

    // Fetch records when date or report type changes
    React.useEffect(() => {
        fetchAttendanceRecords();
    }, [selectedDate, reportType]);

    const dateRange = generateDateRange();

    return (
        <Box sx={{ py: 4 }}>
            <Card
                sx={{
                    position: 'relative',
                    overflow: 'visible',
                    borderRadius: 3,
                    boxShadow: theme => `0 8px 32px ${alpha(theme.palette.primary.main, 0.1)}`,
                    '&::before': {
                        content: '""',
                        position: 'absolute',
                        top: -10,
                        left: -10,
                        right: -10,
                        bottom: -10,
                        background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(theme.palette.secondary.main, 0.1)} 100%)`,
                        borderRadius: '30px',
                        zIndex: -1,
                    },
                }}
            >
                <CardContent sx={{ p: 4 }}>
                    <Stack spacing={4}>
                        <Box sx={{ textAlign: 'center' }}>
                            <Avatar
                                sx={{
                                    width: 80,
                                    height: 80,
                                    bgcolor: theme => alpha(theme.palette.primary.main, 0.1),
                                    color: 'primary.main',
                                    mx: 'auto',
                                    mb: 2,
                                    p: 2,
                                }}
                            >
                                <PdfIcon sx={{ fontSize: 40 }} />
                            </Avatar>
                            <Typography
                                variant="h4"
                                sx={{
                                    fontWeight: 700,
                                    mb: 1,
                                    background: theme => `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                }}
                            >
                                Attendance Report
                            </Typography>
                            <Typography color="text.secondary" sx={{ mb: 3 }}>
                                Generate detailed attendance reports in PDF format
                            </Typography>
                        </Box>

                        <Paper
                            elevation={0}
                            sx={{
                                p: 3,
                                bgcolor: theme => alpha(theme.palette.background.paper, 0.7),
                                backdropFilter: 'blur(20px)',
                                borderRadius: 2,
                                border: theme => `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                            }}
                        >
                            <Stack spacing={3}>
                                <ToggleButtonGroup
                                    value={reportType}
                                    exclusive
                                    onChange={(e, value) => value && setReportType(value)}
                                    fullWidth
                                    sx={{
                                        '& .MuiToggleButton-root': {
                                            border: '1px solid',
                                            borderColor: 'divider',
                                            py: 1.5,
                                            '&.Mui-selected': {
                                                background: theme => `linear-gradient(45deg, ${alpha(theme.palette.primary.main, 0.1)}, ${alpha(theme.palette.secondary.main, 0.1)})`,
                                                borderColor: 'primary.main',
                                            },
                                        },
                                    }}
                                >
                                    <ToggleButton value="daily">
                                        <CalendarIcon sx={{ mr: 1 }} />
                                        Daily
                                    </ToggleButton>
                                    <ToggleButton value="weekly">
                                        <DateRangeIcon sx={{ mr: 1 }} />
                                        Weekly
                                    </ToggleButton>
                                    <ToggleButton value="monthly">
                                        <DateRangeIcon sx={{ mr: 1 }} />
                                        Monthly
                                    </ToggleButton>
                                </ToggleButtonGroup>

                                <TextField
                                    type="date"
                                    value={selectedDate}
                                    onChange={(e) => setSelectedDate(e.target.value)}
                                    fullWidth
                                    sx={{
                                        '& .MuiOutlinedInput-root': {
                                            borderRadius: 2,
                                            '&:hover fieldset': {
                                                borderColor: 'primary.main',
                                            },
                                        },
                                    }}
                                />

                                {error && (
                                    <Alert 
                                        severity="error" 
                                        sx={{ 
                                            borderRadius: 2,
                                            boxShadow: theme => `0 4px 12px ${alpha(theme.palette.error.main, 0.1)}`,
                                        }}
                                    >
                                        {error}
                                    </Alert>
                                )}

                                <Button
                                    variant="contained"
                                    startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <PdfIcon />}
                                    onClick={generatePDF}
                                    disabled={loading || attendanceRecords.length === 0}
                                    size="large"
                                    sx={{
                                        py: 1.5,
                                        background: theme => `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                                        boxShadow: theme => `0 4px 12px ${alpha(theme.palette.primary.main, 0.3)}`,
                                        transition: 'all 0.2s ease-in-out',
                                        '&:hover': {
                                            transform: 'translateY(-2px)',
                                            boxShadow: theme => `0 6px 16px ${alpha(theme.palette.primary.main, 0.4)}`,
                                        },
                                    }}
                                >
                                    {loading ? 'Generating Report...' : 'Generate PDF Report'}
                                </Button>
                            </Stack>
                        </Paper>

                        {/* Add the AttendanceTable component */}
                        {attendanceRecords.length > 0 ? (
                            <AttendanceTable 
                                records={attendanceRecords} 
                                title={`Attendance Records - ${dateRange.title}`} 
                            />
                        ) : !loading && !error && (
                            <Typography 
                                color="text.secondary" 
                                textAlign="center"
                                sx={{ mt: 2 }}
                            >
                                No attendance records found for the selected period
                            </Typography>
                        )}
                    </Stack>
                </CardContent>
            </Card>
        </Box>
    );
};

export default AttendanceReport; 