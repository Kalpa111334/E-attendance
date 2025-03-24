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
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Grid,
} from '@mui/material';
import {
    CloudUpload as UploadIcon,
    CheckCircle as SuccessIcon,
    Error as ErrorIcon,
    Description as FileIcon,
    TableChart as ExcelIcon,
    Download as DownloadIcon,
    Preview as PreviewIcon,
    Save as SaveIcon,
    Cancel as CancelIcon,
} from '@mui/icons-material';
import { supabase } from '../config/supabase';
import type { EmployeeFormData } from '../types/employee';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { saveAs } from 'file-saver';
import { toast } from 'react-toastify';

// Add departments constant
const DEPARTMENTS = [
    'IT',
    'HR',
    'Finance',
    'Marketing',
    'Operations',
    'Sales',
    'Engineering',
    'Customer Support',
    'Legal',
    'Research & Development'
];

const VALID_DEPARTMENTS = [
    'Administration',
    'Human Resources',
    'Finance',
    'IT',
    'Operations',
    'Transport Section',
    'Marketing',
    'Sales'
];

// Employee type definitions
interface EmployeeData {
    first_name: string;
    last_name: string;
    email: string;
    department: string;
    position: string;
}

interface ProcessingResult {
    success: boolean;
    employee: EmployeeData;
    error?: string;
}

interface PreviewData extends EmployeeData {
    isValid: boolean;
    errors: string[];
    [key: string]: any; // Allow additional properties from CSV/Excel
}

const validateDepartment = (department: string) => {
    return VALID_DEPARTMENTS.includes(department);
};

