# Digital ID - Employee Management System

A modern employee management system built with React, TypeScript, and Material-UI. This application provides features for managing employee records, generating QR codes for identification, and tracking attendance.

## Features

- 🔐 Secure authentication system
- 👥 Employee management (CRUD operations)
- 🏢 Department organization
- 📱 QR code generation for employee IDs
- 📊 Attendance tracking and reporting
- 📈 Dashboard with analytics
- 📱 Responsive design
- 🎨 Modern UI with Material Design

## Tech Stack

- React 18
- TypeScript
- Material-UI (MUI)
- Supabase (Backend)
- React Router
- React Toastify
- QRCode.js

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Supabase account

### Installation

1. Clone the repository
```bash
git clone [repository-url]
cd digital-id
```

2. Install dependencies
```bash
npm install
```

3. Create a `.env` file in the root directory and add your Supabase credentials:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Start the development server
```bash
npm run dev
```

### Building for Production

```bash
npm run build
```

## Project Structure

```
src/
├── components/     # Reusable components
├── contexts/       # React contexts
├── pages/         # Page components
├── config/        # Configuration files
├── types/         # TypeScript type definitions
├── styles/        # Global styles
└── utils/         # Utility functions
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Powered by MIDIZ
- Material-UI for the beautiful components
- Supabase for the backend infrastructure 