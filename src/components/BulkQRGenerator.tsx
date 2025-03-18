import React, { useState, useCallback } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    TextField,
    Button,
    Alert,
    CircularProgress,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    Paper,
    useTheme,
    alpha,
    Fade,
    Stack,
    Tooltip,
} from '@mui/material';
import {
    CloudUpload as UploadIcon,
    CheckCircle as SuccessIcon,
    Error as ErrorIcon,
    FileCopy as CopyIcon,
    Download as DownloadIcon,
} from '@mui/icons-material';
import { supabase } from '../config/supabase';
import type { EmployeeFormData } from '../types/employee';
import QRCode from 'qrcode';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { toast } from 'react-toastify';

interface ProcessingResult {
    success: boolean;
    employee_id: string;
    message: string;
    error?: string;
}

const BulkQRGenerator: React.FC = () => {
    const [csvContent, setCsvContent] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [results, setResults] = useState<ProcessingResult[]>([]);
    const theme = useTheme();

    const sampleCSV = `First Name,Last Name,Email,Department,Position
John,Doe,john@example.com,Engineering,Developer
Jane,Smith,jane@example.com,Marketing,Manager`;

    const copyExample = () => {
        navigator.clipboard.writeText(sampleCSV);
        toast.success('Example CSV copied to clipboard');
    };

    const downloadExample = () => {
        const blob = new Blob([sampleCSV], { type: 'text/csv' });
        saveAs(blob, 'example.csv');
    };

    const validateEmail = (email: string): boolean => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    const parseCSV = useCallback((content: string): EmployeeFormData[] => {
        try {
            const lines = content.trim().split('\n').filter(line => line.trim() !== '');
            
            if (lines.length < 2) {
                throw new Error('CSV must contain both a header row and at least one data row');
            }

            const headers = lines[0].split(',').map(h => 
                h.trim().toLowerCase().replace(/[\s_-]/g, '')
            );

            const headerMappings: Record<string, string> = {
                'firstname': 'first_name',
                'first': 'first_name',
                'fname': 'first_name',
                'givenname': 'first_name',
                'lastname': 'last_name',
                'last': 'last_name',
                'lname': 'last_name',
                'surname': 'last_name',
                'email': 'email',
                'emailaddress': 'email',
                'mail': 'email',
                'department': 'department',
                'dept': 'department',
                'division': 'department',
                'position': 'position',
                'title': 'position',
                'role': 'position',
            };

            const normalizedHeaders = headers.map(h => headerMappings[h] || h);
            const requiredHeaders = ['first_name', 'last_name', 'email', 'department', 'position'];
            
            const missingHeaders = requiredHeaders.filter(h => !normalizedHeaders.includes(h));
            if (missingHeaders.length > 0) {
                throw new Error(`Missing required headers: ${missingHeaders.join(', ')}`);
            }

            return lines.slice(1).map((line, index) => {
                const values = line.split(',').map(v => v.trim());
                
                if (values.length !== headers.length) {
                    throw new Error(`Row ${index + 2} has incorrect number of values`);
                }

                const employee: any = {};
                normalizedHeaders.forEach((header, i) => {
                    if (requiredHeaders.includes(header)) {
                        employee[header] = values[i];
                    }
                });

                // Validate data
                if (!employee.first_name || !employee.last_name) {
                    throw new Error(`Row ${index + 2}: Name fields cannot be empty`);
                }
                if (!validateEmail(employee.email)) {
                    throw new Error(`Row ${index + 2}: Invalid email format`);
                }
                if (!employee.department || !employee.position) {
                    throw new Error(`Row ${index + 2}: Department and Position are required`);
                }

                return employee;
            });
        } catch (error) {
            throw new Error(`CSV parsing error: ${error.message}`);
        }
    }, []);

    const handleSubmit = async () => {
        try {
            setLoading(true);
            setError(null);
            setResults([]);

            const employees = parseCSV(csvContent);
            const results: ProcessingResult[] = [];
            const zip = new JSZip();

            for (const employeeData of employees) {
                try {
                    // Generate unique employee_id
                    const employee_id = `EMP${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
                    const fullEmployeeData = {
                        ...employeeData,
                        employee_id,
                        created_at: new Date().toISOString()
                    };

                    const { data, error: insertError } = await supabase
                        .from('employees')
                        .insert([fullEmployeeData])
                        .select()
                        .single();

                    if (insertError) throw insertError;

                    // Generate QR code
                    const qrData = JSON.stringify({
                        id: employee_id,
                        name: `${employeeData.first_name} ${employeeData.last_name}`,
                        email: employeeData.email
                    });

                    const qrCodeDataUrl = await QRCode.toDataURL(qrData, {
                        errorCorrectionLevel: 'H',
                        margin: 1,
                        width: 300,
                        color: {
                            dark: theme.palette.primary.main,
                            light: '#FFFFFF'
                        }
                    });

                    const base64Data = qrCodeDataUrl.split(',')[1];
                    zip.file(`${employee_id}-qr.png`, base64Data, { base64: true });

                    results.push({
                        success: true,
                        employee_id,
                        message: `Successfully created: ${employeeData.first_name} ${employeeData.last_name}`
                    });
                } catch (err) {
                    results.push({
                        success: false,
                        employee_id: '',
                        message: `Failed: ${employeeData.first_name} ${employeeData.last_name}`,
                        error: err.message
                    });
                }
            }

            setResults(results);

            // Download QR codes if any successful entries
            const successfulResults = results.filter(r => r.success);
            if (successfulResults.length > 0) {
                const blob = await zip.generateAsync({ type: 'blob' });
                saveAs(blob, `qr-codes-${new Date().toISOString()}.zip`);
                toast.success(`Generated ${successfulResults.length} QR codes`);
            }

        } catch (err) {
            setError(err.message);
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box sx={{
            minHeight: '100vh',
            background: `linear-gradient(135deg, 
                ${alpha(theme.palette.primary.light, 0.15)} 0%, 
                ${alpha(theme.palette.secondary.light, 0.15)} 50%,
                ${alpha(theme.palette.primary.light, 0.15)} 100%)`,
            py: 4,
            px: { xs: 2, md: 4 },
        }}>
            <Fade in timeout={800}>
                <Card sx={{
                    maxWidth: 1200,
                    margin: '0 auto',
                    backdropFilter: 'blur(10px)',
                    background: alpha(theme.palette.background.paper, 0.8),
                    borderRadius: 4,
                    boxShadow: theme.shadows[20],
                }}>
                    <CardContent sx={{ p: { xs: 2, md: 4 } }}>
                        <Typography 
                            variant="h5" 
                            sx={{
                                mb: 3,
                                background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                fontWeight: 700,
                            }}
                        >
                            Bulk QR Code Generator
                        </Typography>

                        <Alert 
                            severity="info" 
                            sx={{ 
                                mb: 3,
                                '& .MuiAlert-message': { width: '100%' }
                            }}
                        >
                            <Stack 
                                direction="row" 
                                justifyContent="space-between" 
                                alignItems="center"
                                spacing={2}
                            >
                                <Box>
                                    <Typography variant="subtitle2" gutterBottom>
                                        CSV Format Example:
                                    </Typography>
                                    <Box component="pre" sx={{ 
                                        bgcolor: 'background.paper',
                                        p: 1,
                                        borderRadius: 1,
                                        fontSize: '0.875rem',
                                        overflowX: 'auto'
                                    }}>
                                        {sampleCSV}
                                    </Box>
                                </Box>
                                <Stack direction="row" spacing={1}>
                                    <Tooltip title="Copy example">
                                        <Button
                                            size="small"
                                            startIcon={<CopyIcon />}
                                            onClick={copyExample}
                                        >
                                            Copy
                                        </Button>
                                    </Tooltip>
                                    <Tooltip title="Download example">
                                        <Button
                                            size="small"
                                            startIcon={<DownloadIcon />}
                                            onClick={downloadExample}
                                        >
                                            Download
                                        </Button>
                                    </Tooltip>
                                </Stack>
                            </Stack>
                        </Alert>

                        {error && (
                            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                                {error}
                            </Alert>
                        )}

                        <TextField
                            multiline
                            rows={10}
                            fullWidth
                            placeholder="Paste your CSV content here..."
                            value={csvContent}
                            onChange={(e) => setCsvContent(e.target.value)}
                            variant="outlined"
                            sx={{ mb: 2 }}
                        />

                        <Button
                            variant="contained"
                            onClick={handleSubmit}
                            disabled={loading || !csvContent.trim()}
                            startIcon={loading ? <CircularProgress size={20} /> : <UploadIcon />}
                            sx={{
                                background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                                '&:hover': {
                                    background: `linear-gradient(45deg, ${theme.palette.primary.dark}, ${theme.palette.secondary.dark})`,
                                }
                            }}
                        >
                            {loading ? 'Processing...' : 'Generate QR Codes'}
                        </Button>

                        {results.length > 0 && (
                            <Paper sx={{ mt: 3, p: 2 }}>
                                <Typography variant="h6" gutterBottom>
                                    Results ({results.filter(r => r.success).length} successful, {results.filter(r => !r.success).length} failed)
                                </Typography>
                                <List>
                                    {results.map((result, index) => (
                                        <ListItem key={index}>
                                            <ListItemIcon>
                                                {result.success ? (
                                                    <SuccessIcon color="success" />
                                                ) : (
                                                    <ErrorIcon color="error" />
                                                )}
                                            </ListItemIcon>
                                            <ListItemText 
                                                primary={result.message}
                                                secondary={result.error}
                                            />
                                        </ListItem>
                                    ))}
                                </List>
                            </Paper>
                        )}

                        <Box sx={{ 
                            mt: 4, 
                            pt: 2, 
                            borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                            textAlign: 'center' 
                        }}>
                            <Typography
                                variant="subtitle2"
                                sx={{
                                    background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                    fontWeight: 700,
                                    letterSpacing: 1,
                                    animation: 'pulse 2s infinite',
                                    '@keyframes pulse': {
                                        '0%, 100%': {
                                            opacity: 1,
                                        },
                                        '50%': {
                                            opacity: 0.7,
                                        },
                                    },
                                }}
                            >
                                POWERED BY: MIDIZ
                            </Typography>
                        </Box>
                    </CardContent>
                </Card>
            </Fade>
        </Box>
    );
};

export default BulkQRGenerator; 