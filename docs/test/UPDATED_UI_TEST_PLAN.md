# Hello AI - Revised UI Test Plan (2024)

## Table of Contents
1. [Recent UI Changes](#recent-ui-changes)
2. [Updated Test Strategy](#updated-test-strategy)
3. [Critical User Flows (Updated)](#critical-user-flows-updated)
4. [Component Testing (Revised)](#component-testing-revised)
5. [New Integration Tests](#new-integration-tests)
6. [Updated E2E Scenarios](#updated-e2e-scenarios)
7. [Performance Testing (Enhanced)](#performance-testing-enhanced)

---

## Recent UI Changes

### Major Updates Since Last Test Plan
- **UpcomingState Component**: Added expandable prompt with read more/less functionality
- **AgentCover**: Enhanced 3D CSS transforms and hover effects
- **Aurora Background**: WebGL-based OGL implementation for gradient animations
- **Meeting Table**: Improved status icons and visual hierarchy
- **GeneratedAvatar**: Consistent avatar generation system
- **Blueprint Pages**: Enhanced session cards with completion criteria

### Components Requiring Test Updates
- `UpcomingState` - New expandable content functionality
- `AgentCover` - 3D transform effects and size variants
- `Aurora` - WebGL performance and resource management
- `DataTable` - Enhanced meeting status display
- `GeneratedAvatar` - Avatar generation consistency

---

## Updated Test Strategy

### New Testing Priorities
1. **WebGL Performance**: Aurora component resource management
2. **3D Effects**: Book cover hover animations and transforms
3. **Content Expansion**: Read more/less functionality
4. **Status Visualization**: Enhanced meeting status icons
5. **Avatar Consistency**: Generated avatar display across components

### Testing Tools (Updated)
```javascript
{
  "webgl": "WebGL Inspector + Manual testing",
  "3d-transforms": "Visual regression with Percy",
  "performance": "Lighthouse CI + Custom metrics",
  "accessibility": "axe-core + Manual keyboard testing"
}
```

---

## Critical User Flows (Updated)

### 1. Enhanced Blueprint → Agent → Meeting Flow

```typescript
describe('Updated Learning Journey Setup', () => {
  test('User can start learning journey with new UI', async () => {
    // 1. Navigate to landing page
    await page.goto('/');
    
    // 2. Verify Aurora background loads
    await page.waitForSelector('[data-testid="aurora-canvas"]');
    await expect(page.locator('canvas')).toBeVisible();
    
    // 3. Click on a blueprint with 3D effect
    await page.hover('[data-testid="blueprint-think-grow-rich"]');
    await page.waitForTimeout(300); // Allow hover animation
    await page.click('[data-testid="blueprint-think-grow-rich"]');
    
    // 4. Verify blueprint details page with new layout
    await expect(page).toHaveURL(/\/agent\/.+/);
    await expect(page.locator('[data-testid="agent-cover-large"]')).toBeVisible();
    await expect(page.locator('[data-testid="session-cards"]')).toBeVisible();
    
    // 5. Click "Start Session" button
    await page.click('button:has-text("Start Session")');
    
    // 6. Verify redirect to meetings page
    await expect(page).toHaveURL('/meetings');
    
    // 7. Verify new meeting created with updated status display
    const meetingRow = page.locator('[data-testid="meeting-row"]').first();
    await expect(meetingRow.locator('[data-testid="status-badge"]')).toContainText('Ready to Start');
    await expect(meetingRow.locator('[data-testid="generated-avatar"]')).toBeVisible();
  });
});
```

### 2. Enhanced Meeting Detail Flow

```typescript
describe('Updated Meeting Detail Flow', () => {
  test('Upcoming meeting shows expandable prompt content', async () => {
    const meeting = await createTestMeeting({ status: 'upcoming' });
    
    // Navigate to meeting detail
    await page.goto(`/meetings/${meeting.id}`);
    
    // Verify upcoming state layout
    await expect(page.locator('[data-testid="upcoming-state"]')).toBeVisible();
    
    // Test prompt expansion
    const promptPreview = page.locator('[data-testid="prompt-preview"]');
    await expect(promptPreview).toBeVisible();
    
    // Click read more if content is truncated
    const readMoreBtn = page.locator('button:has-text("Read More")');
    if (await readMoreBtn.isVisible()) {
      await readMoreBtn.click();
      
      // Verify full content shown
      const fullPrompt = page.locator('[data-testid="full-prompt"]');
      await expect(fullPrompt).toBeVisible();
      
      // Test read less
      await page.click('button:has-text("Show Less")');
      await expect(promptPreview).toBeVisible();
    }
    
    // Verify join session button
    await expect(page.locator('button:has-text("Join Session")')).toBeVisible();
  });
  
  test('Meeting states display correctly', async () => {
    const states = ['upcoming', 'active', 'processing', 'completed'];
    
    for (const status of states) {
      const meeting = await createTestMeeting({ status });
      await page.goto(`/meetings/${meeting.id}`);
      
      // Verify correct state component renders
      await expect(page.locator(`[data-testid="${status}-state"]`)).toBeVisible();
      
      // Verify status-specific UI elements
      switch (status) {
        case 'upcoming':
          await expect(page.locator('[data-testid="session-focus"]')).toBeVisible();
          break;
        case 'active':
          await expect(page.locator('[data-testid="live-indicator"]')).toBeVisible();
          break;
        case 'processing':
          await expect(page.locator('[data-testid="processing-animation"]')).toBeVisible();
          break;
        case 'completed':
          await expect(page.locator('[data-testid="meeting-summary"]')).toBeVisible();
          break;
      }
    }
  });
});
```

---

## Component Testing (Revised)

### 1. UpcomingState Component (New Tests)

```typescript
describe('UpcomingState', () => {
  const mockMeeting = {
    id: 'test-meeting',
    prompt: 'A'.repeat(300), // Long prompt to trigger expansion
    agent: { name: 'Dr. Success' }
  };
  
  it('renders meeting overview with agent info', () => {
    render(<UpcomingState meetingId={mockMeeting.id} />);
    
    expect(screen.getByText('What You\'ll Learn')).toBeInTheDocument();
    expect(screen.getByText('Dr. Success')).toBeInTheDocument();
    expect(screen.getByText('Your Learning Coach')).toBeInTheDocument();
  });
  
  it('shows truncated prompt with read more button', () => {
    render(<UpcomingState meetingId={mockMeeting.id} />);
    
    const promptPreview = screen.getByTestId('prompt-preview');
    expect(promptPreview).toHaveTextContent(/\.\.\.$/); // Ends with ellipsis
    
    const readMoreBtn = screen.getByRole('button', { name: /read more/i });
    expect(readMoreBtn).toBeInTheDocument();
  });
  
  it('expands and collapses prompt content', async () => {
    render(<UpcomingState meetingId={mockMeeting.id} />);
    
    const readMoreBtn = screen.getByRole('button', { name: /read more/i });
    
    // Expand
    await userEvent.click(readMoreBtn);
    expect(screen.getByRole('button', { name: /show less/i })).toBeInTheDocument();
    
    // Collapse
    const showLessBtn = screen.getByRole('button', { name: /show less/i });
    await userEvent.click(showLessBtn);
    expect(screen.getByRole('button', { name: /read more/i })).toBeInTheDocument();
  });
  
  it('shows join session button', () => {
    render(<UpcomingState meetingId={mockMeeting.id} />);
    
    const joinBtn = screen.getByRole('link', { name: /join session/i });
    expect(joinBtn).toHaveAttribute('href', `/call/${mockMeeting.id}`);
  });
});
```

### 2. AgentCover Component (Enhanced Tests)

```typescript
describe('AgentCover', () => {
  it('renders 3D book effect with proper CSS classes', () => {
    render(<AgentCover imageUrl="/test-book.jpg" size="large" />);
    
    const cover = screen.getByTestId('agent-cover');
    expect(cover).toHaveClass('book-3d', 'book-large');
    expect(cover).toHaveStyle({
      backgroundImage: 'url(/test-book.jpg)'
    });
  });
  
  it('applies hover transform effects', async () => {
    const { container } = render(<AgentCover imageUrl="/test-book.jpg" />);
    const cover = container.querySelector('[data-testid="agent-cover"]');
    
    // Simulate hover
    await userEvent.hover(cover);
    
    // Check for transform classes or styles
    expect(cover).toHaveClass('book-hover');
  });
  
  it('handles different size variants', () => {
    const sizes = ['small', 'medium', 'large'];
    
    sizes.forEach(size => {
      const { rerender } = render(<AgentCover size={size} />);
      const cover = screen.getByTestId('agent-cover');
      expect(cover).toHaveClass(`book-${size}`);
      
      rerender(<AgentCover size={sizes[sizes.indexOf(size) + 1]} />);
    });
  });
  
  it('shows placeholder for missing image', () => {
    render(<AgentCover imageUrl="" />);
    
    const cover = screen.getByTestId('agent-cover');
    expect(cover).toHaveClass('book-placeholder');
  });
});
```

### 3. Aurora Component (New Tests)

```typescript
describe('Aurora', () => {
  beforeEach(() => {
    // Mock WebGL context
    jest.spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockReturnValue(mockWebGLContext);
  });
  
  it('initializes WebGL canvas', () => {
    render(<Aurora />);
    
    const canvas = screen.getByTestId('aurora-canvas');
    expect(canvas).toBeInTheDocument();
    expect(canvas.tagName).toBe('CANVAS');
  });
  
  it('handles WebGL context creation failure gracefully', () => {
    jest.spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockReturnValue(null);
    
    render(<Aurora />);
    
    // Should not crash, may show fallback
    expect(screen.getByTestId('aurora-container')).toBeInTheDocument();
  });
  
  it('cleans up WebGL resources on unmount', () => {
    const { unmount } = render(<Aurora />);
    
    const cleanup = jest.fn();
    mockWebGLContext.cleanup = cleanup;
    
    unmount();
    
    // Verify cleanup was called
    expect(cleanup).toHaveBeenCalled();
  });
  
  it('responds to color prop changes', () => {
    const { rerender } = render(<Aurora color="blue" />);
    
    rerender(<Aurora color="red" />);
    
    // Verify color uniform updated
    expect(mockWebGLContext.uniform3f).toHaveBeenCalledWith(
      expect.any(Object),
      expect.any(Number),
      expect.any(Number),
      expect.any(Number)
    );
  });
});
```

### 4. GeneratedAvatar Component (New Tests)

```typescript
describe('GeneratedAvatar', () => {
  it('generates consistent avatar for same input', () => {
    const name = 'Dr. Success';
    
    const { rerender } = render(<GeneratedAvatar name={name} />);
    const firstAvatar = screen.getByTestId('generated-avatar');
    const firstStyle = firstAvatar.getAttribute('style');
    
    rerender(<GeneratedAvatar name={name} />);
    const secondAvatar = screen.getByTestId('generated-avatar');
    const secondStyle = secondAvatar.getAttribute('style');
    
    expect(firstStyle).toBe(secondStyle);
  });
  
  it('generates different avatars for different inputs', () => {
    const { rerender } = render(<GeneratedAvatar name="Agent 1" />);
    const firstStyle = screen.getByTestId('generated-avatar').getAttribute('style');
    
    rerender(<GeneratedAvatar name="Agent 2" />);
    const secondStyle = screen.getByTestId('generated-avatar').getAttribute('style');
    
    expect(firstStyle).not.toBe(secondStyle);
  });
  
  it('displays initials correctly', () => {
    render(<GeneratedAvatar name="Dr. Success Coach" />);
    
    const avatar = screen.getByTestId('generated-avatar');
    expect(avatar).toHaveTextContent('D'); // First letter of first word
  });
  
  it('handles edge cases', () => {
    const edgeCases = ['', 'a', 'Multi Word Agent Name'];
    
    edgeCases.forEach(name => {
      render(<GeneratedAvatar name={name} />);
      const avatar = screen.getByTestId('generated-avatar');
      expect(avatar).toBeInTheDocument();
    });
  });
});
```

---

## New Integration Tests

### 1. Meeting State Transitions

```typescript
describe('Meeting State Integration', () => {
  it('transitions between states correctly', async () => {
    const meeting = await createTestMeeting({ status: 'upcoming' });
    
    // Start with upcoming
    render(<MeetingDetailView meetingId={meeting.id} />);
    expect(screen.getByTestId('upcoming-state')).toBeInTheDocument();
    
    // Simulate state change to active
    await act(async () => {
      await updateMeetingStatus(meeting.id, 'active');
    });
    
    expect(screen.getByTestId('active-state')).toBeInTheDocument();
    expect(screen.queryByTestId('upcoming-state')).not.toBeInTheDocument();
  });
});
```

### 2. Blueprint-based Agent Creation

```typescript
describe('Blueprint Agent Integration', () => {
  it('creates agent from blueprint with correct data', async () => {
    const blueprint = await createTestBlueprint();
    
    const { result } = renderHook(() => 
      useTRPC().agents.createFromBlueprint.useMutation()
    );
    
    await act(async () => {
      await result.current.mutateAsync({
        blueprintId: blueprint.id,
        customName: 'My Learning Journey'
      });
    });
    
    expect(result.current.data).toEqual(expect.objectContaining({
      name: 'My Learning Journey',
      blueprintId: blueprint.id,
      blueprintSnapshot: expect.objectContaining({
        sessions: expect.arrayContaining([
          expect.objectContaining({
            session_id: 'session_01',
            completion_criteria: expect.any(Array)
          })
        ])
      })
    }));
  });
});
```

---

## Updated E2E Scenarios

### Scenario 1: Enhanced New User Journey

```typescript
test('New user complete enhanced journey', async ({ page }) => {
  // 1. Land on homepage with Aurora background
  await page.goto('/');
  await page.waitForSelector('[data-testid="aurora-canvas"]');
  
  // 2. Interact with 3D book cover
  const bookCover = page.locator('[data-testid="blueprint-think-grow-rich"]');
  await bookCover.hover();
  await page.waitForTimeout(300); // Animation time
  await bookCover.click();
  
  // 3. View enhanced blueprint details
  await expect(page.locator('[data-testid="agent-cover-large"]')).toBeVisible();
  await expect(page.locator('[data-testid="session-cards"]')).toBeVisible();
  
  // 4. Start learning journey
  await page.click('button:has-text("Start Session")');
  await expect(page).toHaveURL('/meetings');
  
  // 5. Verify meeting created with new UI
  const meetingRow = page.locator('[data-testid="meeting-row"]').first();
  await expect(meetingRow.locator('[data-testid="generated-avatar"]')).toBeVisible();
  await meetingRow.click();
  
  // 6. Test expandable prompt content
  await expect(page.locator('[data-testid="upcoming-state"]')).toBeVisible();
  
  const readMoreBtn = page.locator('button:has-text("Read More")');
  if (await readMoreBtn.isVisible()) {
    await readMoreBtn.click();
    await expect(page.locator('button:has-text("Show Less")')).toBeVisible();
  }
  
  // 7. Join session
  await page.click('button:has-text("Join Session")');
  await expect(page).toHaveURL(/\/call\/.+/);
});
```

### Scenario 2: Meeting Completion with Enhanced UI

```typescript
test('Complete meeting with new processing flow', async ({ page }) => {
  const meeting = await createTestMeeting({ status: 'upcoming' });
  
  // Navigate to meeting
  await page.goto(`/meetings/${meeting.id}`);
  
  // Start meeting from upcoming state
  await page.click('button:has-text("Join Session")');
  await expect(page).toHaveURL(`/call/${meeting.id}`);
  
  // Simulate call duration
  await page.waitForTimeout(3000);
  
  // End call
  await page.click('button:has-text("End Call")');
  
  // Verify processing state
  await expect(page).toHaveURL(`/meetings/${meeting.id}`);
  await expect(page.locator('[data-testid="processing-state"]')).toBeVisible();
  await expect(page.locator('[data-testid="processing-animation"]')).toBeVisible();
  
  // Mock completion
  await mockMeetingCompletion(meeting.id);
  await page.reload();
  
  // Verify completed state
  await expect(page.locator('[data-testid="completed-state"]')).toBeVisible();
  await expect(page.locator('[data-testid="meeting-summary"]')).toBeVisible();
});
```

---

## Performance Testing (Enhanced)

### WebGL Performance Tests

```typescript
describe('Aurora Performance', () => {
  it('maintains 60fps during animation', async () => {
    const performanceObserver = new PerformanceObserver(() => {});
    
    render(<Aurora />);
    
    // Measure frame rate over 5 seconds
    const frameRate = await measureFrameRate(5000);
    
    expect(frameRate).toBeGreaterThan(55); // Allow some variance
  });
  
  it('properly manages WebGL resources', () => {
    const { unmount } = render(<Aurora />);
    
    const initialMemory = performance.memory?.usedJSHeapSize || 0;
    
    unmount();
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
    
    const finalMemory = performance.memory?.usedJSHeapSize || 0;
    
    // Memory should not increase significantly
    expect(finalMemory - initialMemory).toBeLessThan(1024 * 1024); // 1MB threshold
  });
});
```

### 3D Transform Performance

```typescript
describe('AgentCover Performance', () => {
  it('hover animations are smooth', async () => {
    const { container } = render(<AgentCover imageUrl="/test.jpg" />);
    const cover = container.querySelector('[data-testid="agent-cover"]');
    
    const startTime = performance.now();
    
    // Trigger hover
    await userEvent.hover(cover);
    
    // Wait for animation
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const endTime = performance.now();
    
    // Animation should complete within reasonable time
    expect(endTime - startTime).toBeLessThan(400);
  });
});
```

---

## Test Execution Priority

| Component | Priority | Reason |
|-----------|----------|---------|
| UpcomingState | High | Critical user flow changes |
| Aurora | High | WebGL performance impact |
| AgentCover | Medium | Visual enhancement |
| GeneratedAvatar | Medium | Consistency across app |
| Meeting States | High | Core functionality |

---

## Summary of Required Updates

### Immediate Actions:
1. ✅ Add UpcomingState component tests for expandable content
2. ✅ Create Aurora component WebGL performance tests  
3. ✅ Update AgentCover tests for 3D effects
4. ✅ Add GeneratedAvatar consistency tests
5. ✅ Update E2E scenarios for new UI flows

### Test Data Updates:
- Mock meeting data with longer prompts for expansion testing
- WebGL context mocking for Aurora tests
- Blueprint test data with session cards

### CI/CD Integration:
- Add WebGL headless testing capability
- Update visual regression baselines for 3D effects
- Performance budgets for new animations

---

*This revised test plan addresses all recent UI changes and provides comprehensive coverage for the enhanced Hello AI interface.*