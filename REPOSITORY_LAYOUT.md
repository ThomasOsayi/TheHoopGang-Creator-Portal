# Repository Layout Summary

## Project Structure

### Root Level Configuration Files
```
hoopgang-creator-portal/
├── eslint.config.mjs          # ESLint configuration
├── next.config.ts              # Next.js configuration
├── next-env.d.ts               # Next.js TypeScript declarations
├── package.json                # Project dependencies and scripts
├── package-lock.json           # Dependency lock file
├── postcss.config.mjs          # PostCSS configuration
├── tsconfig.json               # TypeScript configuration
└── README.md                   # Project documentation
```

---

## Source Code (`src/`)

### Application Routes (`src/app/`)

#### Root & Layout
- `page.tsx` - Home page
- `layout.tsx` - Root layout component
- `globals.css` - Global styles
- `favicon.ico` - Site favicon

#### Authentication
- `login/page.tsx` - Login page

#### Application Flow
- `apply/page.tsx` - Creator application page

#### Admin Routes
```
admin/
└── creators/
    ├── page.tsx                # Admin creators list page
    └── [id]/
        └── page.tsx            # Individual creator detail page (dynamic route)
                                # Includes tracking management section
```

#### API Routes (`api/`)
```
api/
├── tracking/
│   └── route.ts                # Tracking API endpoints (GET, POST, DELETE)
│                               # - POST: Create/register tracking
│                               # - GET: Refresh tracking status
│                               # - DELETE: Remove tracking information
└── webhooks/
    └── tracking/
        └── route.ts            # TrackingMore webhook handler
                                # - POST: Receive push notifications
                                # - GET: Health check endpoint
```

#### Creator Routes
```
creator/
└── dashboard/
    └── page.tsx                # Creator dashboard page
```

---

### Components (`src/components/`)

#### Authentication Components (`auth/`)
- `ProtectedRoute.tsx` - Route protection component
- `index.ts` - Component exports

#### Creator Management Components (`creators/`)
- `CreatorTable.tsx` - Table component for displaying creators
- `FilterBar.tsx` - Filtering component for creators
- `index.ts` - Component exports

#### UI Components (`ui/`)
- `Button.tsx` - Reusable button component
- `DetailRow.tsx` - Detail row display component
- `Navbar.tsx` - Navigation bar component
- `Pagination.tsx` - Pagination component
- `ProgressDots.tsx` - Progress indicator component
- `SectionCard.tsx` - Section card container component
- `StarRating.tsx` - Star rating display component
- `StatCard.tsx` - Statistics card component
- `StatusBadge.tsx` - Status badge component
- `Toast.tsx` - Toast notification component
- `TrackingStatus.tsx` - Tracking status display component with events, refresh, and delete
- `TrackingProgress.tsx` - Horizontal visual stepper for shipping progress
- `index.ts` - Component exports

---

### Libraries & Utilities (`src/lib/`)

- `auth-context.tsx` - Authentication context provider
- `constants.ts` - Application constants (statuses, products, sizes, carriers)
- `firebase.ts` - Firebase initialization and configuration
- `firestore.ts` - Firestore database operations and utilities
- `tracking.ts` - TrackingMore API integration
  - Carrier code mapping
  - Status normalization
  - API request handling
  - Tracking event parsing
  - External tracking URL generation
- `utils.ts` - General utility functions (cn helper for className merging)

---

### Type Definitions (`src/types/`)

- `index.ts` - TypeScript type definitions and interfaces
  - Creator, CreatorStatus, User, UserRole
  - ProductType, Size, Carrier
  - Shipping tracking types:
    - `ShippingStatus` - Tracking status enumeration
    - `TrackingEvent` - Individual tracking event
    - `ShipmentTracking` - Complete shipment tracking data
  - Application input types
  - Dashboard statistics types

---

### Public Assets (`public/`)

- `file.svg` - File icon
- `globe.svg` - Globe icon
- `next.svg` - Next.js logo
- `vercel.svg` - Vercel logo
- `window.svg` - Window icon

---

## File Statistics

### Application Pages (7 files)
- Root page, login, apply
- Admin: creators list, creator detail (with tracking management)
- Creator: dashboard (with package tracking and countdown)
- Root layout

### API Routes (2 files)
- Tracking API: POST, GET, DELETE handlers
- Webhooks: TrackingMore push notification handler

### Components (19 files)
- Auth: 2 components
- Creators: 3 components  
- UI: 13 components (including TrackingStatus, TrackingProgress)

