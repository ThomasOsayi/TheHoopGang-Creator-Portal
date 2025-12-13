# Repository Layout Summary

## Project Structure

### Repository Root
```
TheHoopGang-Creator-Portal/
├── hoopgang-creator-portal/     # Next.js app (see below)
├── README.md                   # Repository documentation
└── REPOSITORY_LAYOUT.md         # This file
```

### App Root (`hoopgang-creator-portal/`) Configuration Files
```
hoopgang-creator-portal/
├── eslint.config.mjs          # ESLint configuration
├── next.config.ts              # Next.js configuration
├── package.json                # Project dependencies and scripts
├── package-lock.json           # Dependency lock file
├── postcss.config.mjs          # PostCSS configuration
├── tsconfig.json               # TypeScript configuration
├── firestore.indexes.json      # Firestore composite indexes configuration
├── firebase.json               # Firebase configuration
├── firestore.rules             # Firestore security rules
├── scripts/                    # Utility scripts
│   ├── seed-v3-rewards.ts      # Script to seed default rewards
│   └── migrate-to-collaborations.ts  # Migration script
└── README.md                   # Project documentation
```

---

## Source Code (`hoopgang-creator-portal/src/`)

### Application Routes (`hoopgang-creator-portal/src/app/`)

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
  - Multi-step email verification flow (account creation → verification → full application)
  - Firebase Authentication integration for user creation and email verification
  - Branded verification email with resend capability
  - Always loads fullName from Firestore when user exists (regardless of verification status)
  - Pre-fills form data from Firestore user document

#### Admin Routes
```
admin/
├── creators/
│   ├── page.tsx                # Admin creators list page
│   │                           # - Approve/Deny/Review actions for pending creators
│   │                           # - Application review modal integration
│   └── [id]/
│       └── page.tsx            # Individual creator detail page (dynamic route)
│                               # - Tracking management section
│                               # - Height/weight display in profile
│                               # - Fit information in stats bar
├── leaderboard/
│   ├── volume/
│   │   └── page.tsx            # Volume competition admin page
│   │                           # - Start/end/finalize competitions
│   │                           # - View leaderboard and submissions
│   │                           # - Competition history
│   │                           # - Creator submission modal
│   └── gmv/
│       └── page.tsx            # GMV leaderboard admin page
│                               # - Bulk GMV entry management
│                               # - Monthly leaderboard view
│                               # - GMV period selection
└── submissions/
    ├── page.tsx                # Milestone submissions list page
    │                           # - Filter by status, type, week
    │                           # - View all pending/approved/rejected submissions
    └── [id]/
        └── page.tsx            # Individual milestone review page
                                # - Approve/reject milestone submissions
                                # - Verify view counts
                                # - Create redemption records
```

