import React, { useEffect } from 'react';
import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import {
    AppBar,
    Box,
    Toolbar,
    Typography,
    Button,
    IconButton,
    Menu,
    MenuItem,
    Container,
    Stack,
    Divider,
} from '@mui/material';
import {
    AccountCircle,
    People as PeopleIcon,
    Upload as UploadIcon,
    QrCodeScanner as ScannerIcon,
    Assessment as ReportsIcon,
    Schedule as ScheduleIcon,
} from '@mui/icons-material';
import { useAuth } from './contexts/AuthContext';
import Login from './components/Login';
import EmployeeList from './pages/EmployeeList';
import EmployeeForm from './components/EmployeeForm';
import QRCodeView from './components/QRCodeView';
import QRCodeScanner from './components/QRCodeScanner';
import BulkQRGenerator from './components/BulkQRGenerator';
import ProtectedRoute from './components/ProtectedRoute';
import Dashboard from './pages/Dashboard';
import AttendanceReport from './components/AttendanceReport';
import LandingPage from './pages/LandingPage';
import ErrorBoundary from './components/ErrorBoundary';
import LoadingAnimation from './components/LoadingAnimation';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { startAttendanceReportWorker } from './workers/attendanceReportWorker';
import { sendDailyAttendanceReport } from './utils/attendanceAutomation';
import { toast } from 'react-toastify';
import RosterManagementPage from './pages/RosterManagementPage';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

export const Footer: React.FC = () => {
    const location = useLocation();
    const showFooter = location.pathname !== '/';

    if (!showFooter) return null;

    return (
        <Box
            component="footer"
            sx={{
                py: 3,
                px: 2,
                mt: 'auto',
                backgroundColor: theme => theme.palette.background.paper,
                borderTop: theme => `1px solid ${theme.palette.divider}`,
            }}
        >
            <Container maxWidth="lg">
                <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    justifyContent="space-between"
                    alignItems="center"
                    spacing={2}
                >
                    <Typography variant="body2" color="text.secondary">
                        © {new Date().getFullYear()} Digital ID. All rights reserved.
                    </Typography>
                    <Stack
                        direction="row"
                        spacing={3}
                        divider={<Divider orientation="vertical" flexItem />}
                    >
                        <Typography
                            variant="body2"
                            color="text.secondary"
                            component={Link}
                            to="/privacy"
                            sx={{ textDecoration: 'none', '&:hover': { color: 'primary.main' } }}
                        >
                            Privacy Policy
                        </Typography>
                        <Typography
                            variant="body2"
                            color="text.secondary"
                            component={Link}
                            to="/terms"
                            sx={{ textDecoration: 'none', '&:hover': { color: 'primary.main' } }}
                        >
                            Terms of Service
                        </Typography>
                        <Typography
                            variant="body2"
                            color="text.secondary"
                            component={Link}
                            to="/contact"
                            sx={{ textDecoration: 'none', '&:hover': { color: 'primary.main' } }}
                        >
                            Contact Us
                        </Typography>
                    </Stack>
                </Stack>
            </Container>
        </Box>
    );
};

