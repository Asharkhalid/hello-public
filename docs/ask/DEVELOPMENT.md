# Development Guide

This guide covers everything you need to know to set up, develop, and contribute to the Hello AI - Talk with and Learn from your favourite books project.

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Development Workflow](#development-workflow)
4. [Code Standards](#code-standards)
5. [Testing Guidelines](#testing-guidelines)
6. [Debugging](#debugging)
7. [Common Issues](#common-issues)
8. [Contributing](#contributing)

---

## 🔧 Prerequisites

### Required Software
```bash
# Node.js (v18 or higher)
node --version  # v18.0.0+

# npm (v9 or higher)
npm --version   # v9.0.0+

# Git
git --version   # Latest stable
```

### Development Tools (Recommended)
- **VS Code** with extensions:
  - TypeScript and JavaScript Language Features
  - Tailwind CSS IntelliSense
  - ES7+ React/Redux/React-Native snippets
  - Better Comments
  - Auto Rename Tag
  - Bracket Pair Colorizer

### Required Accounts & API Keys
1. **Stream** - Video/Chat infrastructure
2. **OpenAI** - AI model access
3. **Neon** - Database hosting
4. **Polar** - Payment processing
5. **Inngest** - Background job processing
6. **ngrok** - Local webhook testing

---

## 🚀 Environment Setup

### 1. Clone Repository
```bash
git clone https://github.com/your-org/hello-ai.git
cd hello-ai
```

### 2. Install Dependencies
```bash
# Install with legacy peer deps (required for React 19)
npm install --legacy-peer-deps
```

### 3. Environment Configuration
```bash
# Copy environment template
cp .env.example .env.local
```

Edit `.env.local` with your API keys:
```bash
# Database
DATABASE_URL="postgresql://username:password@host/database"

# Authentication
AUTH_SECRET="your-secret-key-here"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Google OAuth (optional)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Stream
NEXT_PUBLIC_STREAM_API_KEY="your-stream-api-key"
STREAM_SECRET_KEY="your-stream-secret-key"

# OpenAI
OPENAI_API_KEY="your-openai-api-key"

# Polar (Payment Processing)
POLAR_ACCESS_TOKEN="your-polar-access-token"
NEXT_PUBLIC_POLAR_ORGANIZATION_ID="your-polar-org-id"

# Inngest (Background Jobs)
INNGEST_EVENT_KEY="your-inngest-event-key"
INNGEST_SIGNING_KEY="your-inngest-signing-key"

# ngrok (for webhook testing)
NGROK_STATIC_DOMAIN="your-ngrok-static-domain"
```

### 4. Database Setup
```bash
# Push database schema
npm run db:push

# Open database studio (optional)
npm run db:studio
```

### 5. Start Development Servers
```bash
# Terminal 1: Main application
npm run dev

# Terminal 2: Webhook server (if testing webhooks)
npm run dev:webhook

# Terminal 3: Background jobs
npx inngest-cli@latest dev
```

Your application will be available at:
- **App**: http://localhost:3000
- **Inngest UI**: http://localhost:8288
- **Database Studio**: http://localhost:4983

---

## 🔄 Development Workflow

### Daily Development Routine

1. **Pull Latest Changes**
```bash
git pull origin main
npm install --legacy-peer-deps  # If package.json changed
```

2. **Create Feature Branch**
```bash
git checkout -b feature/your-feature-name
```

3. **Development Process**
```bash
# Start development server
npm run dev

# Make changes
# Test functionality
# Commit changes

git add .
git commit -m "feat: add new feature description"
```

4. **Before Pushing**
```bash
# Run linting
npm run lint

# Fix any issues
npm run lint -- --fix

# Build to check for errors
npm run build
```

5. **Push and Create PR**
```bash
git push origin feature/your-feature-name
# Create pull request via GitHub UI
```

### Module Development Pattern

When creating a new feature module:

```bash
# Create module structure
mkdir -p src/modules/new-feature/{ui/components,ui/views,hooks,server}
touch src/modules/new-feature/{schemas.ts,types.ts,constants.ts}
```

Example module structure:
```typescript
// src/modules/new-feature/types.ts
export interface NewFeature {
  id: string;
  name: string;
  createdAt: Date;
}

// src/modules/new-feature/schemas.ts
import { z } from 'zod';

export const createNewFeatureSchema = z.object({
  name: z.string().min(1, 'Name is required'),
});

// src/modules/new-feature/ui/components/new-feature-card.tsx
export function NewFeatureCard({ feature }: { feature: NewFeature }) {
  return (
    <div className="border rounded-lg p-4">
      <h3 className="font-semibold">{feature.name}</h3>
    </div>
  );
}
```

---

## 📏 Code Standards

### TypeScript Guidelines
```typescript
// ✅ Good: Explicit interfaces
interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

// ✅ Good: Proper error handling
async function fetchUser(id: string): Promise<UserProfile> {
  try {
    const response = await api.users.getById.query({ id });
    return response;
  } catch (error) {
    console.error('Failed to fetch user:', error);
    throw new Error('User not found');
  }
}

// ❌ Avoid: Any types
const userData: any = await fetchUser(id);
```

### React Component Patterns
```typescript
// ✅ Good: Component with proper types
interface ButtonProps {
  variant?: 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  onClick?: () => void;
}

export function Button({ 
  variant = 'primary', 
  size = 'md', 
  children, 
  onClick 
}: ButtonProps) {
  return (
    <button
      className={cn(
        'rounded-lg font-medium transition-colors',
        {
          'bg-blue-600 text-white hover:bg-blue-700': variant === 'primary',
          'bg-gray-200 text-gray-800 hover:bg-gray-300': variant === 'secondary',
        },
        {
          'px-3 py-1.5 text-sm': size === 'sm',
          'px-4 py-2': size === 'md',
          'px-6 py-3 text-lg': size === 'lg',
        }
      )}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
```

### File Naming Conventions
```
Components:     PascalCase     (UserProfile.tsx)
Pages:          kebab-case     (user-profile.tsx)
Utilities:      camelCase      (formatDate.ts)
Constants:      UPPER_CASE     (API_ENDPOINTS.ts)
Types:          PascalCase     (UserTypes.ts)
```

### Import/Export Standards
```typescript
// ✅ Good: Named exports for components
export function UserCard({ user }: { user: User }) {
  return <div>{user.name}</div>;
}

// ✅ Good: Default export for pages
export default function UserProfilePage() {
  return <UserCard user={user} />;
}

// ✅ Good: Organized imports
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { api } from '@/trpc/client';
import { User } from '@/modules/auth/types';
```

---

## 🧪 Testing Guidelines

### Unit Testing Setup
```bash
# Install testing dependencies
npm install --save-dev @testing-library/react @testing-library/jest-dom vitest
```

### Test Structure
```typescript
// __tests__/components/Button.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '@/components/ui/button';

describe('Button Component', () => {
  it('renders with correct text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    fireEvent.click(screen.getByText('Click me'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

### API Testing
```typescript
// __tests__/api/meetings.test.ts
import { describe, it, expect } from 'vitest';
import { createCaller } from '@/trpc/server';

describe('Meetings API', () => {
  it('creates a meeting successfully', async () => {
    const caller = createCaller({
      user: { id: 'user-1', email: 'test@example.com' },
    });

    const meeting = await caller.meetings.create({
      title: 'Test Meeting',
      scheduledFor: new Date(),
    });

    expect(meeting).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        title: 'Test Meeting',
      })
    );
  });
});
```

---

## 🐛 Debugging

### Client-Side Debugging
```typescript
// React DevTools
// Install: https://chrome.google.com/webstore/detail/react-developer-tools

// Debug hooks
import { useDebugValue } from 'react';

function useCustomHook(value: string) {
  useDebugValue(value, (val) => `Custom Hook: ${val}`);
  return value.toUpperCase();
}

// Console debugging
function MyComponent() {
  console.log('🔍 Component render');
  
  useEffect(() => {
    console.log('📊 Effect triggered');
  }, []);
}
```

### Server-Side Debugging
```typescript
// tRPC debugging
export const debugRouter = createTRPCRouter({
  test: publicProcedure
    .input(z.object({ message: z.string() }))
    .query(({ input }) => {
      console.log('📥 Server received:', input);
      return { message: `Echo: ${input.message}` };
    }),
});

// Database debugging
const meetings = await db.query.meetings.findMany();
console.log('🗄️ Database query result:', meetings);
```

### Network Debugging
```bash
# View all network requests
# Chrome DevTools -> Network tab

# Stream debugging
# Enable in Stream dashboard -> Settings -> Debug mode

# Webhook debugging with ngrok
ngrok http 3000 --log=stdout
```

---

## ⚠️ Common Issues

### Installation Issues
```bash
# Issue: React 19 peer dependency conflicts
# Solution: Use legacy peer deps
npm install --legacy-peer-deps

# Issue: Node version conflicts
# Solution: Use Node 18+
nvm use 18
```

### Development Server Issues
```bash
# Issue: Port 3000 already in use
# Solution: Kill process or use different port
lsof -ti:3000 | xargs kill -9
# OR
npm run dev -- --port 3001
```