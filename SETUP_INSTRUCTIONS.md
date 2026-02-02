# GapNight - Setup Instructions

## Prerequisites

1. **Node.js** (v20 or higher)
   - Download from: https://nodejs.org/
   - Verify installation: `node --version`

2. **PostgreSQL Database**
   - Option A: Local PostgreSQL installation
   - Option B: Cloud database (Neon, Supabase, Railway)

3. **Resend Account** (for email functionality)
   - Sign up at: https://resend.com
   - Get your API key from the dashboard

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the root directory:

```env
# Database Connection
DATABASE_URL=postgresql://username:password@host:port/database_name

# Email Service (Resend)
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxx
RESEND_FROM_EMAIL=GapNight <noreply@gapnight.com>

# Partner Access Password
PARTNER_ACCESS_PASSWORD=ly*^2yg;a@huO

# Server Configuration
PORT=5000
NODE_ENV=development
```

### 3. Initialize Database

```bash
# Push database schema
npm run db:push

# Seed with test data
npx tsx scripts/seed.ts
```

### 4. Start Development Server

```bash
npm run dev
```

The application will be available at: http://localhost:5000

## Test Accounts

### Consumer Access
- Partner Password: `ly*^2yg;a@huO`
  - Enter this on the coming soon page to access the full platform

### Hotel Owner Accounts
- **Crown Collection**: crown@example.com / password123
- **Bayview Group**: bayview@example.com / password123

## Project Structure

```
Gap-Night/
├── client/              # React frontend
│   ├── src/
│   │   ├── pages/      # Route components
│   │   ├── components/ # Reusable UI components
│   │   ├── hooks/      # Custom React hooks
│   │   └── lib/        # Utilities
│   └── index.html
├── server/              # Express backend
│   ├── index.ts        # Server entry point
│   ├── routes.ts       # API routes
│   ├── auth.ts         # Authentication
│   ├── db.ts           # Database connection
│   ├── email.ts        # Email service
│   └── storage.ts      # Data layer
├── shared/              # Shared types & schemas
│   ├── schema.ts       # Database schema
│   └── routes.ts       # API route definitions
└── scripts/
    └── seed.ts         # Database seeding

```

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Run production build
- `npm run check` - TypeScript type checking
- `npm run db:push` - Push database schema changes

## Features

### Consumer Features
- Browse gap night hotel deals
- Search by location
- Filter by category
- View deal details with map
- Book rooms with guest details
- Email confirmation

### Hotel Owner Features
- Secure login/registration
- Manage multiple hotels
- Create room types
- Set availability and rates
- Detect orphan nights automatically
- Publish deals to marketplace
- View published deals

## Troubleshooting

### Port Already in Use
If port 5000 is already in use, change the PORT in `.env`:
```env
PORT=3000
```

### Database Connection Issues
- Verify DATABASE_URL is correct
- Ensure PostgreSQL is running
- Check firewall settings

### Email Not Sending
- Verify RESEND_API_KEY is valid
- Check Resend dashboard for errors
- Ensure RESEND_FROM_EMAIL is verified in Resend

### TypeScript Errors
Run `npm install` to ensure all dependencies are installed, including @types packages.

## Production Deployment

### Build for Production
```bash
npm run build
```

### Environment Variables for Production
Set `NODE_ENV=production` and ensure all environment variables are configured in your hosting platform.

### Recommended Hosting Platforms
- **Vercel** - Easy deployment for full-stack apps
- **Railway** - Includes PostgreSQL database
- **Render** - Free tier available
- **Fly.io** - Global deployment

## Support

For issues or questions:
- Check AUDIT_REPORT.md for detailed system information
- Review BUG_REPORT.md for known issues
- Contact: hello@gapnight.com

## License

MIT
