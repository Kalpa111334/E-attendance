import React, { useState, useCallback } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
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
    IconButton,
    Divider,
} from '@mui/material';
import {
    CloudUpload as UploadIcon,
    CheckCircle as SuccessIcon,
    Error as ErrorIcon,
    FileCopy as CopyIcon,
    Download as DownloadIcon,
    Description as FileIcon,
    TableChart as ExcelIcon,
} from '@mui/icons-material';
import { supabase } from '../config/supabase';
import type { EmployeeFormData } from '../types/employee';
import QRCode from 'qrcode';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { toast } from 'react-toastify';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';

interface ProcessingResult {
    success: boolean;
    employee_id: string;
    message: string;
    error?: string;
}

const BulkQRGenerator: React.FC = () => {
    const [processing, setProcessing] = useState(false);
    const [results, setResults] = useState<ProcessingResult[]>([]);
    const [error, setError] = useState<string | null>(null);
    const theme = useTheme();

    const validateEmployeeData = (data: any): EmployeeFormData | null => {
        const requiredFields = ['first_name', 'last_name', 'email', 'department_id', 'position'];
        const employee: EmployeeFormData = {
            first_name: data.first_name || data['First Name'] || '',
            last_name: data.last_name || data['Last Name'] || '',
            email: data.email || data['Email'] || '',
            department_id: data.department_id || data['Department ID'] || '',
            position: data.position || data['Position'] || '',
        };

        // Check if all required fields are present
        for (const field of requiredFields) {
            if (!employee[field as keyof EmployeeFormData]) {
                return null;
            }
        }

        // Validate email format
        const emailRegex = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
        if (!emailRegex.test(employee.email)) {
            return null;
        }

        return employee;
    };

    const processExcelFile = (file: File): Promise<EmployeeFormData[]> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = e.target?.result;
                    const workbook = XLSX.read(data, { type: 'binary' });
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];
                    const jsonData = XLSX.utils.sheet_to_json(worksheet);
                    
                    const validEmployees: EmployeeFormData[] = [];
                    for (const row of jsonData) {
                        const employee = validateEmployeeData(row);
                        if (employee) {
                            validEmployees.push(employee);
                        }
                    }
                    resolve(validEmployees);
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = (error) => reject(error);
            reader.readAsBinaryString(file);
        });
    };

    const processCsvFile = (file: File): Promise<EmployeeFormData[]> => {
        return new Promise((resolve, reject) => {
            Papa.parse<Record<string, string>>(file, {
                header: true,
                complete: (results: Papa.ParseResult<Record<string, string>>) => {
                    const validEmployees: EmployeeFormData[] = [];
                    for (const row of results.data) {
                        const employee = validateEmployeeData(row);
                        if (employee) {
                            validEmployees.push(employee);
                        }
                    }
                    resolve(validEmployees);
                },
                error: (error: Error, file: File) => reject(error),
            });
        });
    };

    const generateQRCodes = async (employees: EmployeeFormData[]) => {
            const results: ProcessingResult[] = [];
            const zip = new JSZip();
        const qrFolder = zip.folder("qr-codes");

        for (const employee of employees) {
            try {
                // Insert employee into database
                const { data, error } = await supabase
                        .from('employees')
                    .insert([employee])
                        .select()
                        .single();

                if (error) throw error;

                    // Generate QR code
                const qrCode = await QRCode.toDataURL(data.employee_id);
                const qrData = qrCode.split(',')[1];
                qrFolder?.file(`${data.employee_id}.png`, qrData, { base64: true });

                    results.push({
                        success: true,
                    employee_id: data.employee_id,
                    message: `Successfully generated QR code for ${employee.first_name} ${employee.last_name}`,
                    });
            } catch (error: any) {
                    results.push({
                        success: false,
                        employee_id: '',
                    message: `Failed to process ${employee.first_name} ${employee.last_name}`,
                    error: error.message,
                    });
                }
            }

        // Generate and download zip file
        const content = await zip.generateAsync({ type: "blob" });
        saveAs(content, "employee-qr-codes.zip");

        return results;
    };

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setProcessing(true);
        setError(null);
        setResults([]);

        try {
            let employees: EmployeeFormData[] = [];
            
            if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
                employees = await processExcelFile(file);
            } else if (file.name.endsWith('.csv')) {
                employees = await processCsvFile(file);
            } else {
                throw new Error('Unsupported file format. Please upload an XLSX or CSV file.');
            }

            if (employees.length === 0) {
                throw new Error('No valid employee data found in the file.');
            }

            const results = await generateQRCodes(employees);
            setResults(results);
            toast.success(`Successfully processed ${results.filter(r => r.success).length} employees`);
        } catch (error: any) {
            setError(error.message);
            toast.error('Failed to process file');
        } finally {
            setProcessing(false);
        }
    };

    return (
        <Box sx={{ maxWidth: 800, mx: 'auto', mt: 4, p: 2 }}>
            <Card
                            sx={{
                    position: 'relative',
                    overflow: 'visible',
                    '&::before': {
                        content: '""',
                        position: 'absolute',
                        top: -10,
                        left: -10,
                        right: -10,
                        bottom: -10,
                        background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(theme.palette.secondary.main, 0.1)} 100%)`,
                        borderRadius: '20px',
                        zIndex: -1,
                    },
                }}
            >
                <CardContent>
                    <Typography variant="h5" gutterBottom sx={{
                        fontWeight: 700,
                                background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                    }}>
                        Bulk QR Code Generator
                    </Typography>

                    <Stack spacing={3} alignItems="center" sx={{ mt: 4 }}>
                        <Paper
                            elevation={0}
                            sx={{ 
                                p: 3,
                                width: '100%',
                                border: `2px dashed ${alpha(theme.palette.primary.main, 0.3)}`,
                                borderRadius: 2,
                                textAlign: 'center',
                                background: alpha(theme.palette.background.paper, 0.8),
                            }}
                        >
                            <input
                                type="file"
                                accept=".xlsx,.xls,.csv"
                                onChange={handleFileUpload}
                                style={{ display: 'none' }}
                                id="file-upload"
                            />
                            <label htmlFor="file-upload">
                                        <Button
                                    component="span"
                                    variant="contained"
                                    startIcon={<UploadIcon />}
                                    disabled={processing}
                                    sx={{
                                        mb: 2,
                                        background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                                    }}
                                >
                                    Upload File
                                        </Button>
                            </label>
                            <Typography variant="body2" color="textSecondary">
                                Upload XLSX or CSV file containing employee data
                            </Typography>
                            <Stack direction="row" spacing={2} justifyContent="center" sx={{ mt: 2 }}>
                                <Tooltip title="Excel file">
                                    <IconButton size="small">
                                        <ExcelIcon color="success" />
                                    </IconButton>
                                    </Tooltip>
                                <Tooltip title="CSV file">
                                    <IconButton size="small">
                                        <FileIcon color="primary" />
                                    </IconButton>
                                    </Tooltip>
                            </Stack>
                        </Paper>

                        {processing && (
                            <CircularProgress 
                                size={40}
                                sx={{
                                    color: theme.palette.primary.main,
                                }}
                            />
                        )}

                    {error && (
                            <Alert 
                                severity="error"
                                sx={{
                                    width: '100%',
                                    borderRadius: 2,
                                }}
                            >
                            {error}
                        </Alert>
                    )}

                        {results.length > 0 && (
                            <Paper
                            sx={{
                                    width: '100%',
                                    maxHeight: 300,
                                    overflow: 'auto',
                                    borderRadius: 2,
                                }}
                            >
                            <List>
                                {results.map((result, index) => (
                                        <React.Fragment key={index}>
                                            <ListItem>
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
                                                    secondaryTypographyProps={{
                                                        color: 'error',
                                                    }}
                                            />
                                    </ListItem>
                                            {index < results.length - 1 && <Divider />}
                                        </React.Fragment>
                                ))}
                            </List>
                        </Paper>
                    )}
                    </Stack>
                </CardContent>
            </Card>
        </Box>
    );
};

export default BulkQRGenerator; 