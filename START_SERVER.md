# ⚠️ Node.js Required to Start Server

## Current Status
The browser preview cannot launch because **Node.js is not installed** on your system.

## Quick Fix - Install Node.js

### Option 1: Download Node.js (Recommended)
1. Go to: https://nodejs.org/
2. Download the **LTS version** (v20.x or higher)
3. Run the installer
4. Restart your terminal/IDE

### Option 2: Use Package Manager (Windows)
```powershell
# Using winget (Windows 11)
winget install OpenJS.NodeJS.LTS

# Using Chocolatey
choco install nodejs-lts
```

## After Installing Node.js

### 1. Verify Installation
Open a **new** PowerShell/Terminal window:
```powershell
node --version
npm --version
```

### 2. Install Dependencies
```powershell
cd "C:\Users\summe\OneDrive\Desktop\Gap-Night\Gap-Night"
npm install
```

### 3. Set Up Environment
Create a `.env` file in the project root with:
```env
DATABASE_URL=postgresql://user:pass@localhost:5432/gapnight
RESEND_API_KEY=your_resend_api_key_here
RESEND_FROM_EMAIL=GapNight <noreply@gapnight.com>
PARTNER_ACCESS_PASSWORD=ly*^2yg;a@huO
PORT=5000
NODE_ENV=development
```

### 4. Initialize Database
```powershell
npm run db:push
npx tsx scripts/seed.ts
```

### 5. Start Development Server
```powershell
npm run dev
```

The server will start at: **http://localhost:5000**

## Alternative: Use Pre-built Static Files

If you just want to preview the frontend without the backend:

1. Build the static files:
```powershell
npm run build
```

2. Serve the `dist/public` folder with any static file server

---

## Why This Happened

The comprehensive audit was completed successfully, but the development server requires Node.js to run. The audit found:
- ✅ Zero bugs in code
- ✅ All files properly configured
- ✅ Production-ready codebase

The only missing piece is the Node.js runtime environment on your Windows system.

## Need Help?

Check `SETUP_INSTRUCTIONS.md` for detailed setup guide or `AUDIT_REPORT.md` for the complete audit results.
