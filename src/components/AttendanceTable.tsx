import React from 'react';
import {
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TablePagination,
    Typography,
    Box,
    alpha,
    useTheme,
} from '@mui/material';
import { format } from 'date-fns';

interface AttendanceRecord {
    employee_id: string;
    employees: {
        first_name: string;
        last_name: string;
        department: string;
    };
    created_at: string;
}

interface AttendanceTableProps {
    records: AttendanceRecord[];
    title: string;
}

const AttendanceTable: React.FC<AttendanceTableProps> = ({ records, title }) => {
    const theme = useTheme();
    const [page, setPage] = React.useState(0);
    const [rowsPerPage, setRowsPerPage] = React.useState(10);

    const handleChangePage = (event: unknown, newPage: number) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    return (
        <Paper 
            elevation={0}
            sx={{
                width: '100%',
                overflow: 'hidden',
                bgcolor: theme => alpha(theme.palette.background.paper, 0.7),
                backdropFilter: 'blur(20px)',
                borderRadius: 2,
                border: theme => `1px solid ${alpha(theme.palette.divider, 0.1)}`,
            }}
        >
            <Box p={3}>
                <Typography
                    variant="h6"
                    sx={{
                        fontWeight: 600,
                        mb: 2,
                        background: theme => `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                    }}
                >
                    {title}
                </Typography>
                <TableContainer sx={{ maxHeight: 440 }}>
                    <Table stickyHeader>
                        <TableHead>
                            <TableRow>
                                <TableCell 
                                    sx={{ 
                                        fontWeight: 'bold',
                                        background: theme => `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                                        color: 'white'
                                    }}
                                >
                                    Employee ID
                                </TableCell>
                                <TableCell 
                                    sx={{ 
                                        fontWeight: 'bold',
                                        background: theme => `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                                        color: 'white'
                                    }}
                                >
                                    Name
                                </TableCell>
                                <TableCell 
                                    sx={{ 
                                        fontWeight: 'bold',
                                        background: theme => `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                                        color: 'white'
                                    }}
                                >
                                    Department
                                </TableCell>
                                <TableCell 
                                    sx={{ 
                                        fontWeight: 'bold',
                                        background: theme => `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                                        color: 'white'
                                    }}
                                >
                                    Scan Time
                                </TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {records
                                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                                .map((record, index) => (
                                    <TableRow
                                        key={`${record.employee_id}-${record.created_at}`}
                                        sx={{
                                            '&:nth-of-type(odd)': {
                                                backgroundColor: alpha(theme.palette.primary.main, 0.05),
                                            },
                                            '&:hover': {
                                                backgroundColor: alpha(theme.palette.primary.main, 0.1),
                                            },
                                        }}
                                    >
                                        <TableCell>{record.employee_id}</TableCell>
                                        <TableCell>
                                            {`${record.employees.first_name} ${record.employees.last_name}`}
                                        </TableCell>
                                        <TableCell>{record.employees.department}</TableCell>
                                        <TableCell>
                                            {format(new Date(record.created_at), 'MMM dd, yyyy hh:mm a')}
                                        </TableCell>
                                    </TableRow>
                                ))}
                        </TableBody>
                    </Table>
                </TableContainer>
                <TablePagination
                    rowsPerPageOptions={[10, 25, 100]}
                    component="div"
                    count={records.length}
                    rowsPerPage={rowsPerPage}
                    page={page}
                    onPageChange={handleChangePage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                />
            </Box>
        </Paper>
    );
};

export default AttendanceTable; 