export const Navigation: React.FC = () => {
    const { user, signOut } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

    const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const handleSignOut = async () => {
        await signOut();
        handleClose();
        navigate('/login');
    };

    // Don't show navigation on landing page
    if (location.pathname === '/') return null;
    // Don't show navigation for non-authenticated users except on login page
    if (!user && location.pathname !== '/login') return null;

    return (
        <AppBar 
            position="static" 
            sx={{
                background: theme => `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                boxShadow: 'none',
            }}
        >
            <Container maxWidth="lg">
                <Toolbar sx={{ flexWrap: 'wrap', gap: 1 }}>
                    <Typography 
                        variant="h6" 
                        component={Link} 
                        to={user ? "/dashboard" : "/"} 
                        sx={{ 
                            flexGrow: { xs: 1, md: 0 }, 
                            minWidth: { xs: '100%', md: 'auto' },
                            textDecoration: 'none', 
                            color: 'inherit',
                            fontWeight: 700,
                            order: { xs: 1, md: 0 },
                            textAlign: { xs: 'center', md: 'left' },
                            mb: { xs: 1, md: 0 },
                        }}
                    >
                        Digital ID
                    </Typography>
                    
                    {user && (
                        <Box sx={{ 
                            display: 'flex', 
                            flexWrap: 'wrap',
                            gap: 1,
                            justifyContent: { xs: 'center', md: 'flex-start' },
                            flexGrow: 1,
                            order: { xs: 3, md: 2 },
                        }}>
                            <Button
                                color="inherit"
                                component={Link}
                                to="/employees"
                                startIcon={<PeopleIcon />}
                                size="small"
                                sx={{ 
                                    fontSize: { xs: '0.875rem', md: '1rem' },
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                Employees
                            </Button>
                            <Button
                                color="inherit"
                                component={Link}
                                to="/bulk-generate"
                                startIcon={<UploadIcon />}
                                size="small"
                                sx={{ 
                                    fontSize: { xs: '0.875rem', md: '1rem' },
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                Bulk Generate
                            </Button>
                            <Button
                                color="inherit"
                                component={Link}
                                to="/scanner"
                                startIcon={<ScannerIcon />}
                                size="small"
                                sx={{ 
                                    fontSize: { xs: '0.875rem', md: '1rem' },
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                Scanner
                            </Button>
                            <Button
                                color="inherit"
                                component={Link}
                                to="/attendance-report"
                                startIcon={<ReportsIcon />}
                                size="small"
                                sx={{ 
                                    fontSize: { xs: '0.875rem', md: '1rem' },
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                Reports
                            </Button>
                            <Button
                                color="inherit"
                                component={Link}
                                to="/roster"
                                startIcon={<ScheduleIcon />}
                                size="small"
                                sx={{ 
                                    fontSize: { xs: '0.875rem', md: '1rem' },
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                Roster
                            </Button>
                        </Box>
                    )}
                    
                    {user && (
                        <Box sx={{ 
                            order: { xs: 2, md: 3 },
                            width: { xs: '100%', md: 'auto' },
                            display: 'flex',
                            justifyContent: 'center',
                        }}>
                            <IconButton
                                size="large"
                                onClick={handleMenu}
                                color="inherit"
                            >
                                <AccountCircle />
                            </IconButton>
                            <Menu
                                anchorEl={anchorEl}
                                open={Boolean(anchorEl)}
                                onClose={handleClose}
                                transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                                anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                            >
                                <MenuItem onClick={handleSignOut}>Sign Out</MenuItem>
                            </Menu>
                        </Box>
                    )}
                </Toolbar>
            </Container>
        </AppBar>
    );
};

const App: React.FC = () => {
    useEffect(() => {
        // Start the attendance report worker
        if (typeof window !== 'undefined') {
            // Start automated reports
            startAttendanceReportWorker().catch(error => {
                console.error('Failed to start attendance worker:', error);
                toast.error('Failed to start automated reports');
            });

            // Send an immediate test report if in development
            if (import.meta.env.MODE === 'development') {
                sendDailyAttendanceReport()
                    .then(() => toast.success('Test attendance report sent successfully'))
                    .catch(error => {
                        console.error('Failed to send test report:', error);
                        toast.error('Failed to send test report');
                    });
            }
        }
    }, []);

    return (
        <ErrorBoundary>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
                <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
                    <Navigation />
                    <Box sx={{ flex: 1 }}>
                        <React.Suspense fallback={<LoadingAnimation />}>
                            <Routes>
                                <Route path="/" element={<LandingPage />} />
                                <Route path="/login" element={<Login />} />
                                <Route path="/dashboard" element={
                                    <ProtectedRoute>
                                        <Dashboard />
                                    </ProtectedRoute>
                                } />
                                <Route path="/employees" element={
                                    <ProtectedRoute>
                                        <EmployeeList />
                                    </ProtectedRoute>
                                } />
                                <Route path="/employees/new" element={
                                    <ProtectedRoute>
                                        <EmployeeForm />
                                    </ProtectedRoute>
                                } />
                                <Route path="/employees/edit/:employeeId" element={
                                    <ProtectedRoute>
                                        <EmployeeForm />
                                    </ProtectedRoute>
                                } />
                                <Route path="/bulk-generate" element={
                                    <ProtectedRoute>
                                        <BulkQRGenerator />
                                    </ProtectedRoute>
                                } />
                                <Route path="/scanner" element={
                                    <ProtectedRoute>
                                        <QRCodeScanner />
                                    </ProtectedRoute>
                                } />
                                <Route path="/qr/:employeeId" element={<QRCodeView />} />
                                <Route path="/attendance-report" element={
                                    <ProtectedRoute>
                                        <AttendanceReport />
                                    </ProtectedRoute>
                                } />
                                <Route path="/roster" element={
                                    <ProtectedRoute>
                                        <RosterManagementPage />
                                    </ProtectedRoute>
                                } />
                            </Routes>
                        </React.Suspense>
                    </Box>
                    <Footer />
                    <ToastContainer position="top-right" autoClose={3000} />
                </Box>
            </LocalizationProvider>
        </ErrorBoundary>
    );
};

export default App; 