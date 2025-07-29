# Hello AI - Talk with and Learn from your favourite books Documentation

Welcome to the Hello AI - Talk with and Learn from your favourite books! This folder contains comprehensive documentation for understanding, developing, and maintaining the Hello AI - Talk with and Learn from your favourite books application.

## 📚 Documentation Index

### 🏗️ [Architecture Documentation](./ARCHITECTURE.md)
Comprehensive guide covering the application's architecture, design patterns, and technical implementation details.

**Contents:**
- System overview and principles
- Technology stack breakdown
- Module architecture patterns
- Data flow and API design
- Database schema and relationships
- Real-time communication setup
- Security and performance considerations

### 🚀 [Development Guide](./DEVELOPMENT.md) *(Coming Soon)*
Step-by-step guide for setting up the development environment and contributing to the project.

### 🔧 [API Reference](./API.md) *(Coming Soon)*
Complete API documentation including endpoints, schemas, and examples.

### 🎨 [UI Components](./COMPONENTS.md) *(Coming Soon)*
Documentation for the design system and reusable UI components.

### 📋 [Deployment Guide](./DEPLOYMENT.md) *(Coming Soon)*
Instructions for deploying the application to various environments.

---

## 🎯 Quick Start

For immediate development setup, see the main [README.md](../README.md) in the project root.

## 🤝 Contributing

When contributing to the project:

1. **Read the Architecture Documentation** to understand the system design
2. **Follow the established patterns** described in the architecture guide
3. **Update documentation** when making significant changes
4. **Maintain consistency** with existing code organization

## 📝 Documentation Standards

When updating documentation:

- Use clear, concise language
- Include code examples where appropriate
- Keep diagrams and visual aids up to date
- Cross-reference related sections
- Update the table of contents when adding new sections

---

## 🤖 Automatic Meeting System

### Core Concepts

The Hello AI application is built around an **Automatic Meeting System** that enables users to have structured, progressive conversations with AI agents based on learning blueprints.

#### Key Terminology

- **Agent Blueprint**: Master template defining a learning program with multiple conversations
- **Agent**: User's personal conversational agent created from a blueprint
- **Meeting**: Individual conversation between user and agent (what gets automated)
- **Web Session**: Authentication session (completely unrelated to conversation flow)

#### System Architecture

```
Agent Blueprint (Template)
    ↓
Agent (User Instance)
    ↓
Meeting 1 (Conversation) → Meeting 2 → Meeting 3 → ...
```

### Project Structure

```
src/
├── modules/
│   ├── agents/                    # Agent management and blueprints
│   │   ├── server/
│   │   │   └── procedures.ts      # Agent CRUD and journey management
│   │   ├── ui/
│   │   │   ├── components/        # Agent cards, forms, progress tracking
│   │   │   └── views/             # Agent dashboard, blueprint catalog
│   │   └── schemas.ts             # Agent validation schemas
│   │
│   ├── meetings/                  # Meeting/conversation management
│   │   ├── server/
│   │   │   └── procedures.ts      # Meeting creation and management
│   │   ├── ui/
│   │   │   ├── components/        # Meeting UI, chat interface
│   │   │   └── views/             # Meeting pages and controls
│   │   └── types.ts               # Meeting and conversation types
│   │
│   └── call/                      # Real-time video/audio calls
│       ├── ui/
│       │   ├── components/        # Call controls, audio visualization
│       │   └── views/             # Call interface
│       └── hooks/                 # Audio analysis and call state
│
├── db/
│   ├── schema.ts                  # Database schema (agents, meetings, blueprints)
│   └── index.ts                   # Database connection
│
├── inngest/
│   ├── functions.ts               # Background processing (meeting completion)
│   └── events.ts                  # Event definitions
│
└── lib/
    ├── llm/
    │   └── prompts.ts             # AI analysis prompts
    └── schemas/
        └── progress-tracker.ts    # Progress tracking schemas
```

### Core Data Flow

#### 1. Blueprint Selection & Agent Creation
```typescript
User clicks "Start Conversation" on Blueprint
    ↓
System creates Agent with blueprint snapshot
    ↓
First Meeting created with pre-computed instructions
    ↓
User can start conversation
```

#### 2. Meeting Completion & Auto-Progression
```typescript
User completes Meeting (conversation)
    ↓
Inngest function analyzes transcript
    ↓
Updates Agent progress tracker
    ↓
Automatically creates next Meeting
    ↓
User can continue journey
```

#### 3. Progress Tracking
```typescript
Agent contains:
├── blueprintSnapshot (version-locked conversations)
└── progressTracker
    ├── conversationHistory[]
    ├── progressPercentage
    ├── progressNotes
    └── journeyStatus
```

### Database Schema Overview

#### Core Tables
```typescript
// Master templates for learning programs
agentBlueprints {
  id, name, description
  marketingCollateral: jsonb
  meetingTemplates: jsonb    // Contains conversation definitions
}

// User's personal conversational agents
agents {
  id, name, userId, blueprintId
  blueprintSnapshot: jsonb   // Version isolation
  progressTracker: jsonb     // Journey progress
}

// Individual conversations
meetings {
  id, name, userId, agentId
  conversationId            // Which conversation this represents
  meetingInstructions       // Pre-computed AI instructions
  status, transcriptUrl, summary
}
```

### Key Features

#### Automatic Progression
- **No Manual Meeting Creation**: Next conversation automatically created after completion
- **Pre-computed Instructions**: Meeting instructions ready before conversation starts
- **Progress Tracking**: Detailed journey tracking with notes and insights
- **Version Isolation**: User journeys isolated from blueprint changes

#### Conversation Enhancement
- **Contextual Instructions**: AI instructions enhanced with previous conversation context
- **Progress Notes**: Detailed tracking of learning progress and insights
- **Smart Analysis**: LLM analyzes transcripts against conversation objectives
- **Continuous Flow**: Seamless progression through structured learning programs

### Documentation

For detailed technical specifications, see:
- **[Requirements Document](./meeting/REQUIREMENTS.md)** - What exists vs what needs to change
- **[Design Document](./meeting/DESIGN.md)** - Technical implementation details and 13-step plan

---

*For questions about the documentation or suggestions for improvements, please open an issue or contact the development team.* 