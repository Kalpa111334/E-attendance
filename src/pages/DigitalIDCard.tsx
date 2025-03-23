import React, { useState, useEffect } from 'react';
import {
    Box,
    Container,
    Typography,
    Grid,
    Card,
    CardContent,
    Button,
    Avatar,
    Chip,
    Stack,
    Alert,
    CircularProgress,
    useTheme,
    Breadcrumbs,
    Link,
} from '@mui/material';
import {
    CreditCard as IDCardIcon,
    QrCode as QrCodeIcon,
    Download as DownloadIcon,
} from '@mui/icons-material';
import { Link as RouterLink } from 'react-router-dom';
import { supabase } from '../config/supabase';
import QRCode from 'qrcode';

interface Employee {
    id: number;
    employee_id: string;
    first_name: string;
    last_name: string;
    email: string;
    department: string;
    position: string;
    lead_id?: string;
    lead?: {
        employee_id: string;
        first_name: string;
        last_name: string;
        position: string;
    };
}

const DigitalIDCard: React.FC = () => {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const theme = useTheme();

    useEffect(() => {
        fetchEmployees();
    }, []);

    const fetchEmployees = async () => {
        try {
            const { data, error } = await supabase
                .from('employees')
                .select(`
                    id,
                    employee_id,
                    first_name,
                    last_name,
                    email,
                    department,
                    position
                `)
                .order('first_name');

            if (error) throw error;
            setEmployees(data || []);
        } catch (err) {
            console.error('Error fetching employees:', err);
            setError('Failed to fetch employees');
        } finally {
            setLoading(false);
        }
    };

    const generateQRCode = async (employee: Employee) => {
        try {
            setProcessingId(employee.id.toString());
            
            // Create a clean data object with only the required fields
            const qrData: {
                employee_id: string;
                first_name: string;
                last_name: string;
                department: string;
                position: string;
                scanUrl: string;
                lead?: {
                    employee_id: string;
                    first_name: string;
                    last_name: string;
                    position: string;
                };
            } = {
                employee_id: employee.employee_id.trim(),
                first_name: employee.first_name.trim(),
                last_name: employee.last_name.trim(),
                department: employee.department.trim(),
                position: employee.position.trim(),
                scanUrl: `${window.location.origin}/scan`.trim()
            };

            // Only add lead if it exists and has all required fields
            if (employee.lead && 
                employee.lead.employee_id &&
                employee.lead.first_name &&
                employee.lead.last_name &&
                employee.lead.position) {
                qrData.lead = {
                    employee_id: employee.lead.employee_id.trim(),
                    first_name: employee.lead.first_name.trim(),
                    last_name: employee.lead.last_name.trim(),
                    position: employee.lead.position.trim()
                };
            }

            // Convert to JSON string and ensure it's valid
            const jsonString = JSON.stringify(qrData);
            // Verify the JSON is valid by parsing it
            JSON.parse(jsonString);

            console.log('Generating QR code with data:', qrData);
            console.log('JSON string:', jsonString);

            const qrUrl = await QRCode.toDataURL(jsonString, {
                errorCorrectionLevel: 'H',
                margin: 1,
                width: 300,
                color: {
                    dark: theme.palette.primary.main,
                    light: '#FFFFFF',
                }
            });

            // Create a temporary canvas to generate the ID card
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error('Failed to get canvas context');

            // Set canvas size for ID card (900x500 pixels)
            canvas.width = 900;
            canvas.height = 500;

            // Draw background
            const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
            gradient.addColorStop(0, theme.palette.primary.main);
            gradient.addColorStop(1, theme.palette.secondary.main);
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Load and draw QR code
            const qrImage = new Image();
            qrImage.src = qrUrl;
            await new Promise((resolve) => {
                qrImage.onload = resolve;
            });
            ctx.drawImage(qrImage, 50, 100, 300, 300);

            // Draw employee information
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 48px Arial';
            ctx.fillText(`${employee.first_name} ${employee.last_name}`, 400, 150);
            
            ctx.font = '32px Arial';
            ctx.fillText(`ID: ${employee.employee_id}`, 400, 200);
            ctx.fillText(`Position: ${employee.position}`, 400, 250);
            ctx.fillText(`Department: ${employee.department}`, 400, 300);
            ctx.fillText(`Email: ${employee.email}`, 400, 350);

            // Convert canvas to image and download
            const link = document.createElement('a');
            link.download = `${employee.employee_id}-digital-id.png`;
            link.href = canvas.toDataURL('image/png');
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (err) {
            console.error('Error generating ID card:', err);
            setError('Failed to generate ID card');
        } finally {
            setProcessingId(null);
        }
    };

    return (
        <Container maxWidth="xl">
            <Box sx={{ py: { xs: 2, sm: 3 } }}>
                <Breadcrumbs sx={{ mb: 2 }}>
                    <Link 
                        component={RouterLink} 
                        to="/"
                        underline="hover"
                        color="inherit"
                        sx={{ display: 'flex', alignItems: 'center' }}
                    >
                        Dashboard
                    </Link>
                    <Typography color="text.primary" sx={{ display: 'flex', alignItems: 'center' }}>
                        <IDCardIcon sx={{ mr: 0.5, fontSize: 20 }} />
                        Digital ID Cards
                    </Typography>
                </Breadcrumbs>

                <Typography 
                    variant="h4" 
                    component="h1" 
                    sx={{ 
                        mb: { xs: 2, sm: 3 },
                        fontSize: { xs: '1.5rem', sm: '2rem' },
                        fontWeight: 600,
                        color: theme.palette.primary.main,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1
                    }}
                >
                    <IDCardIcon sx={{ fontSize: { xs: 24, sm: 32 } }} />
                    Digital ID Cards
                </Typography>

                {error && (
                    <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                        {error}
                    </Alert>
                )}

                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                        <CircularProgress />
                    </Box>
                ) : (
                    <Grid container spacing={3}>
                        {employees.map((employee) => (
                            <Grid item xs={12} sm={6} md={4} key={employee.id}>
                                <Card 
                                    sx={{
                                        height: '100%',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        transition: 'transform 0.2s, box-shadow 0.2s',
                                        '&:hover': {
                                            transform: 'translateY(-4px)',
                                            boxShadow: theme.shadows[8],
                                        },
                                    }}
                                >
                                    <CardContent>
                                        <Stack spacing={2}>
                                            <Box sx={{ 
                                                display: 'flex', 
                                                alignItems: 'center',
                                                gap: 2 
                                            }}>
                                                <Avatar
                                                    sx={{
                                                        width: 56,
                                                        height: 56,
                                                        background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                                                        fontSize: '1.5rem',
                                                    }}
                                                >
                                                    {employee.first_name[0]}
                                                </Avatar>
                                                <Box>
                                                    <Typography variant="h6">
                                                        {employee.first_name} {employee.last_name}
                                                    </Typography>
                                                    <Typography variant="body2" color="textSecondary">
                                                        ID: {employee.employee_id}
                                                    </Typography>
                                                </Box>
                                            </Box>

                                            <Stack spacing={1}>
                                                <Chip 
                                                    label={employee.department}
                                                    sx={{
                                                        background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                                                        color: 'white',
                                                        alignSelf: 'flex-start',
                                                    }}
                                                />
                                                <Typography variant="body2">
                                                    {employee.position}
                                                </Typography>
                                                <Typography variant="body2" color="textSecondary">
                                                    {employee.email}
                                                </Typography>
                                            </Stack>

                                            <Button
                                                variant="contained"
                                                startIcon={processingId === employee.id.toString() ? 
                                                    <CircularProgress size={20} color="inherit" /> : 
                                                    <QrCodeIcon />
                                                }
                                                onClick={() => generateQRCode(employee)}
                                                disabled={!!processingId}
                                                sx={{
                                                    mt: 'auto',
                                                    background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                                                }}
                                            >
                                                Generate Digital ID
                                            </Button>
                                        </Stack>
                                    </CardContent>
                                </Card>
                            </Grid>
                        ))}
                    </Grid>
                )}
            </Box>
        </Container>
    );
};

export default DigitalIDCard;