#### API Routes (`api/`)
```
api/
├── admin/
│   ├── competitions/
│   │   ├── route.ts            # Competition management API
│   │   │                       # - GET: Fetch active competition, leaderboard, history
│   │   │                       # - POST: Start new competition
│   │   │                       # - PUT: End active competition
│   │   └── finalize/
│   │       └── route.ts        # Finalize competition API
│   │                           # - POST: Finalize ended competition
│   │                           # - Create redemption records for winners
│   ├── leaderboard/
│   │   ├── volume/
│   │   │   ├── status/
│   │   │   │   └── route.ts    # Volume leaderboard status API
│   │   │   │                   # - GET: Check if week is finalized
│   │   │   └── finalize/
│   │   │       └── route.ts    # Volume leaderboard finalization API
│   │   │                       # - POST: Finalize weekly volume leaderboard
│   │   └── gmv/
│   │       ├── route.ts        # GMV leaderboard API
│   │       │                   # - GET: Fetch GMV leaderboard for period
│   │       │                   # - POST: Create/update GMV entry
│   │       └── bulk/
│   │           └── route.ts     # Bulk GMV operations API
│   │                           # - POST: Bulk create/update GMV entries
│   └── submissions/
│       ├── route.ts            # Admin submissions API
│       │                       # - GET: Fetch all submissions with filters
│       │                       # - Supports filtering by type, status, weekOf, creatorId
│       ├── [id]/
│       │   ├── route.ts        # Single submission API
│       │   │                   # - GET: Fetch single submission with creator details
│       │   └── review/
│       │       └── route.ts    # Milestone review API
│       │                       # - PUT: Approve/reject milestone submission
│       │                       # - Creates redemption records on approval
│   ├── auth/
│   │   └── send-verification/
│   │       └── route.ts        # Email verification API endpoint
│   │                           # - POST: Send branded verification email
│   │                           # - Uses Firebase Admin SDK to generate verification links
│   │                           # - Renders React email templates to HTML via Resend
│   │                           # - Production domain fallback (creators.hoopgang.com)
│   │                           # - Professional subject line (no emojis)
│   │                           # - Debug logging for troubleshooting request data
│   ├── competitions/
│   │   └── active/
│   │       └── route.ts        # Public active competition API
│   │                           # - GET: Fetch active competition (no auth required)
│   │                           # - Auto-ends expired competitions on-demand
│   │                           # - Returns leaderboard and time remaining
│   │                           # - Supports includeEnded parameter
│   ├── creator/
│   │   └── stats/
│   │       └── route.ts        # Creator stats API
│   │                           # - GET: Fetch creator statistics
│   ├── email/
│   │   └── send/
│   │       └── route.ts        # General email sending endpoint
│   ├── leaderboard/
│   │   └── route.ts            # Public leaderboard API
│   │                           # - GET: Fetch leaderboard by type and period
│   ├── submissions/
│   │   ├── history/
│   │   │   └── route.ts        # Submission history API
│   │   │                       # - GET: Fetch creator's submission history
│   │   └── volume/
│   │       ├── route.ts        # Volume submission API
│   │       │                   # - POST: Create volume submission
│   │       │                   # - Auto-tags with active competition
│   │       │                   # - Recalculates leaderboards
│   │       ├── stats/
│   │       │   └── route.ts    # Volume stats API
│   │       │                   # - GET: Fetch creator volume statistics
│   │       └── milestone/
│   │           ├── route.ts    # Milestone submission API
│   │           │               # - POST: Create milestone submission (pending review)
│   │           └── stats/
│   │               └── route.ts # Milestone stats API
│   │                           # - GET: Fetch creator milestone statistics
│   ├── tracking/
│   │   └── route.ts            # Tracking API endpoints (GET, POST, DELETE)
│   │                           # - POST: Save tracking info to Firestore and send shipped email
│   │                           # - GET: Fetch existing tracking information
│   │                           # - DELETE: Remove tracking information
│   │                           # (Simplified - no external TrackingMore API calls)
│   └── webhooks/
│       └── tracking/
│           └── route.ts        # TrackingMore webhook handler
│                               # - POST: Receive push notifications
│                               # - GET: Health check endpoint
```

#### Creator Routes
```
creator/
├── dashboard/
│   └── page.tsx                # Creator dashboard page
│                               # - Status-based content visibility
│                               # - Two-column layout (timeline + content)
│                               # - Quick stats bar with status/videos/time/product
│                               # - Completion banners and countdown timers
│                               # - Enhanced timeline with checkmarks and progress
│                               # - Glassmorphic design with hover effects
├── submit/
│   └── page.tsx                # Content submission page
│                               # - Volume submission form
│                               # - Milestone submission form
│                               # - Competition status banner
│                               # - Weekly stats display
│                               # - Milestone stats display
│                               # - Time until weekly reset
├── leaderboard/
│   └── page.tsx                # Creator leaderboard page
│                               # - Volume competition leaderboard
│                               # - GMV leaderboard (monthly)
│                               # - Competition status banners
│                               # - User rank highlighting
│                               # - Period selection for GMV
└── submissions/
    └── page.tsx                # Creator submissions history page
                                # - View all submissions
                                # - Filter by type and status
                                # - Submission status tracking
```

---

