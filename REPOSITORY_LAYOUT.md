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
  - Hero section with product image and floating stats cards
  - Stats section with real numbers (30K+ Hoopers, 25+ Countries, 4.9★ Rating, 100% Free Gear)
  - Creator gallery with masonry layout and real creator images
  - Creator avatars with real images in hero section
- `layout.tsx` - Root layout component
- `globals.css` - Global styles with animations and custom scrollbar
- `favicon.ico` - Site favicon

#### Authentication
- `login/page.tsx` - Login page
  - THG logo image instead of emoji

#### Application Flow
- `apply/page.tsx` - Creator application page
  - THG logo image instead of emoji
  - Product selection with text input (links to store)
  - Optional height/weight fields for fit recommendations
  - Re-application support for completed/denied/ghosted creators

#### Admin Routes
```
admin/
└── creators/
    ├── page.tsx                # Admin creators list page
    │                           # - Approve/Deny/Review actions for pending creators
    │                           # - Application review modal integration
    └── [id]/
        └── page.tsx            # Individual creator detail page (dynamic route)
                                # - Tracking management section
                                # - Height/weight display in profile
                                # - Fit information in stats bar
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
                                # - Status-based content visibility
                                # - Two-column layout (timeline + content)
                                # - Quick stats bar with status/videos/time/product
                                # - Completion banners and countdown timers
                                # - Enhanced timeline with checkmarks and progress
                                # - Glassmorphic design with hover effects
```

---

### Components (`src/components/`)

#### Authentication Components (`auth/`)
- `ProtectedRoute.tsx` - Route protection component
- `index.ts` - Component exports

#### Creator Management Components (`creators/`)
- `CreatorTable.tsx` - Table component for displaying creators with approve/deny/review actions
- `FilterBar.tsx` - Filtering component for creators
- `ApplicationReviewModal.tsx` - Modal component for reviewing creator applications
- `index.ts` - Component exports

#### UI Components (`ui/`)
- `Button.tsx` - Reusable button component
- `DetailRow.tsx` - Detail row display component
- `Navbar.tsx` - Navigation bar component with THG logo image
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
  - Creator, CreatorStatus (includes 'denied'), User, UserRole
  - ProductType, Size, Carrier (Yanwen only)
  - Creator interface includes:
    - `product: string` (text input, not enum)
    - `height?: string` (optional)
    - `weight?: string` (optional)
    - Removed `phone` field
  - Shipping tracking types:
    - `ShippingStatus` - Tracking status enumeration
    - `TrackingEvent` - Individual tracking event
    - `ShipmentTracking` - Complete shipment tracking data
  - Application input types (CreatorApplicationInput)
  - Dashboard statistics types

---

### Public Assets (`public/`)

- `file.svg` - File icon
- `globe.svg` - Globe icon
- `next.svg` - Next.js logo
- `vercel.svg` - Vercel logo
- `window.svg` - Window icon
- `images/` - Image assets directory
  - `THG_logo_orange.png` - HoopGang orange logo
  - `THG_logo_white.png` - HoopGang white logo
  - `products/` - Product images
    - `hero_product.jpg` - Hero section product image
  - `creators/` - Creator photos and content
    - `creator_stretch.jpg`
    - `striped_duo.jpg`
    - `outdoor_crew.jpg`
    - `team_photo.jpg`
    - `purple_crew.jpg`

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

### Components (20 files)
- Auth: 2 components
- Creators: 4 components (including ApplicationReviewModal)
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
   - Application review system with modal
   - Approve/Deny/Review actions for pending creators
   - Status tracking and history
   - Height/weight display for fit recommendations
   - Product selection as text input (links to store)

4. **Shipping & Tracking System**
   - TrackingMore API integration
   - Carrier support: Yanwen (via 17TRACK)
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
   - Application review modal with full creator details

7. **Enhanced User Experience**
   - Status-based content visibility (pending/denied creators see different UI)
   - Dynamic welcome messages based on creator status
   - Completion recognition banners
   - Enhanced countdown timers with start/end dates
   - Quick stats bars with hover glow effects
   - Smooth animations and transitions
   - Responsive two-column layouts
   - Re-application support for completed/denied creators

8. **Brand Identity & Visual Design**
   - Consistent THG logo usage across all pages
   - Professional product imagery in hero section
   - Real creator photos and content gallery
   - Enhanced visual hierarchy with floating cards and badges
   - Real-world statistics and social proof

---

## API Integration Details

### TrackingMore API Integration

**Base URL**: `https://api.trackingmore.com/v4`

**Endpoints Used**:
- `POST /trackings/create` - Register new tracking number
- `GET /trackings/{courier_code}/{tracking_number}` - Get tracking status
- Webhook endpoint: `/api/webhooks/tracking` - Receive push notifications

