# Hello AI - Comprehensive UI Test Plan

## Table of Contents
1. [Test Strategy Overview](#test-strategy-overview)
2. [Test Environment Setup](#test-environment-setup)
3. [Critical User Flows](#critical-user-flows)
4. [Component Testing](#component-testing)
5. [Integration Testing](#integration-testing)
6. [E2E Test Scenarios](#e2e-test-scenarios)
7. [Performance Testing](#performance-testing)
8. [Accessibility Testing](#accessibility-testing)
9. [Test Automation Framework](#test-automation-framework)

---

## Test Strategy Overview

### Testing Objectives
- Ensure all critical user journeys work flawlessly
- Validate component behavior and interactions
- Verify data integrity throughout workflows
- Confirm responsive design across devices
- Maintain accessibility standards
- Monitor performance metrics

### Testing Levels
1. **Unit Tests**: Individual component logic
2. **Integration Tests**: Component interactions
3. **E2E Tests**: Complete user workflows
4. **Visual Regression**: UI consistency
5. **Performance Tests**: Load times and responsiveness
6. **Accessibility Tests**: WCAG compliance

### Tools & Frameworks
```javascript
// Recommended Testing Stack
{
  "unit": "Jest + React Testing Library",
  "integration": "Jest + MSW (Mock Service Worker)",
  "e2e": "Playwright or Cypress",
  "visual": "Percy or Chromatic",
  "performance": "Lighthouse CI",
  "accessibility": "axe-core + Pa11y"
}
```

---

## Test Environment Setup

### Prerequisites
```bash
# Install dependencies
npm install --save-dev \
  @testing-library/react \
  @testing-library/jest-dom \
  @testing-library/user-event \
  @playwright/test \
  msw \
  axe-core
```

### Test Database
```typescript
// Use separate test database
DATABASE_URL=postgresql://test_db
NEXT_PUBLIC_STREAM_API_KEY=test_key
OPENAI_API_KEY=test_key
```

### Mock Services
```typescript
// Mock Stream.io responses
const streamMocks = {
  createCall: jest.fn(),
  joinCall: jest.fn(),
  endCall: jest.fn()
};

// Mock OpenAI responses
const openAIMocks = {
  createCompletion: jest.fn(),
  analyzeTranscript: jest.fn()
};
```

---

## Critical User Flows

### 1. Blueprint Selection → Agent Creation → First Meeting

```typescript
describe('Complete Learning Journey Setup', () => {
  test('User can start learning journey from blueprint', async () => {
    // 1. Navigate to landing page
    await page.goto('/');
    
    // 2. Click on a blueprint book cover
    await page.click('.book-item:has-text("Think and Grow Rich")');
    
    // 3. Verify blueprint details page
    await expect(page).toHaveURL(/\/agent\/.+/);
    await expect(page.locator('h2')).toContainText('Think and Grow Rich');
    await expect(page.locator('text=by Napoleon Hill')).toBeVisible();
    
    // 4. View learning journey sessions
    const sessions = page.locator('.grid > div').filter({ hasText: 'Foundation of Success Thinking' });
    await expect(sessions).toBeVisible();
    
    // 5. Click "Start Session"
    await page.click('button:has-text("Start Session")');
    
    // 6. Verify redirect to meetings page with first meeting created
    await expect(page).toHaveURL('/meetings');
    
    // 7. Verify agent and first meeting created automatically
    const meetingRow = page.locator('.meeting-row:has-text("Foundation of Success Thinking")');
    await expect(meetingRow).toBeVisible();
    await expect(meetingRow.locator('.badge')).toContainText('upcoming');
  });
});
```

### 2. Meeting Lifecycle

```typescript
describe('Meeting Flow', () => {
  test('Complete meeting lifecycle', async () => {
    // Setup: Create meeting in "upcoming" status
    const meeting = await createTestMeeting();
    
    // 1. Navigate to meeting detail
    await page.goto(`/meetings/${meeting.id}`);
    
    // 2. Start meeting
    await page.click('button:has-text("Start Meeting")');
    
    // 3. Join call
    await page.click('button:has-text("Join Call")');
    await expect(page).toHaveURL(`/call/${meeting.id}`);
    
    // 4. Verify call active
    await expect(page.locator('[data-testid="call-status"]')).toContainText('Active');
    
    // 5. End call
    await page.click('button:has-text("End Call")');
    
    // 6. Verify processing state
    await expect(page).toHaveURL(`/meetings/${meeting.id}`);
    await expect(page.locator('[data-testid="meeting-status"]')).toContainText('Processing');
    
    // 7. Wait for completion (mocked)
    await page.waitForSelector('text=Meeting Summary', { timeout: 10000 });
    
    // 8. Verify next meeting created
    await page.goto('/meetings');
    const meetings = page.locator('[data-testid="meeting-row"]');
    await expect(meetings).toHaveCount(2);
  });
});
```

### 3. Progress Tracking

```typescript
describe('Learning Progress', () => {
  test('Progress updates after meeting completion', async () => {
    // Complete first meeting
    await completeMeeting(firstMeetingId);
    
    // Navigate to agent details
    await page.goto(`/agents/${agentId}`);
    
    // Verify progress displayed
    const progress = page.locator('[data-testid="progress-tracker"]');
    await expect(progress).toContainText('1 of 13 sessions completed');
    await expect(progress).toContainText('Foundation of Success Thinking ✓');
  });
});
```

---

## Component Testing

### 1. AgentCover Component

```typescript
describe('AgentCover', () => {
  it('renders book cover with 3D effect', () => {
    render(<AgentCover imageUrl="/book-cover.jpg" size="large" />);
    
    const bookItem = screen.getByRole('img', { name: 'Book Cover' });
    expect(bookItem).toBeInTheDocument();
    expect(bookItem).toHaveAttribute('src', expect.stringContaining('book-cover.jpg'));
    
    const bookWrapper = bookItem.closest('.book-item');
    expect(bookWrapper).toHaveClass('scale-100'); // large size
  });
  
  it('handles missing image with placeholder', () => {
    render(<AgentCover imageUrl="" />);
    
    const bookImage = screen.getByRole('img', { name: 'Book Cover' });
    expect(bookImage).toHaveAttribute('src', expect.stringContaining('placeholder.svg'));
  });
  
  it('applies correct size scaling', () => {
    const { rerender } = render(<AgentCover imageUrl="/cover.jpg" size="small" />);
    let bookItem = screen.getByRole('img').closest('.book-item');
    expect(bookItem).toHaveClass('scale-75');
    
    rerender(<AgentCover imageUrl="/cover.jpg" size="default" />);
    bookItem = screen.getByRole('img').closest('.book-item');
    expect(bookItem).toHaveClass('scale-100');
  });
});
```

### 2. Aurora Component (formerly AudioVisualizer3D)

```typescript
describe('Aurora', () => {
  it('initializes WebGL context with OGL', () => {
    const { container } = render(
      <Aurora 
        colorStops={["#5227FF", "#7cff67", "#5227FF"]}
        amplitude={1.0}
        blend={0.5}
      />
    );
    
    // Wait for canvas to be created
    waitFor(() => {
      const canvas = container.querySelector('canvas');
      expect(canvas).toBeInTheDocument();
      expect(canvas.style.backgroundColor).toBe('transparent');
    });
  });
  
  it('updates uniforms based on props', async () => {
    const { rerender } = render(
      <Aurora amplitude={1.0} blend={0.5} />
    );
    
    rerender(<Aurora amplitude={2.0} blend={0.8} />);
    
    // Verify animation frame is requested
    await waitFor(() => {
      expect(mockRequestAnimationFrame).toHaveBeenCalled();
    });
  });
  
  it('cleans up resources on unmount', () => {
    const { unmount } = render(<Aurora />);
    const mockLoseContext = jest.fn();
    
    // Mock WebGL context
    HTMLCanvasElement.prototype.getContext = jest.fn().mockReturnValue({
      getExtension: jest.fn().mockReturnValue({ loseContext: mockLoseContext })
    });
    
    unmount();
    
    expect(mockLoseContext).toHaveBeenCalled();
  });
});
```

### 3. Meeting Table Components

```typescript
describe('Meeting Table Columns', () => {
  it('displays meeting information with agent details', () => {
    const mockMeeting = {
      name: 'Foundation of Success Thinking',
      agent: { name: 'Think and Grow Rich Journey' },
      status: 'upcoming',
      startedAt: new Date('2024-01-15'),
      duration: 1800 // 30 minutes
    };
    
    render(<MeetingTableRow meeting={mockMeeting} />);
    
    expect(screen.getByText('Foundation of Success Thinking')).toBeInTheDocument();
    expect(screen.getByText('Think and Grow Rich Journey')).toBeInTheDocument();
    expect(screen.getByText('Jan 15')).toBeInTheDocument();
    
    const statusBadge = screen.getByText('upcoming').closest('.badge');
    expect(statusBadge).toHaveClass('bg-yellow-500/20');
  });
  
  it('shows animated spinner for processing status', () => {
    const mockMeeting = { ...baseMeeting, status: 'processing' };
    render(<MeetingTableRow meeting={mockMeeting} />);
    
    const icon = screen.getByTestId('status-icon');
    expect(icon).toHaveClass('animate-spin');
  });
});
```

### 4. GeneratedAvatar Component

```typescript
describe('GeneratedAvatar', () => {
  it('generates consistent avatar based on seed', () => {
    const seed = 'test-agent-name';
    const { rerender } = render(
      <GeneratedAvatar seed={seed} variant="botttsNeutral" className="size-10" />
    );
    
    const firstRender = screen.getByRole('img').src;
    
    rerender(<GeneratedAvatar seed={seed} variant="botttsNeutral" className="size-10" />);
    const secondRender = screen.getByRole('img').src;
    
    expect(firstRender).toBe(secondRender);
  });
  
  it('applies size classes correctly', () => {
    render(<GeneratedAvatar seed="test" className="size-16" />);
    
    const avatar = screen.getByRole('img');
    expect(avatar.closest('div')).toHaveClass('size-16');
  });
  
  it('uses different avatars for different seeds', () => {
    const { rerender } = render(<GeneratedAvatar seed="agent1" />);
    const firstSrc = screen.getByRole('img').src;
    
    rerender(<GeneratedAvatar seed="agent2" />);
    const secondSrc = screen.getByRole('img').src;
    
    expect(firstSrc).not.toBe(secondSrc);
  });
});
```

### 5. Meeting Status Components

```typescript
describe('Meeting Status States', () => {
  it('renders upcoming state correctly', () => {
    render(<UpcomingState meetingId="123" />);
    
    expect(screen.getByText('Start Meeting')).toBeInTheDocument();
    expect(screen.getByTestId('meeting-instructions')).toBeInTheDocument();
  });
  
  it('renders processing state with loading indicator', () => {
    render(<ProcessingState />);
    
    expect(screen.getByText('Analyzing conversation...')).toBeInTheDocument();
    const spinner = screen.getByTestId('processing-spinner');
    expect(spinner).toHaveClass('animate-spin');
  });
  
  it('renders completed state with AI-generated summary', () => {
    const mockData = {
      summary: 'Great progress on understanding desire',
      progress: [{ 
        session_id: 'session_01',
        session_status: 'completed',
        criteria_met: ['Written purpose statement'],
        criteria_pending: [],
        completion_notes: 'Successfully articulated purpose'
      }]
    };
    
    render(<CompletedState data={mockData} />);
    
    expect(screen.getByText(mockData.summary)).toBeInTheDocument();
    expect(screen.getByText('Written purpose statement')).toBeInTheDocument();
    expect(screen.getByText('Successfully articulated purpose')).toBeInTheDocument();
  });
});
```

---

## Integration Testing

### 1. tRPC API Integration

```typescript
describe('tRPC Integration', () => {
  beforeEach(() => {
    server.use(
      rest.post('/api/trpc/agents.create', (req, res, ctx) => {
        return res(ctx.json({
          result: { data: mockAgent }
        }));
      })
    );
  });
  
  it('creates agent from blueprint', async () => {
    const { result } = renderHook(() => 
      useTRPC().agents.createFromBlueprint.useMutation()
    );
    
    await act(async () => {
      await result.current.mutateAsync({
        blueprintId: 'blueprint-123',
        customName: 'My Journey'
      });
    });
    
    expect(result.current.data).toEqual(expect.objectContaining({
      name: 'My Journey',
      blueprintId: 'blueprint-123'
    }));
  });
});
```

### 2. Real-time Features

```typescript
describe('Real-time Integration', () => {
  it('updates UI when call status changes', async () => {
    const mockCall = createMockStreamCall();
    
    render(<CallProvider meetingId="123" />);
    
    // Simulate call state change
    act(() => {
      mockCall.emit('call.session_started');
    });
    
    await waitFor(() => {
      expect(screen.getByTestId('call-status')).toHaveTextContent('Active');
    });
  });
});
```

---

## E2E Test Scenarios

### Scenario 1: New User Journey

```typescript
test('New user complete first session', async ({ page }) => {
  // 1. Sign up
  await page.goto('/sign-up');
  await page.fill('input[name="email"]', 'test@example.com');
  await page.fill('input[name="password"]', 'TestPass123!');
  await page.click('button[type="submit"]');
  
  // 2. Browse blueprints
  await expect(page).toHaveURL('/');
  await page.click('.blueprint-card:first-child');
  
  // 3. Start journey
  await page.click('button:has-text("Start Session")');
  
  // 4. Complete first meeting
  await page.click('button:has-text("Start Meeting")');
  await page.click('button:has-text("Join Call")');
  
  // Simulate conversation
  await page.waitForTimeout(5000); // Mock conversation time
  await page.click('button:has-text("End Call")');
  
  // 5. Verify summary
  await page.waitForSelector('.meeting-summary');
  await expect(page.locator('.meeting-summary')).toContainText('Progress Summary');
});
```

### Scenario 2: Returning User

```typescript
test('Returning user continues journey', async ({ page }) => {
  // Login
  await loginAsUser(page, 'existing@example.com');
  
  // Navigate to agents
  await page.click('a:has-text("Agents")');
  
  // Select existing agent
  await page.click('.agent-row:has-text("Think and Grow Rich Journey")');
  
  // View meetings
  await expect(page.locator('.meeting-count')).toContainText('3 meetings');
  
  // Continue with next meeting
  await page.click('.meeting-row:has-text("upcoming"):first-child');
  await page.click('button:has-text("Start Meeting")');
});
```

### Scenario 3: Blueprint-based Agent Detail View

```typescript
test('Blueprint-based agent shows proper information', async ({ page }) => {
  // Navigate to blueprint-based agent
  await page.goto('/agents/blueprint-agent-id');
  
  // Verify agent information
  await expect(page.locator('h2')).toContainText('Think and Grow Rich Journey');
  
  // Check for blueprint indicator
  const blueprintIcon = page.locator('[data-icon="BookOpenIcon"]');
  await expect(blueprintIcon).toBeVisible();
  
  // Verify learning journey text
  await expect(page.locator('text=Learning Journey')).toBeVisible();
  
  // Check agent avatar
  const avatar = page.locator('.avatar').first();
  await expect(avatar).toBeVisible();
  
  // Verify meetings section
  await expect(page.locator('text=Recent Meetings')).toBeVisible();
  const meetings = page.locator('.meeting-item');
  if (await meetings.count() > 0) {
    await expect(meetings.first()).toContainText('upcoming');
  }
});
```

### Scenario 4: 3D Book Cover Interactions

```typescript
test('Book covers display with 3D effects', async ({ page }) => {
  await page.goto('/');
  
  // Wait for book covers to load
  await page.waitForSelector('.book-item');
  
  // Test hover effect
  const firstBook = page.locator('.book-item').first();
  await firstBook.hover();
  
  // Verify 3D transform is applied
  const bookCover = firstBook.locator('.book-cover');
  await expect(bookCover).toHaveCSS('transform', /rotateY\(0deg\)/);
  
  // Test click navigation
  await firstBook.click();
  await expect(page).toHaveURL(/\/agent\/.+/);
  
  // Verify large book cover on detail page
  const largeCover = page.locator('.book-item.scale-100');
  await expect(largeCover).toBeVisible();
});
```

---

## Performance Testing

### Core Web Vitals

```typescript
describe('Performance Metrics', () => {
  it('meets Core Web Vitals targets', async () => {
    const metrics = await measurePageMetrics('/');
    
    expect(metrics.LCP).toBeLessThan(2500); // Largest Contentful Paint
    expect(metrics.FID).toBeLessThan(100);  // First Input Delay
    expect(metrics.CLS).toBeLessThan(0.1);  // Cumulative Layout Shift
  });
});
```

### Load Testing

```typescript
describe('Load Performance', () => {
  it('handles concurrent users', async () => {
    const results = await loadTest({
      url: '/api/trpc/meetings.getMany',
      concurrent: 100,
      duration: '30s'
    });
    
    expect(results.avgResponseTime).toBeLessThan(200);
    expect(results.errorRate).toBeLessThan(0.01);
  });
  
  it('blueprint page loads efficiently', async () => {
    const metrics = await measurePageMetrics('/agent/[blueprintId]');
    
    expect(metrics.LCP).toBeLessThan(2000); // Book cover should load quickly
    expect(metrics.TTI).toBeLessThan(3000); // Time to Interactive
    expect(metrics.totalBlockingTime).toBeLessThan(300);
  });
});
```

---

## Accessibility Testing

### WCAG Compliance

```typescript
describe('Accessibility', () => {
  it('has no accessibility violations on landing page', async () => {
    const { container } = render(<LandingPage />);
    const results = await axe(container);
    
    expect(results).toHaveNoViolations();
  });
  
  it('supports keyboard navigation', async () => {
    render(<Navigation />);
    
    const firstLink = screen.getByRole('link', { name: 'Agents' });
    firstLink.focus();
    
    // Tab to next item
    userEvent.tab();
    
    expect(screen.getByRole('link', { name: 'Meetings' })).toHaveFocus();
  });
  
  it('announces dynamic content changes', async () => {
    render(<MeetingStatus status="processing" />);
    
    const liveRegion = screen.getByRole('status');
    expect(liveRegion).toHaveTextContent('Processing your meeting');
  });
  
  it('provides proper alt text for book covers', () => {
    render(<AgentCover imageUrl="/cover.jpg" />);
    
    const bookImage = screen.getByRole('img', { name: 'Book Cover' });
    expect(bookImage).toBeInTheDocument();
  });
  
  it('supports keyboard navigation for meeting rows', async () => {
    render(<MeetingTable meetings={mockMeetings} />);
    
    const firstRow = screen.getAllByRole('row')[1]; // Skip header
    firstRow.focus();
    
    // Tab to next row
    userEvent.tab();
    
    const secondRow = screen.getAllByRole('row')[2];
    expect(secondRow).toHaveFocus();
  });
});
```

---

## Test Automation Framework

### CI/CD Integration

```yaml
# .github/workflows/test.yml
name: UI Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      
      - name: Install dependencies
        run: npm ci
        
      - name: Run unit tests
        run: npm run test:unit
        
      - name: Run integration tests
        run: npm run test:integration
        
      - name: Run E2E tests
        run: npm run test:e2e
        
      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

### Test Data Management

```typescript
// Test data factories
export const factories = {
  agent: (overrides = {}) => ({
    id: faker.datatype.uuid(),
    name: faker.company.name(),
    blueprintId: faker.datatype.uuid(),
    ...overrides
  }),
  
  meeting: (overrides = {}) => ({
    id: faker.datatype.uuid(),
    name: faker.lorem.sentence(),
    status: 'upcoming',
    ...overrides
  })
};
```

### Visual Regression Setup

```javascript
// percy.config.js
module.exports = {
  version: 2,
  snapshot: {
    widths: [375, 768, 1280],
    minHeight: 1024
  },
  discovery: {
    allowedHostnames: ['localhost'],
    networkIdleTimeout: 750
  }
};
```

---

## Test Execution Matrix

| Test Type | Frequency | Duration | Coverage Target |
|-----------|-----------|----------|-----------------|
| Unit | On commit | <1 min | 80% |
| Integration | On PR | <5 min | 70% |
| E2E | On PR | <15 min | Critical paths |
| Visual | Daily | <10 min | Key pages |
| Performance | Weekly | <30 min | Core metrics |
| Accessibility | On deploy | <5 min | All pages |

---

## Recent UI Changes Requiring Test Updates

### Major Component Changes
1. **AgentCover Component**: Now uses CSS-based 3D transforms instead of simple image display
   - Test 3D rotation effects on hover
   - Verify size scaling (small, default, large)
   - Ensure proper fallback to placeholder images

2. **Aurora Background**: Replaced AudioVisualizer3D with OGL-based WebGL implementation
   - Test WebGL context initialization
   - Verify gradient animation performance
   - Test resource cleanup on unmount

3. **Meeting Table Redesign**: Enhanced with icons and improved status display
   - Test new status icons (ClockArrowUpIcon, LoaderIcon, etc.)
   - Verify animated states for processing
   - Test agent information display in meeting rows

4. **GeneratedAvatar Integration**: Now used throughout the application
   - Test consistent avatar generation based on seed
   - Verify proper sizing across different use cases
   - Test variant consistency (botttsNeutral)

### UI Flow Changes
1. **Blueprint Detail Page**: Enhanced with session cards and completion criteria
   - Test session expansion/collapse
   - Verify completion criteria display
   - Test "Start Session" flow with automatic agent creation

2. **Agent Detail Page**: Now differentiates between blueprint and custom agents
   - Test blueprint indicator display
   - Verify learning journey information
   - Test meeting list pagination and navigation

3. **Meeting Status Flow**: Improved visual feedback and state management
   - Test real-time status updates
   - Verify processing animations
   - Test completion state with AI-generated summaries

### Performance Considerations
1. **WebGL Resources**: Aurora component requires proper cleanup testing
2. **Image Loading**: Book covers need efficient loading strategies
3. **Animation Performance**: 3D transforms and transitions need smooth performance

### Accessibility Updates
1. **Book Cover Alt Text**: Ensure proper image descriptions
2. **Status Icons**: Verify screen reader announcements
3. **Keyboard Navigation**: Test focus management in redesigned components

---

*This comprehensive UI test plan ensures the Hello AI platform maintains high quality and reliability across all user interactions, with specific attention to recent component and flow updates.*