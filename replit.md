# GapNight - Hotel Gap Night Deals Marketplace

## Overview

GapNight is a hotel deals marketplace that specializes in selling "gap nights" (orphan nights) - single or short hotel stays that hotels struggle to sell between longer bookings. The application displays clearance-priced hotel deals with search, filtering, and sorting capabilities. This is currently a mockup/MVP with no real booking engine or payments.

The core value proposition:
- **For users**: Access to deeply discounted hotel rooms for 1-2 night stays
- **For hotels**: A channel to sell distressed inventory while maintaining control over pricing and availability

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight alternative to React Router)
- **State Management**: TanStack React Query for server state
- **Styling**: Tailwind CSS with CSS variables for theming
- **UI Components**: shadcn/ui component library (Radix UI primitives)
- **Form Handling**: React Hook Form with Zod validation
- **Build Tool**: Vite

Key frontend patterns:
- Path aliases configured: `@/` maps to `client/src/`, `@shared/` maps to `shared/`
- Custom hooks for data fetching (`use-deals`, `use-waitlist`, `use-hotel-inquiries`)
- Font stack uses DM Sans (body) and Outfit (headings)

### Backend Architecture
- **Runtime**: Node.js with Express 5
- **Language**: TypeScript with ESM modules
- **API Pattern**: REST endpoints defined in `shared/routes.ts` with Zod schema validation
- **Development**: tsx for TypeScript execution, Vite dev server with HMR

Key backend patterns:
- Routes registered in `server/routes.ts`
- Storage abstraction layer in `server/storage.ts` (currently MemStorage with mock data)
- Shared route definitions enable type-safe API contracts between frontend and backend

### Data Layer
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Schema Location**: `shared/schema.ts`
- **Migrations**: Drizzle Kit with output to `./migrations`
- **Current State**: Uses in-memory storage with mock data; database schema defined but not actively used

Database tables:
- `deals`: Hotel deal listings with pricing, dates, ratings, and category tags
- `waitlist`: User email signups with optional preferred city
- `hotel_inquiries`: Hotel partner inquiry submissions

### Build System
- **Client Build**: Vite outputs to `dist/public`
- **Server Build**: esbuild bundles server to `dist/index.cjs`
- **Production**: Single bundled CJS file serves static assets

## External Dependencies

### Core Services
- **PostgreSQL**: Database (requires `DATABASE_URL` environment variable)
- **Drizzle Kit**: Database migrations via `npm run db:push`

### Key NPM Packages
- `@tanstack/react-query`: Server state management
- `drizzle-orm` / `drizzle-zod`: Database ORM and schema validation
- `express`: HTTP server framework
- `zod`: Runtime type validation
- `date-fns`: Date formatting utilities
- `lucide-react`: Icon library

### Replit-Specific
- `@replit/vite-plugin-runtime-error-modal`: Development error overlay
- `@replit/vite-plugin-cartographer`: Development tooling
- `connect-pg-simple`: PostgreSQL session storage (available but not currently used)

## Recent Changes

### January 2026
- **Landing Page Restructure**: Dictionary-style "Gap Night" definition is now the hero section, with search bar integrated below the explanation text
- **Definition Text**: "An unsold night between hotel bookings — discounted so it doesn't go unused."
- **Simplified Date Picker**: Three-tab interface (Within, By Month, Specific) replacing cluttered all-at-once display
- **Extended Date Range**: Month selection goes through December 2026
- **CSS Variables**: Added --popover and --card variables for proper dropdown backgrounds
- **Map View**: Interactive Leaflet map showing hotel locations with markers and popups (toggle between grid/map views)
- **Enhanced DealCard**: Amenity icons (WiFi, Pool, Gym, etc.), nearby highlights, per-night pricing display
- **Schema Updates**: Added latitude/longitude coordinates, amenities array, nearbyHighlight fields to deals
- **Dark Mode Support**: Full dark mode with theme toggle in navigation (desktop and mobile)
- **Footer Component**: Consistent footer across all pages with branding, links, and contact info
- **Toast Notifications**: Success/error toasts for form submissions (waitlist and hotel inquiry)
- **Deal Detail Improvements**: Amenities display, nearby highlight info, interactive map per hotel
- **Scroll-to-Top Button**: Floating button appears when scrolling down
- **Smooth Scrolling**: CSS scroll-behavior: smooth for better UX
- **Dark Mode CSS Variables**: Complete dark palette with proper contrast ratios