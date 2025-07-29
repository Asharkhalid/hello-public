# Hello AI - UI/UX Flow Documentation

## Table of Contents
1. [User Journey Overview](#user-journey-overview)
2. [Page-by-Page Flow](#page-by-page-flow)
3. [Component Architecture](#component-architecture)
4. [Interaction Patterns](#interaction-patterns)
5. [Visual Design System](#visual-design-system)
6. [Responsive Behavior](#responsive-behavior)

---

## User Journey Overview

### Primary User Flow
```
Landing → Browse Blueprints → View Blueprint Details → Start Journey
    ↓
Dashboard → View Agents → Select Agent → View Meetings
    ↓
Select Meeting → Join Call → Complete Meeting → View Summary
    ↓
Auto-created Next Meeting → Continue Journey
```

### User Personas
1. **Knowledge Seeker**: Wants structured learning from books
2. **Self-Improvement Enthusiast**: Looking for guided coaching
3. **Busy Professional**: Needs flexible, on-demand mentorship

---

## Page-by-Page Flow

### 1. Landing Page (`/`)
**Purpose**: Attract users and showcase available learning programs

**Components**:
- `Navbar`: Navigation with auth status
- `Aurora`: Animated gradient background
- Hero section with value proposition
- Featured blueprints carousel (3 books)
- "Noteworthy" grid (5-8 additional books)

**Key Interactions**:
- Click book cover → Blueprint detail page
- "Explore" button → Blueprint detail page
- Sign in/up → Authentication flow

**Visual Elements**:
- 3D book covers with hover effects using CSS transforms
- Animated aurora background using OGL WebGL library
- Responsive grid layout
- Book spine and lighting effects

### 2. Blueprint Detail Page (`/agent/[agentId]`)
**Purpose**: Explain the learning program and convert visitors

**Components**:
- Large book cover display with AgentCover component
- Book title and author in serif font
- Description of the program
- Learning journey sessions list
- "Start Session" CTA button

**Key Interactions**:
- "Start Session" → Creates agent + first meeting automatically
- View session details → Shows completion criteria
- Back navigation → Landing page

**Visual Elements**:
- Book cover with 3D transform effect (large size)
- Numbered session cards with circular indicators
- Completion criteria bullets
- Achievement outcomes per session
- Rounded corners (rounded-3xl for cards)

### 3. Dashboard (`/dashboard`)
**Purpose**: Central hub for authenticated users

**Layout**:
- Sidebar navigation
- Main content area
- User profile dropdown

**Navigation Structure**:
```
Dashboard
├── Agents (AI Coaches)
├── Meetings (Conversations)
└── Upgrade (Premium)
```

### 4. Agents Page (`/agents`)
**Purpose**: Manage user's AI coaches

**Components**:
- `AgentsListHeader`: Search and create new
- `DataTable`: List of agents with metadata
- `DataPagination`: Page navigation

**Table Columns**:
- Avatar (generated)
- Name
- Meeting count
- Created date
- Actions (edit/delete)

**Key Interactions**:
- Click row → Agent detail page
- "New Agent" → Create agent dialog
- Search → Filter agents
- Edit/Delete → Modify agents

### 5. Agent Detail Page (`/agents/[agentId]`)
**Purpose**: View specific agent and its meetings

**Components**:
- Agent header with actions
- Agent info card (avatar, name, stats)
- Blueprint info section (if blueprint-based)
- Recent meetings list (max 5 shown)
- Progress tracker display

**Key Interactions**:
- Edit → Update agent dialog
- Delete → Confirmation → Remove
- Meeting item → Meeting detail page
- "View all meetings" → Filtered meetings page

**Visual Elements**:
- GeneratedAvatar with botttsNeutral variant
- BookOpenIcon for blueprint-based agents
- Meeting status badges
- Hover states on meeting rows
- Grid layout (lg:col-span-2 for main content)

### 6. Meetings Page (`/meetings`)
**Purpose**: Browse all conversations

**Components**:
- `MeetingsListHeader`: Filters and create
- `DataTable`: Meetings list
- Status badges
- `DataPagination`

**Table Columns**:
- Meeting Name (with agent info below)
- Status (color-coded badges)
- Duration (with clock icon)

**Status Types & Icons**:
- ClockArrowUpIcon: Upcoming (yellow)
- LoaderIcon: Active/Processing (blue/gray, animated)
- CircleCheckIcon: Completed (green)
- CircleXIcon: Cancelled (red)

**Visual Enhancements**:
- Agent avatar in meeting row
- CornerDownRightIcon for agent name
- Date formatting (MMM d)
- Color-coded status badges with icons

### 7. Meeting Detail Page (`/meetings/[meetingId]`)
**Purpose**: Meeting management and results

**Dynamic States**:

#### Upcoming State
- Meeting info card
- "Start Meeting" button
- Pre-computed instructions preview
- Agent details

#### Active State
- Live status indicator
- "Join Call" button
- Real-time duration
- Participant count

#### Processing State
- Processing animation
- "Analyzing conversation..." message
- Expected completion time

#### Completed State
- Meeting summary (AI-generated)
- Key achievements
- Transcript with search
- Chat interface for questions
- Next meeting indicator

### 8. Call Page (`/call/[meetingId]`)
**Purpose**: Real-time AI conversation

**Call Flow States**:

#### Lobby
- Preview video
- Audio/video settings
- Agent preview
- "Join Call" button

#### Active Call
- Video streams (user + AI avatar)
- 3D audio visualizer
- Call controls (mute, end call)
- Real-time status

**Aurora Background**:
- OGL-based WebGL implementation
- Gradient color stops animation
- Simplex noise for organic movement
- Configurable amplitude and blend
- Transparent overlay effect

#### Call Ended
- Summary preview
- "Return to Dashboard" button
- Next steps prompt

### 9. Authentication Pages (`/sign-in`, `/sign-up`)
**Purpose**: User authentication

**Components**:
- Auth forms
- Social login options
- Error handling
- Redirect logic

---

## Component Architecture

### Design System Components

#### UI Primitives (`/components/ui/`)
- `Button`: Multiple variants (primary, outline, ghost)
- `Card`: Container with header/content
- `Dialog`: Modal interactions
- `Badge`: Status indicators
- `Table`: Data display
- `Form`: Input management
- `Tabs`: Content organization

#### Custom Components
- `AgentCover`: 3D book visualization with CSS transforms
- `Aurora`: WebGL gradient background animation
- `GeneratedAvatar`: Unique agent avatars
- `Transcript`: Searchable conversation log
- `ProgressTracker`: Journey visualization
- Meeting status badges with icons

### Layout Components
- `Navbar`: Public navigation
- `DashboardSidebar`: App navigation
- `LoadingState`: Consistent loading UI
- `ErrorState`: Error boundaries
- `EmptyState`: Zero-state messaging

---

## Interaction Patterns

### 1. **Progressive Disclosure**
- Blueprint details expand on demand
- Meeting summaries show key points first
- Transcript search reveals context

### 2. **Optimistic Updates**
- Instant UI feedback on actions
- Background processing indicators
- Rollback on errors

### 3. **Contextual Actions**
- Hover states reveal options
- Row clicks for navigation
- Inline editing where appropriate

### 4. **Smart Defaults**
- Auto-generated agent names
- Pre-selected visualizer modes
- Intelligent next meeting creation

### 5. **Guided Workflows**
- Clear CTAs at each step
- Progress indicators
- Help text and tooltips

---

## Visual Design System

### Color Palette
```scss
// Core Colors
--primary: blue-600
--secondary: gray-600
--accent: orange-500
--success: green-600
--warning: yellow-600
--error: red-600

// Semantic Colors
--background: white/gray-50
--foreground: gray-900
--muted: gray-500
--border: gray-200
```

### Typography
```scss
// Font Families
--font-sans: system-ui
--font-serif: Georgia (book titles)
--font-mono: monospace (code/IDs)

// Scale
--text-xs: 0.75rem
--text-sm: 0.875rem
--text-base: 1rem
--text-lg: 1.125rem
--text-xl: 1.25rem
--text-2xl: 1.5rem
--text-3xl: 1.875rem
```

### Spacing System
- 4px base unit
- Consistent padding/margins
- Responsive scaling

### Animation Patterns
- Smooth transitions (200-300ms)
- Book cover 3D rotation on hover (0.5s ease)
- Light sweep effect on book covers (0.7s)
- Loading states with spinning indicators
- Page transitions
- Aurora gradient animation (continuous)

---

## Responsive Behavior

### Breakpoints
```scss
sm: 640px   // Mobile landscape
md: 768px   // Tablet
lg: 1024px  // Desktop
xl: 1280px  // Wide desktop
```

### Mobile Adaptations

#### Navigation
- Hamburger menu
- Bottom sheet patterns
- Swipe gestures

#### Tables
- Horizontal scroll
- Priority columns
- Card view on smallest screens

#### Call Interface
- Full-screen video
- Floating controls
- Simplified visualizer

### Desktop Enhancements
- Multi-column layouts
- Hover interactions
- Keyboard shortcuts
- Advanced visualizations

---

## Accessibility

### WCAG 2.1 Compliance
- Semantic HTML structure
- ARIA labels and roles
- Keyboard navigation
- Focus management
- Screen reader support

### Color Contrast
- AA compliance minimum
- AAA for critical text
- High contrast mode support

### Interactive Elements
- 44px minimum touch targets
- Clear focus indicators
- Error message association
- Loading announcements

---

## Performance Considerations

### Code Splitting
- Route-based splitting
- Lazy load visualizers
- Dynamic imports for heavy components

### Image Optimization
- Next.js Image component
- Responsive sizing
- WebP format
- Lazy loading

### Data Management
- TanStack Query caching
- Optimistic updates
- Pagination
- Incremental loading

---

*This documentation provides a comprehensive guide to the Hello AI user interface and experience design.*