### Libraries (6 files)
- Authentication context
- Firebase/Firestore integration
- TrackingMore API integration
- Constants and utilities

### Types (1 file)
- Type definitions

### Configuration Files (7 files)
- Build tools (Next.js, TypeScript, ESLint, PostCSS)
- Package management

### Public Assets (5 files)
- SVG icons and logos

---

## Environment Variables

### Required Environment Variables

**Server-side (API Routes):**
- `TRACKINGMORE_API_KEY` - TrackingMore API key for shipping tracking

**Client-side (NEXT_PUBLIC_ prefix):**
- `NEXT_PUBLIC_FIREBASE_API_KEY` - Firebase API key
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` - Firebase auth domain
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID` - Firebase project ID
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` - Firebase storage bucket
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` - Firebase messaging sender ID
- `NEXT_PUBLIC_FIREBASE_APP_ID` - Firebase app ID
- `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` - Firebase analytics measurement ID

### Configuration
- All environment variables should be set in `.env.local` for local development
- For Vercel deployment, configure environment variables in the Vercel dashboard
- Server-side variables (without NEXT_PUBLIC_) are only accessible in API routes and server components

---

## Technology Stack

- **Framework**: Next.js 16.0.7
- **Language**: TypeScript 5
- **UI Library**: React 19.2.0
- **Styling**: Tailwind CSS 4
- **Backend**: Firebase/Firestore
- **Authentication**: Firebase Auth
- **Tracking API**: TrackingMore API v4
- **Build Tool**: Next.js built-in

---

## Key Features

1. **Multi-role Application System**
   - Admin portal for managing creators
   - Creator dashboard for applicants
   - Public application flow

2. **Authentication & Authorization**
   - Protected routes
   - Role-based access control
   - Firebase authentication integration

3. **Creator Management**
   - Creator listing and filtering
   - Detailed creator profiles
   - Application review system
   - Status tracking and history

4. **Shipping & Tracking System**
   - TrackingMore API integration
   - Multi-carrier support (Yanwen, USPS, UPS, FedEx)
   - Real-time tracking status updates
   - Webhook support for push notifications
   - Visual tracking progress stepper
   - External tracking URL generation (17TRACK for Yanwen)
   - Automatic status transitions (shipped → delivered)
   - Content deadline management (14 days after delivery)

5. **Tracking Features**
   - Add/remove tracking information
   - Refresh tracking status manually
   - Display tracking events timeline
   - Status badge with icons and colors
   - Delivery countdown timer
   - Admin tracking management interface
   - Creator package tracking view

6. **Reusable UI Components**
   - Comprehensive component library
   - Consistent design system (glassmorphism theme)
   - Accessible components
   - Tracking-specific components (TrackingStatus, TrackingProgress)
   - Toast notification system

---

## API Integration Details

### TrackingMore API Integration

**Base URL**: `https://api.trackingmore.com/v4`

**Endpoints Used**:
- `POST /trackings/create` - Register new tracking number
- `GET /trackings/{courier_code}/{tracking_number}` - Get tracking status
- Webhook endpoint: `/api/webhooks/tracking` - Receive push notifications

**Supported Carriers**:
- Yanwen (mapped to `yanwen-unified-api` in API)
- USPS
- UPS
- FedEx

**Status Mapping**:
- Tracks 7 shipping statuses: pending, transit, pickup, delivered, undelivered, exception, expired
- Automatically normalizes TrackingMore status codes to internal status types
- Handles both lowercase and mixed-case status values from API

**Features**:
- Automatic tracking registration when admin adds tracking number
- Manual refresh capability
- Webhook support for real-time updates
- Event parsing from origin and destination tracking info
- External tracking URL generation for carrier websites

---

## Recent Implementations

### Tracking System (Latest)
- Complete TrackingMore API integration
- Real-time tracking status updates via webhooks
- Visual tracking progress components
- Admin tracking management interface
- Creator package tracking view with countdown
- Multi-carrier support with proper code mapping
- Debug logging throughout tracking flow

### Component Enhancements
- TrackingStatus component with refresh and delete functionality
- TrackingProgress component with 5-stage visual stepper
- AddTrackingForm component for adding tracking information
- Enhanced error handling and user feedback

### API Enhancements
- Comprehensive logging for debugging
- Proper error handling with detailed messages
- Firestore undefined value cleanup
- Status auto-updates (shipped → delivered)
- Content deadline automation (14 days post-delivery)

