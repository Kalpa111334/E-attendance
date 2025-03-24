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
import { useDropzone } from 'react-dropzone';
import { DEPARTMENTS, isDepartment } from '../constants/departments';
import { useSnackbar } from 'notistack';

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
    const { enqueueSnackbar } = useSnackbar();

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

    const validateEmployeeData = (data: any[]): EmployeeData[] => {
        const validData: EmployeeData[] = [];
        const errors: string[] = [];

        data.forEach((row, index) => {
            // Skip empty rows
            if (!row.first_name && !row.last_name && !row.email && !row.department && !row.position) {
                return;
            }

            // Validate required fields
            if (!row.first_name || !row.last_name || !row.email || !row.department || !row.position) {
                errors.push(`Row ${index + 1}: Missing required fields`);
                return;
            }

            // Validate email format
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) {
                errors.push(`Row ${index + 1}: Invalid email format`);
                return;
            }

            // Validate department
            if (!isDepartment(row.department)) {
                errors.push(`Row ${index + 1}: Invalid department. Must be one of: ${DEPARTMENTS.join(', ')}`);
                return;
            }

            validData.push({
                first_name: row.first_name.trim(),
                last_name: row.last_name.trim(),
                email: row.email.trim().toLowerCase(),
                department: row.department.trim(),
                position: row.position.trim()
            });
        });

        if (errors.length > 0) {
            throw new Error('Validation errors:\n' + errors.join('\n'));
        }

        return validData;
    };

    const processFile = async (file: File): Promise<PreviewData[]> => {
        const previewData: PreviewData[] = [];
        
        try {
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
                    try {
                        const validData = validateEmployeeData([row as Record<string, unknown>]);
                        previewData.push({
                            ...validData[0],
                            isValid: true,
                            errors: []
                        });
                    } catch (error) {
                        const typedRow = row as Record<string, unknown>;
                        previewData.push({
                            first_name: String(typedRow.first_name || ''),
                            last_name: String(typedRow.last_name || ''),
                            email: String(typedRow.email || ''),
                            department: String(typedRow.department || ''),
                            position: String(typedRow.position || ''),
                            isValid: false,
                            errors: (error as Error).message.split('\n')
                        });
                    }
                }
            } else if (file.name.endsWith('.csv')) {
                const results = await new Promise<Papa.ParseResult<Record<string, unknown>>>((resolve, reject) => {
                    Papa.parse(file, {
                        header: true,
                        skipEmptyLines: true,
                        complete: resolve,
                        error: () => reject(new Error('Invalid CSV format'))
                    });
                });

                for (const row of results.data) {
                    try {
                        const validData = validateEmployeeData([row]);
                        previewData.push({
                            ...validData[0],
                            isValid: true,
                            errors: []
                        });
                    } catch (error) {
                        previewData.push({
                            first_name: String(row.first_name || ''),
                            last_name: String(row.last_name || ''),
                            email: String(row.email || ''),
                            department: String(row.department || ''),
                            position: String(row.position || ''),
                            isValid: false,
                            errors: (error as Error).message.split('\n')
                        });
                    }
                }
            }

            return previewData;
        } catch (error) {
            throw new Error(`Failed to process file: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };

    const handleUpload = async (file: File) => {
        try {
            setProcessing(true);
            setError(null);
            setResults([]);
            setPreviewData([]);
            setUploadSummary(null);

            const preview = await processFile(file);
            setPreviewData(preview);
            setShowPreview(true);

            const validData = preview.filter(data => data.isValid).map(data => data.employee);
            const results = await uploadEmployees(validData);
            setResults(results);

            // Generate summary
            const summary = {
                total: preview.length,
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
                enqueueSnackbar(`Successfully uploaded ${summary.success} employees`, {
                    variant: 'success'
                });
            }
            if (summary.failed > 0) {
                enqueueSnackbar(`Failed to upload ${summary.failed} employees`, {
                    variant: 'error'
                });
            }
        } catch (error: any) {
            setError(error.message || 'Failed to upload employees');
            toast.error(error.message || 'Failed to upload employees');
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

    const onDrop = useCallback((acceptedFiles: File[]) => {
        if (acceptedFiles.length === 0) return;
        handleUpload(acceptedFiles[0]);
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'text/csv': ['.csv']
        },
        maxFiles: 1,
        disabled: processing
    });

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
                                        {...getRootProps()}
                                        sx={{
                                            border: '2px dashed',
                                            borderColor: isDragActive ? 'primary.main' : 'grey.300',
                                            borderRadius: 2,
                                            p: 3,
                                            textAlign: 'center',
                                            cursor: processing ? 'not-allowed' : 'pointer',
                                            bgcolor: isDragActive ? 'action.hover' : 'background.paper',
                                            '&:hover': {
                                                bgcolor: 'action.hover'
                                            }
                                        }}
                                    >
                                        <input {...getInputProps()} />
                                        <UploadIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
                                        <Typography variant="h6" gutterBottom>
                                            {isDragActive ? 'Drop the CSV file here' : 'Drag & drop a CSV file here'}
                                        </Typography>
                                        <Typography variant="body2" color="textSecondary">
                                            or click to select a file
                                        </Typography>
                                        {processing && (
                                            <CircularProgress 
                                                size={24}
                                                sx={{ mt: 2 }}
                                            />
                                        )}
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
                        onClick={async () => {
                            try {
                                const validData = previewData
                                    .filter(data => data.isValid)
                                    .map(({ first_name, last_name, email, department, position }) => ({
                                        first_name,
                                        last_name,
                                        email,
                                        department,
                                        position
                                    }));
                                
                                const results = await uploadEmployees(validData);
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
                                    enqueueSnackbar(`Successfully uploaded ${summary.success} employees`, {
                                        variant: 'success'
                                    });
                                }
                                if (summary.failed > 0) {
                                    enqueueSnackbar(`Failed to upload ${summary.failed} employees`, {
                                        variant: 'error'
                                    });
                                }
                            } catch (error) {
                                enqueueSnackbar('Failed to upload employees', { variant: 'error' });
                            }
                        }}
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