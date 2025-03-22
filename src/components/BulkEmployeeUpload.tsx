import React, { useState } from 'react';
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
    Stack,
    Tooltip,
    IconButton,
    Divider,
    Chip,
} from '@mui/material';
import {
    CloudUpload as UploadIcon,
    CheckCircle as SuccessIcon,
    Error as ErrorIcon,
    Description as FileIcon,
    TableChart as ExcelIcon,
    Download as DownloadIcon,
} from '@mui/icons-material';
import { supabase } from '../config/supabase';
import type { EmployeeFormData } from '../types/employee';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { saveAs } from 'file-saver';
import { toast } from 'react-toastify';

interface ProcessingResult {
    success: boolean;
    employee: {
        first_name: string;
        last_name: string;
        email: string;
    };
    message: string;
    error?: string;
}

const BulkEmployeeUpload: React.FC = () => {
    const [processing, setProcessing] = useState(false);
    const [results, setResults] = useState<ProcessingResult[]>([]);
    const [error, setError] = useState<string | null>(null);
    const theme = useTheme();

    const validateEmployeeData = (data: any): EmployeeFormData | null => {
        const requiredFields = ['first_name', 'last_name', 'email', 'department', 'position'];
        const employee: EmployeeFormData = {
            first_name: data.first_name || data['First Name'] || '',
            last_name: data.last_name || data['Last Name'] || '',
            email: data.email || data['Email'] || '',
            department: data.department || data['Department'] || '',
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

    const downloadTemplate = () => {
        const template = XLSX.utils.book_new();
        const templateData = [
            {
                'First Name': '',
                'Last Name': '',
                'Email': '',
                'Department': '',
                'Position': '',
            }
        ];
        const ws = XLSX.utils.json_to_sheet(templateData);
        XLSX.utils.book_append_sheet(template, ws, 'Template');
        XLSX.writeFile(template, 'employee_upload_template.xlsx');
    };

    const uploadEmployees = async (employees: EmployeeFormData[]) => {
        const results: ProcessingResult[] = [];
        const batchSize = 50; // Process 50 employees at a time
        
        for (let i = 0; i < employees.length; i += batchSize) {
            const batch = employees.slice(i, i + batchSize);
            try {
                const { data, error } = await supabase
                    .from('employees')
                    .insert(batch)
                    .select();

                if (error) throw error;

                batch.forEach((employee, index) => {
                    results.push({
                        success: true,
                        employee: {
                            first_name: employee.first_name,
                            last_name: employee.last_name,
                            email: employee.email,
                        },
                        message: `Successfully added ${employee.first_name} ${employee.last_name}`,
                    });
                });
            } catch (error: any) {
                batch.forEach(employee => {
                    results.push({
                        success: false,
                        employee: {
                            first_name: employee.first_name,
                            last_name: employee.last_name,
                            email: employee.email,
                        },
                        message: `Failed to add ${employee.first_name} ${employee.last_name}`,
                        error: error.message,
                    });
                });
            }
        }

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

            const results = await uploadEmployees(employees);
            setResults(results);
            
            const successCount = results.filter(r => r.success).length;
            if (successCount > 0) {
                toast.success(`Successfully added ${successCount} employees`);
            }
            if (successCount < employees.length) {
                toast.error(`Failed to add ${employees.length - successCount} employees`);
            }
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
                        Bulk Employee Upload
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
                            <Stack spacing={2} alignItems="center">
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
                                            background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                                        }}
                                    >
                                        Upload File
                                    </Button>
                                </label>

                                <Button
                                    variant="outlined"
                                    startIcon={<DownloadIcon />}
                                    onClick={downloadTemplate}
                                    sx={{ mt: 1 }}
                                >
                                    Download Template
                                </Button>

                                <Typography variant="body2" color="textSecondary">
                                    Upload XLSX or CSV file containing employee data
                                </Typography>

                                <Stack direction="row" spacing={1}>
                                    <Chip
                                        icon={<ExcelIcon />}
                                        label="Excel"
                                        color="success"
                                        variant="outlined"
                                        size="small"
                                    />
                                    <Chip
                                        icon={<FileIcon />}
                                        label="CSV"
                                        color="primary"
                                        variant="outlined"
                                        size="small"
                                    />
                                </Stack>
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
                                    maxHeight: 400,
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

export default BulkEmployeeUpload; 