### Components (`hoopgang-creator-portal/src/components/`)

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
- `Navbar.tsx` - Navigation bar component with THG logo image (V2 collaboration status system)
- `Pagination.tsx` - Pagination component
- `ProgressDots.tsx` - Progress indicator component
- `SectionCard.tsx` - Section card container component
- `StarRating.tsx` - Star rating display component
- `StatCard.tsx` - Statistics card component
- `StatusBadge.tsx` - Status badge component
- `Toast.tsx` - Toast notification component
- `TrackingStatus.tsx` - Tracking status display component with events and delete (refresh removed)
- `TrackingProgress.tsx` - Horizontal visual stepper for shipping progress
- `index.ts` - Component exports

---

### Libraries & Utilities (`hoopgang-creator-portal/src/lib/`)

- `auth-context.tsx` - Authentication context provider
- `constants.ts` - Application constants (statuses, products, sizes, carriers)
- `firebase.ts` - Firebase client-side initialization and configuration
- `firebase-admin.ts` - Firebase Admin SDK initialization for server-side operations
  - Email verification link generation
  - Service account configuration (supports base64 encoded or individual env vars)
- `firestore.ts` - Firestore database operations and utilities
  - V3 Content Submission functions (volume, milestone)
  - Competition management functions
  - Leaderboard calculation and management
  - Rewards and redemptions system
  - Week/month utility functions
- `week-utils.ts` - Week and month utility functions
  - ISO week calculations (getCurrentWeek, getWeekString, etc.)
  - Month calculations (getCurrentMonth, getMonthString, etc.)
  - Time formatting (formatTimeRemaining, formatTimeUntilReset)
  - Period utilities (getPreviousWeeks, getPreviousMonths)
- `tracking.ts` - Tracking utility functions
  - Carrier code mapping
  - Status normalization
  - Tracking event parsing
  - External tracking URL generation (17TRACK for Yanwen)
- `email/` - Email template system
  - `email-layout.tsx` - Base email layout component for branded emails (production logo URL)
  - `send-email.ts` - Email sending utility using Resend API (professional subject lines)
  - `templates/` - React email templates (professional, consistent tone)
    - `verify-email.tsx` - Branded email verification template
    - `approved.tsx` - Application approval email template
    - `shipped.tsx` - Package shipped email template
    - `delivered.tsx` - Package delivered email template
- `utils.ts` - General utility functions (cn helper for className merging)

---

### Type Definitions (`hoopgang-creator-portal/src/types/`)

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
  - V3 Content Submission types:
    - `V3SubmissionType` - 'volume' | 'milestone'
    - `V3SubmissionStatus` - 'pending' | 'approved' | 'rejected'
    - `MilestoneTier` - '100k' | '500k' | '1m'
    - `V3ContentSubmission` - Submission interface with competitionId
  - Competition types:
    - `CompetitionStatus` - 'pending' | 'active' | 'ended' | 'finalized'
    - `Competition` - Competition interface with winners, dates
    - `CompetitionWinner` - Winner interface with rank and rewards
  - Leaderboard types:
    - `LeaderboardType` - 'volume' | 'gmv'
    - `LeaderboardPeriod` - Period string (week or month)
    - `LeaderboardEntry` - Leaderboard entry with rank and value
  - Rewards and Redemptions types:
    - `RewardCategory` - Reward category enumeration
    - `FulfillmentType` - Cash, store credit, product, or mixed
    - `Reward` - Reward interface with values and eligibility
    - `RedemptionSource` - Source of redemption (milestone, competition, etc.)
    - `RedemptionStatus` - Redemption status enumeration
    - `Redemption` - Redemption interface with fulfillment details
  - Stats types:
    - `V3VolumeStats` - Volume submission statistics
    - `V3MilestoneStats` - Milestone submission statistics
    - `V3CreatorStats` - Combined creator statistics

---

### Public Assets (`hoopgang-creator-portal/public/`)

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

### Pages (13+ `page.tsx` files)
- Root page, login, apply, forgot-password
- Admin: creators list, creator detail, submissions list, submission review, volume leaderboard, GMV leaderboard
- Creator: dashboard, submit, leaderboard, submissions history

