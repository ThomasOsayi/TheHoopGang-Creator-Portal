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
- `index.ts` - Component exports

---

### Libraries & Utilities (`src/lib/`)

- `auth-context.tsx` - Authentication context provider
- `constants.ts` - Application constants
- `firebase.ts` - Firebase initialization and configuration
- `firestore.ts` - Firestore database operations and utilities
- `utils.ts` - General utility functions

---

### Type Definitions (`src/types/`)

- `index.ts` - TypeScript type definitions and interfaces

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
- Admin: creators list, creator detail
- Creator: dashboard
- Root layout

### Components (17 files)
- Auth: 2 components
- Creators: 3 components  
- UI: 11 components

### Libraries (5 files)
- Authentication context
- Firebase/Firestore integration
- Constants and utilities

### Types (1 file)
- Type definitions

### Configuration Files (7 files)
- Build tools (Next.js, TypeScript, ESLint, PostCSS)
- Package management

### Public Assets (5 files)
- SVG icons and logos

---

## Technology Stack

- **Framework**: Next.js 16.0.7
- **Language**: TypeScript 5
- **UI Library**: React 19.2.0
- **Styling**: Tailwind CSS 4
- **Backend**: Firebase/Firestore
- **Authentication**: Firebase Auth
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

4. **Reusable UI Components**
   - Comprehensive component library
   - Consistent design system
   - Accessible components