**Supported Carriers**:
- Yanwen (mapped to `yanwen-unified-api` in API, uses 17TRACK for tracking URLs)

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

### Brand Identity & Visual Updates (Latest)
- **Logo Implementation**:
  - Replaced basketball emoji with THG logo image across all pages
  - Navbar: THG logo with hover scale effect
  - Login page: THG logo in rounded container with glassmorphic styling
  - Apply page: THG logo in rounded container matching login page design
- **Home Page Enhancements**:
  - Hero Section: Replaced phone mockup with product image and floating cards
    - Main product image with gradient overlay
    - Floating THG logo badge (top right)
    - Floating stats card showing "30K+ Global Hoopers"
    - Floating "FREE GEAR" badge (bottom)
  - Stats Section: Updated with real numbers
    - 30K+ Global Hoopers
    - 25+ Countries Served
    - 4.9★ Customer Rating
    - 100% Free Gear
  - Creator Gallery: Replaced placeholders with real images
    - Masonry-style grid layout
    - Real creator photos with hover effects
    - Team photo, crew photos, and individual creator images
  - Creator Avatars: Replaced emoji avatars with real creator images
    - Overlapping avatar circles in hero section
    - Real photos with border styling

### Application & Form Enhancements
- **Application Form Updates**:
  - Removed phone number field
  - Changed product selection from dropdown to text input
  - Added optional height/weight fields for fit recommendations
  - Added store link to TheHoopGang website in product section
  - Re-application support: completed/denied/ghosted creators can apply again
- **Creator Type Updates**:
  - Added 'denied' status to CreatorStatus enum
  - Updated Creator interface: removed phone, product as string, added height/weight
  - Updated CreatorApplicationInput to match form changes

### Admin Dashboard Enhancements
- **Application Review System**:
  - Added ApplicationReviewModal component for detailed application review
  - Review button in CreatorTable for pending creators
  - Approve/Deny actions from modal with loading states
  - Modal displays full creator profile, social stats, fit info, and application details
- **Creator Detail Page**:
  - Removed phone field from profile
  - Added height/weight display in profile section
  - Added fit information to quick stats bar (5-column grid when available)
  - Enhanced social media links with follower counts

### Creator Dashboard Enhancements
- **Status-Based UI**:
  - Content sections hidden for pending/denied creators
  - Status-specific welcome messages and banners
  - Pending/denied status banners with appropriate messaging
- **Layout Improvements**:
  - Two-column grid layout (timeline + content) for active creators
  - Quick stats bar showing status, videos posted, time remaining, product
  - Enhanced timeline with checkmarks, progress lines, and status colors
  - Completion banners for all 3 videos submitted
- **Visual Enhancements**:
  - Glassmorphic welcome banner with hover effects
  - Background gradient orbs for depth
  - Stats cards with orange glow on hover
  - Enhanced countdown with start/end dates
  - Progress bars for video submissions
  - Perks grid with unlock states

### UI/UX Improvements
- **Animations & Effects**:
  - Toast slide-in animations
  - Logo glow effect
  - Floating animations for decorative elements
  - Shimmer effects for gradient text
  - Pulse glow for CTAs
  - Custom scrollbar styling
  - Selection color theming
- **Design System**:
  - Consistent glassmorphism theme throughout
  - Hover effects on cards and interactive elements
  - Smooth transitions and duration controls
  - Enhanced focus states for inputs

### Bug Fixes & Optimizations
- Fixed race condition in apply page (setTimeout delay before redirect)
- Fixed loading state bugs in apply and login pages
- Fixed missing opening tags in links (CreatorTable, ApplicationReviewModal, admin detail page)
- Updated redirect logic to allow re-application for completed/denied creators
- Fixed ESLint configuration for ESLint 9 flat config
- Removed `@theme inline` block from globals.css to fix linter warnings

### Tracking System
- Complete TrackingMore API integration
- Real-time tracking status updates via webhooks
- Visual tracking progress components
- Admin tracking management interface
- Creator package tracking view with countdown
- Yanwen carrier support with 17TRACK integration
- Debug logging throughout tracking flow

### Component Enhancements
- TrackingStatus component with refresh and delete functionality
- TrackingProgress component with 5-stage visual stepper
- AddTrackingForm component for adding tracking information
- ApplicationReviewModal for comprehensive application review
- Enhanced error handling and user feedback

### API Enhancements
- Comprehensive logging for debugging
- Proper error handling with detailed messages
- Firestore undefined value cleanup
- Status auto-updates (shipped → delivered)
- Content deadline automation (14 days post-delivery)