### API Routes (20+ files)
- Auth: Email verification endpoint
- Email: Send email endpoint
- Tracking API: POST, GET, DELETE handlers (simplified - no external API)
- Webhooks: TrackingMore push notification handler
- Competitions: Active competition endpoint (public)
- Admin Competitions: Start, end, finalize competitions
- Submissions: Volume, milestone, history endpoints
- Leaderboards: Volume, GMV leaderboard endpoints
- Admin Submissions: Review and manage submissions
- Admin Leaderboards: Finalize and manage leaderboards

### Components (22 files)
- Auth: 2 files
- Creators: 4 components (including ApplicationReviewModal)
- UI: 16 files (including TrackingStatus, TrackingProgress)

### Libraries (10+ files)
- Authentication context
- Firebase client/Firestore integration
- Firebase Admin SDK (server-side)
- Email template system (layout + 4 templates)
- Email sending utilities (Resend integration)
- Tracking utility functions
- Constants and utilities

### Types (1 file)
- Type definitions

### Configuration Files (9+ files, app root)
- Build tools (Next.js, TypeScript, ESLint, PostCSS)
- Package management
- `firestore.indexes.json` - Firestore composite indexes configuration
- `firebase.json` - Firebase configuration
- `firestore.rules` - Firestore security rules

### Public Assets
- SVG icons, logos, and image assets (see `hoopgang-creator-portal/public/`)

---

## Environment Variables

### Required Environment Variables