const BulkEmployeeUpload: React.FC = () => {
    const [processing, setProcessing] = useState(false);
    const [results, setResults] = useState<ProcessingResult[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [previewData, setPreviewData] = useState<PreviewData[]>([]);
    const [showPreview, setShowPreview] = useState(false);
    const [uploadSummary, setUploadSummary] = useState<{
        total: number;
        success: number;
        failed: number;
        departments: Record<string, number>;
    } | null>(null);
    const theme = useTheme();

    const downloadTemplate = () => {
        const template = XLSX.utils.book_new();
        const templateData = [{
            'First Name': '',
            'Last Name': '',
            'Email': '',
            'Department': DEPARTMENTS[0],
            'Position': '',
        }];
        const ws = XLSX.utils.json_to_sheet(templateData);
        
        // Add data validation for departments
        ws['!dataValidation'] = {
            E2: {
                type: 'list',
                values: DEPARTMENTS
            }
        };
        
        XLSX.utils.book_append_sheet(template, ws, 'Template');
        XLSX.writeFile(template, 'employee_upload_template.xlsx');
    };

    const validateEmployeeData = (data: any): { employee: EmployeeData | null; errors: string[] } => {
        const errors: string[] = [];
        const employee: EmployeeData = {
            first_name: data.first_name || data['First Name'] || '',
            last_name: data.last_name || data['Last Name'] || '',
            email: data.email || data['Email'] || '',
            department: data.department || data['Department'] || '',
            position: data.position || data['Position'] || '',
        };

        // Validate required fields
        if (!employee.first_name) errors.push('First name is required');
        if (!employee.last_name) errors.push('Last name is required');
        if (!employee.position) errors.push('Position is required');

        // Validate email format
        const emailRegex = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
        if (!employee.email) {
            errors.push('Email is required');
        } else if (!emailRegex.test(employee.email)) {
            errors.push('Invalid email format');
        }

        // Validate department against predefined list
        if (!employee.department) {
            errors.push('Department is required');
        } else if (!validateDepartment(employee.department)) {
            errors.push(`Invalid department. Must be one of: ${VALID_DEPARTMENTS.join(', ')}`);
        }

        return {
            employee: errors.length === 0 ? employee : null,
            errors
        };
    };

    const processFile = async (file: File): Promise<PreviewData[]> => {
        const previewData: PreviewData[] = [];
        
        if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
            const reader = new FileReader();
            const data = await new Promise<string | ArrayBuffer>((resolve, reject) => {
                reader.onload = (e) => resolve(e.target?.result || '');
                reader.onerror = (e) => reject(e);
                reader.readAsBinaryString(file);
            });

            const workbook = XLSX.read(data, { type: 'binary' });
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(worksheet);

            for (const row of jsonData) {
                const { employee, errors } = validateEmployeeData(row);
                if (employee) {
                    previewData.push({
                        ...employee,
                        isValid: errors.length === 0,
                        errors,
                    });
                }
            }
        } else if (file.name.endsWith('.csv')) {
            const results = await new Promise<Papa.ParseResult<any>>((resolve) => {
                Papa.parse(file, {
                    header: true,
                    complete: resolve,
                });
            });

            for (const row of results.data) {
                const { employee, errors } = validateEmployeeData(row);
                if (employee) {
                    previewData.push({
                        ...employee,
                        isValid: errors.length === 0,
                        errors,
                    });
                }
            }
        }

        return previewData;
    };

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setProcessing(true);
        setError(null);
        setResults([]);
        setPreviewData([]);
        setUploadSummary(null);

        try {
            const preview = await processFile(file);
            setPreviewData(preview);
            setShowPreview(true);
        } catch (error: any) {
            setError(error.message);
            toast.error('Failed to process file');
        } finally {
            setProcessing(false);
        }
    };

    const handleConfirmUpload = async () => {
        setProcessing(true);
        setError(null);
        setResults([]);

        try {
            const validEmployees = previewData
                .filter(data => data.isValid)
                .map(({ first_name, last_name, email, department, position }) => ({
                    first_name,
                    last_name,
                    email,
                    department,
                    position,
                }));

            const results = await uploadEmployees(validEmployees);
            setResults(results);

            // Generate summary
            const summary = {
                total: previewData.length,
                success: results.filter(r => r.success).length,
                failed: results.filter(r => !r.success).length,
                departments: {} as Record<string, number>,
            };

            results.forEach(result => {
                if (result.success) {
                    const dept = result.employee.department;
                    summary.departments[dept] = (summary.departments[dept] || 0) + 1;
                }
            });

            setUploadSummary(summary);
            setShowPreview(false);

            if (summary.success > 0) {
                toast.success(`Successfully added ${summary.success} employees`);
            }
            if (summary.failed > 0) {
                toast.error(`Failed to add ${summary.failed} employees`);
            }
        } catch (error: any) {
            setError(error.message);
            toast.error('Failed to upload employees');
        } finally {
            setProcessing(false);
        }
    };

    const downloadErrorReport = () => {
        const errorData = previewData
            .filter(data => !data.isValid)
            .map(data => ({
                'First Name': data.first_name,
                'Last Name': data.last_name,
                'Email': data.email,
                'Department': data.department,
                'Position': data.position,
                'Errors': data.errors.join('; '),
            }));

        if (errorData.length === 0) return;

        const ws = XLSX.utils.json_to_sheet(errorData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Errors');
        XLSX.writeFile(wb, 'employee_upload_errors.xlsx');
    };

    const uploadEmployees = async (employees: EmployeeData[]) => {
        const results: ProcessingResult[] = [];
        const batchSize = 50; // Process 50 employees at a time

        for (let i = 0; i < employees.length; i += batchSize) {
            const batch = employees.slice(i, i + batchSize);
            
            for (const employee of batch) {
                try {
                    const { data, error } = await supabase
                        .from('employees')
                        .insert([{
                            first_name: employee.first_name,
                            last_name: employee.last_name,
                            email: employee.email,
                            department: employee.department,
                            position: employee.position,
                        }])
                        .select()
                        .single();

                    if (error) throw error;

                    results.push({
                        success: true,
                        employee: employee,
                    });
                } catch (error: any) {
                    results.push({
                        success: false,
                        employee: employee,
                        error: error.message || 'Failed to add employee'
                    });
                }
            }
        }

        return results;
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
                        <Card sx={{ mt: 3 }}>
                            <CardContent>
                                <Stack spacing={2}>
                                    <Box
                                        sx={{
                                            border: '2px dashed',
                                            borderColor: 'divider',
                                            borderRadius: 2,
                                            p: 3,
                                            textAlign: 'center',
                                            cursor: 'pointer',
                                            '&:hover': {
                                                borderColor: 'primary.main',
                                                bgcolor: alpha(theme.palette.primary.main, 0.05),
                                            },
                                        }}
                                        onDrop={(e) => {
                                            e.preventDefault();
                                            const file = e.dataTransfer.files[0];
                                            if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || file.name.endsWith('.csv'))) {
                                                const input = document.createElement('input');
                                                const dataTransfer = new DataTransfer();
                                                dataTransfer.items.add(file);
                                                input.files = dataTransfer.files;
                                                handleFileUpload({ target: input } as React.ChangeEvent<HTMLInputElement>);
                                            } else {
                                                toast.error('Please upload an XLSX or CSV file');
                                            }
                                        }}
                                        onDragOver={(e) => e.preventDefault()}
                                    >
                                        <input
                                            type="file"
                                            accept=".xlsx,.xls,.csv"
                                            onChange={handleFileUpload}
                                            style={{ display: 'none' }}
                                            id="file-upload"
                                        />
                                        <label htmlFor="file-upload">
                                            <Stack spacing={1} alignItems="center">
                                                <UploadIcon color="primary" sx={{ fontSize: 40 }} />
                                                <Typography variant="h6">
                                                    Drag & Drop or Click to Upload
                                                </Typography>
                                                <Typography variant="body2" color="textSecondary">
                                                    Supported formats: XLSX, XLS, CSV
                                                </Typography>
                                            </Stack>
                                        </label>
                                    </Box>

                                    <Stack direction="row" spacing={2} justifyContent="center">
                                        <Button
                                            variant="outlined"
                                            startIcon={<DownloadIcon />}
                                            onClick={downloadTemplate}
                                        >
                                            Download Template
                                        </Button>
                                    </Stack>

                                    {error && (
                                        <Alert severity="error" sx={{ mt: 2 }}>
                                            {error}
                                        </Alert>
                                    )}

                                    {processing && (
                                        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                                            <CircularProgress />
                                        </Box>
                                    )}

                                    {results.length > 0 && (
                                        <List sx={{ mt: 2 }}>
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
                                                        primary={`${result.employee.first_name} ${result.employee.last_name}`}
                                                        secondary={result.success 
                                                            ? `Successfully added to ${result.employee.department}`
                                                            : result.error || 'Failed to add employee'
                                                        }
                                                    />
                                                </ListItem>
                                            ))}
                                        </List>
                                    )}
                                </Stack>
                            </CardContent>
                        </Card>
                    </Stack>
                </CardContent>
            </Card>

            {/* Preview Dialog */}
            <Dialog
                open={showPreview}
                onClose={() => setShowPreview(false)}
                maxWidth="lg"
                fullWidth
            >
                <DialogTitle>
                    Preview Employee Data
                    <Typography variant="subtitle2" color="textSecondary">
                        {previewData.length} employees found, {previewData.filter(d => d.isValid).length} valid
                    </Typography>
                </DialogTitle>
                <DialogContent>
                    <TableContainer component={Paper} sx={{ mt: 2 }}>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Status</TableCell>
                                    <TableCell>First Name</TableCell>
                                    <TableCell>Last Name</TableCell>
                                    <TableCell>Email</TableCell>
                                    <TableCell>Department</TableCell>
                                    <TableCell>Position</TableCell>
                                    <TableCell>Errors</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {previewData.map((data, index) => (
                                    <TableRow key={index}>
                                        <TableCell>
                                            {data.isValid ? (
                                                <SuccessIcon color="success" />
                                            ) : (
                                                <ErrorIcon color="error" />
                                            )}
                                        </TableCell>
                                        <TableCell>{data.first_name}</TableCell>
                                        <TableCell>{data.last_name}</TableCell>
                                        <TableCell>{data.email}</TableCell>
                                        <TableCell>{data.department}</TableCell>
                                        <TableCell>{data.position}</TableCell>
                                        <TableCell>
                                            {data.errors.map((error, i) => (
                                                <Typography 
                                                    key={i} 
                                                    variant="caption" 
                                                    color="error" 
                                                    display="block"
                                                >
                                                    {error}
                                                </Typography>
                                            ))}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </DialogContent>
                <DialogActions>
                    <Button
                        startIcon={<CancelIcon />}
                        onClick={() => setShowPreview(false)}
                    >
                        Cancel
                    </Button>
                    <Button
                        startIcon={<DownloadIcon />}
                        onClick={downloadErrorReport}
                        disabled={!previewData.some(d => !d.isValid)}
                    >
                        Download Error Report
                    </Button>
                    <Button
                        variant="contained"
                        startIcon={<SaveIcon />}
                        onClick={handleConfirmUpload}
                        disabled={!previewData.some(d => d.isValid)}
                        sx={{
                            background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                        }}
                    >
                        Upload Valid Employees
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Upload Summary */}
            {uploadSummary && (
                <Paper
                    sx={{
                        mt: 3,
                        p: 2,
                        background: alpha(theme.palette.background.paper, 0.9),
                    }}
                >
                    <Typography variant="h6" gutterBottom>
                        Upload Summary
                    </Typography>
                    <Grid container spacing={2}>
                        <Grid item xs={4}>
                            <Paper
                                sx={{
                                    p: 2,
                                    textAlign: 'center',
                                    background: alpha(theme.palette.primary.main, 0.1),
                                }}
                            >
                                <Typography variant="h4">{uploadSummary.total}</Typography>
                                <Typography variant="body2">Total Processed</Typography>
                            </Paper>
                        </Grid>
                        <Grid item xs={4}>
                            <Paper
                                sx={{
                                    p: 2,
                                    textAlign: 'center',
                                    background: alpha(theme.palette.success.main, 0.1),
                                }}
                            >
                                <Typography variant="h4" color="success.main">
                                    {uploadSummary.success}
                                </Typography>
                                <Typography variant="body2">Successfully Added</Typography>
                            </Paper>
                        </Grid>
                        <Grid item xs={4}>
                            <Paper
                                sx={{
                                    p: 2,
                                    textAlign: 'center',
                                    background: alpha(theme.palette.error.main, 0.1),
                                }}
                            >
                                <Typography variant="h4" color="error">
                                    {uploadSummary.failed}
                                </Typography>
                                <Typography variant="body2">Failed</Typography>
                            </Paper>
                        </Grid>
                    </Grid>

                    {Object.keys(uploadSummary.departments).length > 0 && (
                        <>
                            <Typography variant="subtitle1" sx={{ mt: 3, mb: 1 }}>
                                Employees Added by Department
                            </Typography>
                            <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                                {Object.entries(uploadSummary.departments).map(([dept, count]) => (
                                    <Chip
                                        key={dept}
                                        label={`${dept}: ${count}`}
                                        color="primary"
                                        variant="outlined"
                                    />
                                ))}
                            </Stack>
                        </>
                    )}
                </Paper>
            )}
        </Box>
    );
};

export default BulkEmployeeUpload; 