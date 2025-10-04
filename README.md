# Expensio - Smart Expense Management System

A comprehensive expense management system built with Next.js, TypeScript, PostgreSQL, and modern web technologies. Features multi-level approvals, OCR receipt processing, real-time currency conversion, and role-based access control.

## Features

- 🏢 **Multi-tenant Architecture** - Company-based data isolation
- 👥 **Role-based Access Control** - Admin, Manager, and Employee roles
- 💰 **Multi-currency Support** - Real-time currency conversion
- 📄 **OCR Receipt Processing** - Automatic data extraction from receipts
- ✅ **Flexible Approval Workflows** - Configurable approval rules
- 📊 **Comprehensive Dashboards** - Role-specific analytics and insights
- 📱 **Responsive Design** - Mobile and desktop optimized
- 🔐 **Secure Authentication** - JWT-based with refresh tokens

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript, TailwindCSS
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: PostgreSQL
- **Authentication**: JWT with bcrypt
- **File Processing**: Tesseract.js for OCR
- **Animations**: GSAP, ParticleJS
- **Validation**: Zod
- **Email**: Nodemailer

## Prerequisites

- Node.js 18+ 
- PostgreSQL 14+
- npm or yarn

## Getting Started

### 1. Clone and Install Dependencies

```bash
git clone <repository-url>
cd expensio
npm install
```

### 2. Environment Setup

Copy the environment template and configure your settings:

```bash
cp .env.example .env.local
```

Update `.env.local` with your configuration:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/expensio_db"

# Authentication
JWT_SECRET="your-super-secret-jwt-key"
JWT_REFRESH_SECRET="your-super-secret-refresh-key"

# Email (for user invitations)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
FROM_EMAIL="noreply@expensio.com"

# External APIs (optional)
EXCHANGE_RATE_API_KEY="your-exchange-rate-api-key"
```

### 3. Database Setup

```bash
# Generate Prisma client
npm run db:generate

# Push database schema
npm run db:push

# Or run migrations (for production)
npm run db:migrate
```

### 4. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues
- `npm run type-check` - Run TypeScript type checking
- `npm run db:generate` - Generate Prisma client
- `npm run db:push` - Push schema to database
- `npm run db:migrate` - Run database migrations
- `npm run db:studio` - Open Prisma Studio

## Project Structure

```
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   ├── (auth)/            # Authentication pages
│   ├── dashboard/         # Dashboard pages
│   └── globals.css        # Global styles
├── lib/                   # Utility libraries
│   ├── auth.ts           # Authentication utilities
│   ├── db.ts             # Database connection
│   ├── env.ts            # Environment validation
│   ├── types.ts          # TypeScript types
│   └── utils.ts          # General utilities
├── prisma/               # Database schema and migrations
├── components/           # Reusable React components
├── middleware.ts         # Next.js middleware
└── public/              # Static assets
```

## API Documentation

### Authentication Endpoints
- `POST /api/auth/login` - User login
- `POST /api/auth/signup` - User registration
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user

### Expense Management
- `GET /api/expenses` - List expenses
- `POST /api/expenses` - Create expense
- `GET /api/expenses/[id]` - Get expense details
- `PUT /api/expenses/[id]` - Update expense
- `DELETE /api/expenses/[id]` - Delete expense

### User Management (Admin only)
- `GET /api/users` - List users
- `POST /api/users` - Create user
- `PUT /api/users/[id]` - Update user
- `DELETE /api/users/[id]` - Delete user

## Database Schema

The application uses a multi-tenant PostgreSQL database with the following main entities:

- **Company** - Tenant isolation
- **User** - System users with roles
- **Expense** - Expense records with multi-currency support
- **Receipt** - File attachments with OCR data
- **ApprovalRule** - Configurable approval workflows
- **ApprovalStep** - Individual approval steps
- **Approval** - Approval decisions
- **Currency** - Exchange rate data

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support and questions, please open an issue in the GitHub repository.