**Server-side (API Routes):**
- `RESEND_API_KEY` - Resend API key for sending branded emails
- `EMAIL_FROM` - Email sender address (e.g., "HoopGang <team@thehoopgang.xyz>")
- `FIREBASE_PROJECT_ID` - Firebase project ID for Admin SDK
- `FIREBASE_CLIENT_EMAIL` - Firebase service account client email
- `FIREBASE_PRIVATE_KEY` - Firebase service account private key (or use base64 encoded option below)
- `FIREBASE_SERVICE_ACCOUNT_BASE64` - Base64 encoded Firebase service account JSON (alternative to individual vars above)
- `NEXT_PUBLIC_APP_URL` - Public application URL for verification links (defaults to https://creators.hoopgang.com)

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
- **Authentication**: Firebase Auth (client) + Firebase Admin SDK (server)
- **Email**: Resend API with React Email templates
- **Email Templates**: @react-email/components, @react-email/render
- **Tracking**: Internal tracking management (simplified, no external API dependency)
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
   - Firebase authentication integration (client-side)
   - Email verification system with branded emails
   - Multi-step application flow (account creation → verification → application)
   - Firebase Admin SDK for server-side email verification link generation

3. **Creator Management**
   - Creator listing and filtering
   - Detailed creator profiles
   - Application review system with modal
   - Approve/Deny/Review actions for pending creators
   - Status tracking and history
   - Height/weight display for fit recommendations
   - Product selection as text input (links to store)

4. **Shipping & Tracking System**
   - Internal tracking management (simplified system)
   - Carrier support: Yanwen (tracking URLs via 17TRACK)
   - Visual tracking progress stepper
   - External tracking URL generation (17TRACK for Yanwen)
   - Automatic status management (shipped status updates)
   - Content deadline management (14 days after delivery)
   - Email notifications on package shipped

5. **Tracking Features**
   - Add/remove tracking information
   - Display tracking events timeline
   - Status badge with icons and colors
   - Delivery countdown timer
   - Admin tracking management interface
   - Creator package tracking view
   - Automatic shipped email notifications

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

8. **Email System**
   - Branded email templates using React Email
   - Resend API integration for reliable email delivery
   - Email verification flow with secure Firebase Admin links
   - Application status emails (approved, shipped, delivered)
   - Professional email layout with consistent branding
   - Production logo URLs (creators.hoopgang.com)
   - Professional subject lines (no emojis, consistent tone)
   - Professional email content (removed casual language and emojis)

9. **Brand Identity & Visual Design**
   - Consistent THG logo usage across all pages
   - Professional product imagery in hero section
   - Real creator photos and content gallery
   - Enhanced visual hierarchy with floating cards and badges
   - Real-world statistics and social proof

10. **V3 Content Submission System**
    - Volume submissions (auto-approved)
    - Milestone submissions (requires admin review)
    - Competition integration (auto-tags submissions)
    - Weekly and milestone statistics tracking
    - Submission history and status tracking

11. **Competition System**
    - Volume and GMV competition support
    - Start/end/finalize competition workflows
    - Auto-ending expired competitions (on-demand)
    - Competition leaderboard calculation
    - Winner tracking and redemption creation
    - Competition status banners for creators

12. **Leaderboard System**
    - Volume leaderboards (weekly, competition-based)
    - GMV leaderboards (monthly)
    - Real-time leaderboard updates
    - User rank highlighting
    - Period-based leaderboard views
    - Leaderboard finalization workflows

13. **Rewards & Redemptions System**
    - Reward management (cash, store credit, products)
    - Milestone-based rewards
    - Competition winner rewards
    - Redemption tracking and fulfillment
    - Automatic redemption creation on approvals

---

## API Integration Details

### Email Verification System

**Service**: Firebase Admin SDK + Resend API

**Flow**:
1. User creates account with email/password via Firebase Auth
2. Server generates secure verification link using Firebase Admin SDK
3. Branded verification email sent via Resend with React Email template
4. User clicks link to verify email
5. Application can proceed after verification

**Email Templates**:
- Verification email (`verify-email.tsx`)
- Application approved (`approved.tsx`)
- Package shipped (`shipped.tsx`)
- Package delivered (`delivered.tsx`)

**Features**:
- Secure verification links with expiration
- Branded email design with consistent layout
- Resend verification capability
- React Email templates rendered to HTML
- Production domain fallback (creators.hoopgang.com)
- Professional subject lines and content (no emojis, consistent tone)
- Debug logging for troubleshooting request data and field validation

### Tracking System (Simplified)

**Implementation**: Internal Firestore-based tracking management

**Features**:
- Tracking number and carrier stored in Firestore
- Status updates (shipped, delivered)
- External tracking URL generation (17TRACK for Yanwen)
- Automatic shipped email notifications
- Manual tracking management by admins

**Supported Carriers**:
- Yanwen (tracking URLs via 17TRACK)

**Status Types**:
- Tracks shipping statuses: pending, transit, pickup, delivered, undelivered, exception, expired

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
- **Email Verification System**:
  - Multi-step application flow: account creation → email verification → full application
  - Firebase Authentication integration for user account creation
  - Branded verification emails via Resend API
  - Firebase Admin SDK for secure verification link generation
  - Email verification required before application submission
  - Resend verification email capability
  - Automatic verification status checking
  - Debug logging in verification API for troubleshooting request data
- **Application Form Updates**:
  - Removed phone number field
  - Changed product selection from dropdown to text input
  - Added optional height/weight fields for fit recommendations
  - Added store link to TheHoopGang website in product section
  - Re-application support: completed/denied/ghosted creators can apply again
  - Always loads fullName from Firestore when user exists (improved UX)
  - Pre-fills form with user data regardless of verification status
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
- Removed redundant shipped email sending from admin detail page (now handled by tracking API)
- Simplified tracking API (removed external TrackingMore dependency)
- Removed refresh button from TrackingStatus component

### Tracking System
- Simplified internal tracking management (Firestore-based)
- Visual tracking progress components
- Admin tracking management interface
- Creator package tracking view with countdown
- Yanwen carrier support with 17TRACK tracking URLs
- Automatic shipped email notifications
- Manual tracking status management

### Component Enhancements
- TrackingStatus component with delete functionality (refresh removed)
- TrackingProgress component with 5-stage visual stepper
- AddTrackingForm component for adding tracking information
- ApplicationReviewModal for comprehensive application review
- Enhanced error handling and user feedback
- Email verification UI with multi-step flow

### API Enhancements
- Email verification API route with Firebase Admin SDK integration
- Branded email sending via Resend API
- React Email template rendering to HTML
- Comprehensive logging for debugging
- Proper error handling with detailed messages
- Firestore undefined value cleanup
- Status auto-updates (shipped → delivered)
- Content deadline automation (14 days post-delivery)
- Simplified tracking API (removed external dependency)

### Email System Professionalization (Latest)
- **Email Layout Updates**:
  - Updated logo URL to use production domain (`https://creators.hoopgang.com/images/THG_logo_orange.png`)
  - Replaced localhost test URL with production logo path
- **Email Template Updates**:
  - **Verification Email** (`verify-email.tsx`):
    - Removed emojis from heading and greeting
    - Changed "Creator Squad" to "Creator Program" for professional tone
    - Simplified button text (removed arrow)
    - Cleaned up expiry note text
  - **Approved Email** (`approved.tsx`):
    - Changed "Welcome to the Family!" to "Welcome to the Team 🏀"
    - Removed emojis from greeting and body text
    - Changed casual language ("hyped" → "excited", "look fire 🔥" → "try it on")
    - Updated sign-off from "Let's get it" to "Welcome aboard"
    - Removed arrow from button text
  - **Shipped Email** (`shipped.tsx`):
    - Updated heading to "Your Gear Has Shipped 📦"
    - Removed emojis from greeting
    - Professionalized shipping note (removed casual language and emojis)
    - Removed arrow from button text
    - Updated sign-off to "Thanks for your patience"
  - **Delivered Email** (`delivered.tsx`):
    - Removed emojis from heading and greeting
    - Changed "fire content" to "great content"
    - Removed emoji from requirements header
    - Removed arrow from button text
    - Updated sign-off to "Looking forward to seeing what you create"
- **Email Sending Updates**:
  - **Verification Route** (`send-verification/route.ts`):
    - Updated production domain fallback from `thehoopgang.xyz` to `creators.hoopgang.com`
    - Removed emoji from subject line ("Verify your email for HoopGang")
  - **Email Utilities** (`send-email.ts`):
    - Updated approved email subject: "Welcome to the HoopGang Creator Program"
    - Updated shipped email subject: "Your HoopGang gear has shipped"
    - Updated delivered email subject: "Your gear has arrived — time to create content"
    - All subject lines now professional and consistent (no emojis)

### TypeScript & Build Fixes (Latest)
- **Navbar Component** (`Navbar.tsx`):
  - Fixed TypeScript error: Migrated from `Creator['status']` to `CollaborationStatus`
  - Updated to use V2 collaboration-based status system
  - Fixed `getCreatorWithActiveCollab` return type usage (changed `activeCollaboration` to `collaboration`)
  - Fixed React namespace issue by importing `MouseEvent` type directly
  - Added navigation links for creator submit, admin submissions, admin leaderboards
  - All TypeScript compilation errors resolved for Vercel deployment
- **Build System**:
  - All email templates compile successfully
  - No TypeScript errors in production build
  - All linting errors resolved
  - Ready for Vercel deployment

### Email Verification & Application Flow Improvements (Latest)
- **Email Verification API** (`/api/auth/send-verification/route.ts`):
  - Added comprehensive debug logging for troubleshooting
  - Logs received request body with userId, email, and fullName
  - Logs field presence flags (hasUserId, hasEmail, hasFullName)
  - Logs missing fields when validation fails
  - Helps diagnose issues with verification email requests
- **Apply Page** (`/app/apply/page.tsx`):
  - Updated useEffect to always load fullName from Firestore when user exists
  - Removed dependency on email verification status for fullName loading
  - Form now pre-fills with fullName even before email verification
  - Better UX: User data available immediately upon login
  - Improved error handling for Firestore fetch failures

### V3 Content Submission & Competition System (Latest)
- **Content Submission System**:
  - Volume submissions: Auto-approved, tracked by week
  - Milestone submissions: Requires admin review, tracks view milestones
  - Competition integration: Submissions automatically tagged with active competition
  - Submission stats: Weekly volume counts, milestone approval/rejection tracking
  - Duplicate URL prevention: Checks for existing submissions before creating
- **Competition System**:
  - Competition types: Volume and GMV competitions
  - Competition lifecycle: Start → Active → Ended → Finalized
  - Auto-ending: Expired competitions automatically ended on-demand (when leaderboard/submit pages load)
  - Competition leaderboards: Real-time calculation based on submissions
  - Winner management: Tracks top 3 winners with rewards
  - Competition status: Active, ended (pending verification), finalized states
- **Leaderboard System**:
  - Volume leaderboards: Weekly and competition-based
  - GMV leaderboards: Monthly period-based
  - Real-time updates: Leaderboards recalculate on submission
  - Finalization: Admin can finalize weekly/monthly leaderboards
  - User ranking: Creators can see their rank and position
- **Rewards & Redemptions**:
  - Reward categories: Milestone rewards, leaderboard rewards
  - Fulfillment types: Cash, store credit, products, or mixed
  - Automatic redemption creation: Created when milestones approved or competitions finalized
  - Redemption tracking: Status tracking (pending, approved, fulfilled, rejected)
- **Admin Features**:
  - Competition management: Start, end, finalize competitions
  - Submission review: Approve/reject milestone submissions with view verification
  - Leaderboard management: View, finalize, and manage leaderboards
  - Bulk operations: Bulk GMV entry management
  - Creator submission viewer: Modal to view all submissions for a creator
- **Creator Features**:
  - Submit page: Volume and milestone submission forms with competition status
  - Leaderboard page: View competition and GMV leaderboards with user rank
  - Submissions history: View all past submissions with status
  - Competition awareness: Status banners showing active/ended competitions
  - Stats tracking: Weekly volume stats and milestone stats display
- **API Enhancements**:
  - Public competition endpoint: No auth required for viewing active competitions
  - On-demand expiration: Competitions auto-end when accessed (no cron needed)
  - Submission filtering: Filter by type, status, week, creator
  - Leaderboard APIs: Separate endpoints for volume and GMV
  - Stats APIs: Volume and milestone statistics endpoints
- **Firestore Functions**:
  - Competition functions: getActiveCompetition, startCompetition, endCompetition, finalizeCompetition
  - Submission functions: createVolumeSubmission, createMilestoneSubmission, reviewMilestoneSubmission
  - Leaderboard functions: getLeaderboard, recalculateVolumeLeaderboard, getCompetitionLeaderboard
  - Reward functions: getActiveRewards, getRewardByMilestoneTier, createReward
  - Redemption functions: createRedemption, getRedemptionsByCreatorId, updateRedemptionStatus
- **Type System**:
  - Added V3 submission types (V3ContentSubmission, V3SubmissionType, etc.)
  - Added competition types (Competition, CompetitionStatus, CompetitionWinner)
  - Added leaderboard types (LeaderboardEntry, LeaderboardType, LeaderboardPeriod)
  - Added rewards types (Reward, RewardCategory, FulfillmentType)
  - Added redemption types (Redemption, RedemptionSource, RedemptionStatus)
  - Added stats types (V3VolumeStats, V3MilestoneStats, V3CreatorStats)
- **Firestore Indexes**:
  - Added indexes for competitions (type + status, type + createdAt)
  - Added indexes for submissions (competitionId + type + status)
  - Added indexes for leaderboard entries
  - Created firestore.indexes.json configuration file
- **Utility Functions**:
  - Week utilities: ISO week calculations, time formatting, period utilities
  - Month utilities: Month string generation, period calculations
  - Time formatting: formatTimeRemaining, formatTimeUntilReset functions

### Email Verification & Application Flow Improvements (Latest)
- **Email Verification API** (`/api/auth/send-verification/route.ts`):
  - Added comprehensive debug logging for troubleshooting
  - Logs received request body with userId, email, and fullName
  - Logs field presence flags (hasUserId, hasEmail, hasFullName)
  - Logs missing fields when validation fails
  - Helps diagnose issues with verification email requests
- **Apply Page** (`/app/apply/page.tsx`):
  - Updated useEffect to always load fullName from Firestore when user exists
  - Removed dependency on email verification status for fullName loading
  - Form now pre-fills with fullName even before email verification
  - Better UX: User data available immediately upon login
  - Improved error handling for Firestore fetch failures

