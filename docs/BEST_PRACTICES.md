# HelloAI - Development Best Practices & Standards

## 📋 Table of Contents

1. [Project Organization](#project-organization)
2. [Code Quality Standards](#code-quality-standards)
3. [TypeScript Best Practices](#typescript-best-practices)
4. [Database Design Patterns](#database-design-patterns)
5. [API Design Standards](#api-design-standards)
6. [Authentication & Security](#authentication--security)
7. [Real-time Communication](#real-time-communication)
8. [Background Job Processing](#background-job-processing)
9. [Component Architecture](#component-architecture)
10. [Error Handling](#error-handling)
11. [Testing Strategies](#testing-strategies)
12. [Performance Optimization](#performance-optimization)
13. [Development Workflow](#development-workflow)
14. [Deployment & CI/CD](#deployment--cicd)
15. [Monitoring & Observability](#monitoring--observability)

---

## 🗂️ Project Organization

### Module-Based Architecture

Follow the established modular pattern for all new features:

```
src/modules/[feature]/
├── ui/
│   ├── components/     # Feature-specific UI components
│   └── views/         # Page-level components
├── server/
│   └── procedures.ts  # tRPC procedures
├── hooks/             # Feature-specific React hooks
├── schemas.ts         # Zod validation schemas
├── types.ts          # TypeScript type definitions
└── constants.ts      # Feature constants
```

### **✅ DO:**
- Group related functionality into cohesive modules
- Keep modules independent and loosely coupled
- Use consistent naming conventions across modules
- Place shared utilities in `/src/lib/`
- Keep module-specific logic within the module boundaries

### **❌ DON'T:**
- Create circular dependencies between modules
- Mix business logic with UI components
- Place feature-specific code in shared directories
- Create deeply nested folder structures (max 3 levels)

---

## 🎯 Code Quality Standards

### File Naming Conventions

```typescript
// Components: PascalCase
UserProfile.tsx
MeetingCard.tsx
AgentSettings.tsx

// Hooks: camelCase with "use" prefix
useUserProfile.ts
useMeetingData.ts
useAgentSettings.ts

// Utilities: camelCase
formatDate.ts
generateId.ts
validateEmail.ts

// Types: PascalCase
UserProfile.types.ts
Meeting.types.ts
Agent.types.ts

// Constants: UPPER_SNAKE_CASE
export const MAX_FILE_SIZE = 5 * 1024 * 1024;
export const DEFAULT_TIMEOUT = 30000;
```

### Import Organization

```typescript
// 1. External libraries
import { useState, useEffect } from 'react';
import { z } from 'zod';
import { eq } from 'drizzle-orm';

// 2. Internal utilities and configs
import { db } from '@/db';
import { cn } from '@/lib/utils';

// 3. Components
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

// 4. Types and schemas
import type { User } from '@/db/schema';
import { userSchema } from './schemas';

// 5. Relative imports
import './styles.css';
```

---

## 🔷 TypeScript Best Practices

### Type Definitions

```typescript
// ✅ Use specific types instead of 'any'
interface UserProfile {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
}

// ✅ Use union types for known values
type MeetingStatus = 'upcoming' | 'active' | 'completed' | 'processing' | 'cancelled';

// ✅ Use utility types for transformations
type CreateUserProfile = Omit<UserProfile, 'id' | 'createdAt'>;
type UpdateUserProfile = Partial<Pick<UserProfile, 'name' | 'email'>>;

// ✅ Use const assertions for readonly data
const MEETING_STATUSES = ['upcoming', 'active', 'completed'] as const;
type MeetingStatus = typeof MEETING_STATUSES[number];
```

### Generic Constraints

```typescript
// ✅ Use generic constraints for type safety
interface Repository<T extends { id: string }> {
  findById(id: string): Promise<T | null>;
  create(data: Omit<T, 'id'>): Promise<T>;
  update(id: string, data: Partial<T>): Promise<T>;
}

// ✅ Use branded types for better type safety
type UserId = string & { readonly brand: unique symbol };
type AgentId = string & { readonly brand: unique symbol };
```

---

## 🗄️ Database Design Patterns

### Schema Design

```typescript
// ✅ Use consistent field naming
export const meetings = pgTable("meetings", {
  id: text("id").primaryKey().$defaultFn(() => nanoid()),
  name: text("name").notNull(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  status: meetingStatus("status").notNull().default("upcoming"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ✅ Use enums for controlled values
export const meetingStatus = pgEnum("meeting_status", [
  "upcoming", "active", "completed", "processing", "cancelled"
]);

// ✅ Always include audit fields
createdAt: timestamp("created_at").notNull().defaultNow(),
updatedAt: timestamp("updated_at").notNull().defaultNow(),
```

### Query Patterns

```typescript
// ✅ Use typed queries with proper error handling
export async function getMeetingsByUserId(userId: string) {
  try {
    return await db
      .select()
      .from(meetings)
      .where(eq(meetings.userId, userId))
      .orderBy(desc(meetings.createdAt));
  } catch (error) {
    console.error('Failed to fetch meetings:', error);
    throw new Error('Unable to fetch meetings');
  }
}

// ✅ Use transactions for complex operations
export async function createMeetingWithAgent(
  meetingData: CreateMeetingData,
  agentData: CreateAgentData
) {
  return await db.transaction(async (tx) => {
    const [agent] = await tx.insert(agents).values(agentData).returning();
    const [meeting] = await tx.insert(meetings).values({
      ...meetingData,
      agentId: agent.id,
    }).returning();
    
    return { meeting, agent };
  });
}
```

---

## 🚀 API Design Standards

### tRPC Procedures

```typescript
// ✅ Use descriptive procedure names
export const meetingsRouter = createTRPCRouter({
  // Queries: get*, list*, find*
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => { ... }),
  
  listByUser: protectedProcedure
    .input(z.object({ 
      userId: z.string(),
      limit: z.number().min(1).max(100).default(20),
      cursor: z.string().optional()
    }))
    .query(async ({ input, ctx }) => { ... }),

  // Mutations: create*, update*, delete*
  create: premiumProcedure("meetings")
    .input(meetingsInsertSchema)
    .mutation(async ({ input, ctx }) => { ... }),
    
  updateById: protectedProcedure
    .input(meetingsUpdateSchema)
    .mutation(async ({ input, ctx }) => { ... }),
});
```

### Input Validation

```typescript
// ✅ Use Zod for comprehensive validation
export const createMeetingSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
  agentId: z.string().uuid("Invalid agent ID"),
  scheduledAt: z.date().min(new Date(), "Cannot schedule in the past"),
  duration: z.number().min(5).max(480), // 5 minutes to 8 hours
});

// ✅ Extend base schemas for updates
export const updateMeetingSchema = createMeetingSchema.partial().extend({
  id: z.string().uuid("Invalid meeting ID"),
});
```

### Error Handling

```typescript
// ✅ Use consistent error patterns
export const meetingsProcedure = protectedProcedure
  .input(z.object({ id: z.string() }))
  .query(async ({ input, ctx }) => {
    const meeting = await db.query.meetings.findFirst({
      where: and(
        eq(meetings.id, input.id),
        eq(meetings.userId, ctx.auth.user.id)
      ),
    });

    if (!meeting) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Meeting not found",
      });
    }

    return meeting;
  });
```

---

## 🔐 Authentication & Security

### Route Protection

```typescript
// ✅ Use middleware for protected routes
export const protectedProcedure = baseProcedure.use(async ({ ctx, next }) => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    throw new TRPCError({ 
      code: "UNAUTHORIZED", 
      message: "Authentication required" 
    });
  }

  return next({ ctx: { ...ctx, auth: session } });
});

// ✅ Implement resource-level authorization
export const meetingOwnerProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  // Additional authorization logic here
  return next({ ctx });
});
```

### Data Sanitization

```typescript
// ✅ Sanitize user inputs
export function sanitizeUserInput(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential XSS characters
    .substring(0, 1000); // Limit length
}

// ✅ Use parameterized queries (Drizzle handles this)
const userMeetings = await db
  .select()
  .from(meetings)
  .where(eq(meetings.userId, userId)); // Safe from SQL injection
```

---

## 📡 Real-time Communication

### Stream.io Integration

```typescript
// ✅ Token management
export async function generateStreamToken(userId: string) {
  await streamVideo.upsertUsers([{
    id: userId,
    name: user.name,
    role: "admin",
    image: user.image ?? generateAvatarUri({ seed: user.name }),
  }]);

  const expirationTime = Math.floor(Date.now() / 1000) + 3600; // 1 hour
  const issuedAt = Math.floor(Date.now() / 1000) - 60;

  return streamVideo.generateUserToken({
    user_id: userId,
    exp: expirationTime,
    validity_in_seconds: issuedAt,
  });
}

// ✅ Error handling for real-time operations
export function useStreamCall(callId: string) {
  const [call, setCall] = useState<Call | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initCall = async () => {
      try {
        const streamCall = streamVideo.call('default', callId);
        await streamCall.join();
        setCall(streamCall);
      } catch (err) {
        setError('Failed to join call');
        console.error('Call join error:', err);
      }
    };

    initCall();
  }, [callId]);

  return { call, error };
}
```

---

## ⚙️ Background Job Processing

### Inngest Function Design

```typescript
// ✅ Idempotent functions
export const processTranscript = inngest.createFunction(
  { 
    id: "meetings/process-transcript",
    retries: 3,
    concurrency: { limit: 10 }
  },
  { event: "meetings/transcript-ready" },
  async ({ event, step }) => {
    // ✅ Use steps for reliability
    const transcript = await step.run("fetch-transcript", async () => {
      return fetchTranscript(event.data.transcriptUrl);
    });

    const summary = await step.run("generate-summary", async () => {
      return generateSummary(transcript);
    });

    await step.run("save-results", async () => {
      return updateMeetingWithSummary(event.data.meetingId, summary);
    });
  }
);

// ✅ Handle failures gracefully
export const processTranscriptWithRetry = inngest.createFunction(
  { id: "meetings/process-transcript-retry" },
  { event: "meetings/transcript-failed" },
  async ({ event, step }) => {
    const retryCount = event.data.retryCount || 0;
    
    if (retryCount >= 3) {
      await step.run("mark-failed", async () => {
        await updateMeetingStatus(event.data.meetingId, 'failed');
      });
      return;
    }

    // Trigger retry with exponential backoff
    await step.sendEvent("retry-processing", {
      name: "meetings/transcript-ready",
      data: {
        ...event.data,
        retryCount: retryCount + 1,
      },
      delay: `${Math.pow(2, retryCount)}s`,
    });
  }
);
```

---

## 🧩 Component Architecture

### Component Structure

```typescript
// ✅ Use compound components for complex UI
export const MeetingCard = {
  Root: ({ children, className, ...props }: MeetingCardProps) => (
    <Card className={cn("meeting-card", className)} {...props}>
      {children}
    </Card>
  ),
  
  Header: ({ title, status }: MeetingCardHeaderProps) => (
    <CardHeader>
      <CardTitle>{title}</CardTitle>
      <StatusBadge status={status} />
    </CardHeader>
  ),
  
  Content: ({ children }: MeetingCardContentProps) => (
    <CardContent>{children}</CardContent>
  ),
  
  Actions: ({ children }: MeetingCardActionsProps) => (
    <CardFooter className="flex gap-2">
      {children}
    </CardFooter>
  ),
};

// Usage
<MeetingCard.Root>
  <MeetingCard.Header title="Team Standup" status="upcoming" />
  <MeetingCard.Content>
    <p>Daily team sync meeting</p>
  </MeetingCard.Content>
  <MeetingCard.Actions>
    <Button>Join</Button>
    <Button variant="outline">Edit</Button>
  </MeetingCard.Actions>
</MeetingCard.Root>
```

### Custom Hooks

```typescript
// ✅ Encapsulate complex logic in custom hooks
export function useMeetingData(meetingId: string) {
  const { data: meeting, isLoading, error } = trpc.meetings.getById.useQuery(
    { id: meetingId },
    { enabled: !!meetingId }
  );

  const updateMeeting = trpc.meetings.updateById.useMutation({
    onSuccess: () => {
      // Invalidate queries
      trpc.meetings.getById.invalidate({ id: meetingId });
    },
  });

  const deleteMeeting = trpc.meetings.remove.useMutation({
    onSuccess: () => {
      // Redirect or show success message
    },
  });

  return {
    meeting,
    isLoading,
    error,
    updateMeeting: updateMeeting.mutate,
    deleteMeeting: deleteMeeting.mutate,
    isUpdating: updateMeeting.isLoading,
    isDeleting: deleteMeeting.isLoading,
  };
}
```

---

## 🚨 Error Handling

### Error Boundaries

```typescript
// ✅ Implement error boundaries for feature modules
export class MeetingErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Meeting error:', error, errorInfo);
    // Send to monitoring service
  }

  render() {
    if (this.state.hasError) {
      return <MeetingErrorFallback error={this.state.error} />;
    }

    return this.props.children;
  }
}
```

### Global Error Handling

```typescript
// ✅ Centralized error handling
export function handleApiError(error: unknown) {
  if (error instanceof TRPCError) {
    switch (error.code) {
      case 'UNAUTHORIZED':
        redirect('/login');
        break;
      case 'FORBIDDEN':
        toast.error('Access denied');
        break;
      case 'NOT_FOUND':
        toast.error('Resource not found');
        break;
      default:
        toast.error('An error occurred');
    }
  } else {
    console.error('Unexpected error:', error);
    toast.error('Something went wrong');
  }
}
```

---

## 🧪 Testing Strategies

### Unit Testing

```typescript
// ✅ Test business logic functions
describe('generateMeetingSummary', () => {
  it('should generate summary from transcript', () => {
    const transcript = [
      { speaker: 'John', content: 'Hello everyone' },
      { speaker: 'Jane', content: 'Hi John, how are you?' },
    ];
    
    const summary = generateMeetingSummary(transcript);
    
    expect(summary).toContain('John');
    expect(summary).toContain('Jane');
    expect(summary.length).toBeGreaterThan(0);
  });
});

// ✅ Test React hooks
import { renderHook, waitFor } from '@testing-library/react';

describe('useMeetingData', () => {
  it('should fetch meeting data', async () => {
    const { result } = renderHook(() => useMeetingData('meeting-1'));
    
    await waitFor(() => {
      expect(result.current.meeting).toBeDefined();
    });
  });
});
```

### Integration Testing

```typescript
// ✅ Test API endpoints
describe('meetings API', () => {
  it('should create a meeting', async () => {
    const caller = createCaller(mockContext);
    
    const meeting = await caller.meetings.create({
      name: 'Test Meeting',
      agentId: 'agent-1',
    });
    
    expect(meeting.name).toBe('Test Meeting');
    expect(meeting.agentId).toBe('agent-1');
  });
});
```

---

## ⚡ Performance Optimization

### Database Optimization

```typescript
// ✅ Use indexes for frequently queried fields
export const meetings = pgTable("meetings", {
  // ... other fields
  userId: text("user_id").notNull().references(() => user.id),
  status: meetingStatus("status").notNull().default("upcoming"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  // Indexes for common queries
  userIdIdx: index("meetings_user_id_idx").on(table.userId),
  statusIdx: index("meetings_status_idx").on(table.status),
  createdAtIdx: index("meetings_created_at_idx").on(table.createdAt),
  userStatusIdx: index("meetings_user_status_idx").on(table.userId, table.status),
}));

// ✅ Use pagination for large datasets
export const getMeetings = protectedProcedure
  .input(z.object({
    limit: z.number().min(1).max(100).default(20),
    cursor: z.string().optional(),
  }))
  .query(async ({ input, ctx }) => {
    const meetings = await db
      .select()
      .from(meetings)
      .where(eq(meetings.userId, ctx.auth.user.id))
      .orderBy(desc(meetings.createdAt))
      .limit(input.limit + 1)
      .offset(input.cursor ? parseInt(input.cursor) : 0);

    const hasNextPage = meetings.length > input.limit;
    const items = hasNextPage ? meetings.slice(0, -1) : meetings;

    return {
      items,
      nextCursor: hasNextPage ? String(items.length) : undefined,
    };
  });
```

### React Optimization

```typescript
// ✅ Use React.memo for expensive components
export const MeetingList = React.memo(({ meetings }: MeetingListProps) => {
  return (
    <div className="space-y-4">
      {meetings.map((meeting) => (
        <MeetingCard key={meeting.id} meeting={meeting} />
      ))}
    </div>
  );
});

// ✅ Use useMemo for expensive calculations
export function MeetingAnalytics({ meetings }: MeetingAnalyticsProps) {
  const analytics = useMemo(() => {
    return {
      totalMeetings: meetings.length,
      completedMeetings: meetings.filter(m => m.status === 'completed').length,
      averageDuration: calculateAverageDuration(meetings),
      topAgents: getTopAgents(meetings),
    };
  }, [meetings]);

  return <AnalyticsDisplay data={analytics} />;
}

// ✅ Use useCallback for event handlers
export function MeetingForm({ onSubmit }: MeetingFormProps) {
  const handleSubmit = useCallback((data: MeetingFormData) => {
    onSubmit(data);
  }, [onSubmit]);

  return <form onSubmit={handleSubmit}>...</form>;
}
```

---

## 🔄 Development Workflow

### Git Workflow

```bash
# ✅ Use conventional commits
git commit -m "feat: add meeting transcription feature"
git commit -m "fix: resolve audio sync issues in calls"
git commit -m "docs: update API documentation"
git commit -m "refactor: improve meeting status handling"

# ✅ Feature branch naming
feature/meeting-transcription
fix/audio-sync-issues
docs/api-documentation
refactor/meeting-status
```

### Code Review Checklist

- [ ] **TypeScript**: No `any` types, proper type definitions
- [ ] **Security**: Input validation, authorization checks
- [ ] **Performance**: Efficient queries, proper indexing
- [ ] **Error Handling**: Proper error boundaries and fallbacks
- [ ] **Testing**: Unit tests for business logic
- [ ] **Documentation**: Clear comments for complex logic
- [ ] **Accessibility**: Proper ARIA labels and keyboard navigation

### Pre-commit Hooks

```json
// package.json
{
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged",
      "commit-msg": "commitlint -E HUSKY_GIT_PARAMS"
    }
  },
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ]
  }
}
```

---

## 🚀 Deployment & CI/CD

### Environment Management

```typescript
// ✅ Environment validation
import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  NEXTAUTH_SECRET: z.string().min(32),
  GITHUB_CLIENT_ID: z.string(),
  GITHUB_CLIENT_SECRET: z.string(),
  OPENAI_API_KEY: z.string(),
  STREAM_API_KEY: z.string(),
  STREAM_API_SECRET: z.string(),
});

export const env = envSchema.parse(process.env);
```

### Database Migrations

```bash
# ✅ Safe migration workflow
npm run db:generate    # Generate migration files
npm run db:check      # Check for conflicts
npm run db:push       # Apply to development
npm run db:migrate    # Apply to production
```

### Deployment Checklist

- [ ] **Environment Variables**: All required vars set in production
- [ ] **Database**: Migrations applied successfully
- [ ] **Build**: Application builds without errors
- [ ] **Tests**: All tests passing
- [ ] **Security**: No sensitive data in client bundle
- [ ] **Performance**: Bundle size optimized
- [ ] **Monitoring**: Error tracking and logging configured

---

## 📊 Monitoring & Observability

### Error Tracking

```typescript
// ✅ Structured logging
export function logError(error: Error, context: Record<string, any>) {
  console.error('Application Error:', {
    message: error.message,
    stack: error.stack,
    context,
    timestamp: new Date().toISOString(),
    userId: context.userId,
    requestId: context.requestId,
  });
}

// ✅ Performance monitoring
export function trackPerformance(operation: string, duration: number) {
  console.log('Performance Metric:', {
    operation,
    duration,
    timestamp: new Date().toISOString(),
  });
}
```

### Health Checks

```typescript
// ✅ API health check endpoint
export async function GET() {
  try {
    // Check database connection
    await db.select().from(user).limit(1);
    
    // Check external services
    const streamStatus = await checkStreamStatus();
    const openaiStatus = await checkOpenAIStatus();
    
    return Response.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'healthy',
        stream: streamStatus,
        openai: openaiStatus,
      },
    });
  } catch (error) {
    return Response.json(
      { status: 'unhealthy', error: error.message },
      { status: 503 }
    );
  }
}
```

---

## 📝 Documentation Standards

### API Documentation

```typescript
/**
 * Creates a new meeting with the specified agent
 * 
 * @param input - Meeting creation data
 * @param input.name - Meeting name (1-100 characters)
 * @param input.agentId - ID of the agent to include
 * @param input.scheduledAt - When the meeting should start
 * 
 * @returns The created meeting object
 * 
 * @throws {TRPCError} FORBIDDEN - When user has reached meeting limit
 * @throws {TRPCError} NOT_FOUND - When agent doesn't exist
 * 
 * @example
 * ```typescript
 * const meeting = await trpc.meetings.create.mutate({
 *   name: "Team Standup",
 *   agentId: "agent_123",
 *   scheduledAt: new Date("2024-01-15T10:00:00Z")
 * });
 * ```
 */
export const createMeeting = premiumProcedure("meetings")
  .input(meetingsInsertSchema)
  .mutation(async ({ input, ctx }) => {
    // Implementation...
  });
```

### Component Documentation

```typescript
/**
 * MeetingCard - Displays meeting information in a card format
 * 
 * @param meeting - Meeting data to display
 * @param onJoin - Callback when user clicks join button
 * @param onEdit - Callback when user clicks edit button
 * @param onDelete - Callback when user clicks delete button
 * 
 * @example
 * ```tsx
 * <MeetingCard
 *   meeting={meeting}
 *   onJoin={() => router.push(`/call/${meeting.id}`)}
 *   onEdit={() => setEditingMeeting(meeting)}
 *   onDelete={() => deleteMeeting(meeting.id)}
 * />
 * ```
 */
export interface MeetingCardProps {
  meeting: Meeting;
  onJoin?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}
```

---

## 🔧 Configuration Management

### Feature Flags

```typescript
// ✅ Feature flag system
export const features = {
  AI_TRANSCRIPTION: process.env.FEATURE_AI_TRANSCRIPTION === 'true',
  PREMIUM_FEATURES: process.env.FEATURE_PREMIUM === 'true',
  ANALYTICS_DASHBOARD: process.env.FEATURE_ANALYTICS === 'true',
} as const;

export function useFeatureFlag(flag: keyof typeof features) {
  return features[flag];
}
```

### Configuration Validation

```typescript
// ✅ Runtime configuration validation
export const config = {
  database: {
    url: env.DATABASE_URL,
    maxConnections: parseInt(env.DB_MAX_CONNECTIONS || '10'),
  },
  auth: {
    secret: env.NEXTAUTH_SECRET,
    providers: {
      github: {
        clientId: env.GITHUB_CLIENT_ID,
        clientSecret: env.GITHUB_CLIENT_SECRET,
      },
    },
  },
  ai: {
    openai: {
      apiKey: env.OPENAI_API_KEY,
      model: env.OPENAI_MODEL || 'gpt-4',
    },
  },
} as const;
```

---

## 🎯 Summary

This document outlines the key best practices for developing and maintaining the HelloAI application. Following these guidelines ensures:

- **Consistency** across the codebase
- **Maintainability** for future development
- **Performance** optimization
- **Security** best practices
- **Developer Experience** improvements

Remember to:
1. **Review** this document regularly
2. **Update** practices as the project evolves
3. **Share** knowledge with team members
4. **Enforce** standards through code reviews
5. **Measure** and improve based on metrics

For questions or suggestions about these practices, please refer to the team leads or create an issue in the project repository.