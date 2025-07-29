# Hello AI - Talk with and Learn from Your Favourite Books
# Comprehensive Project Documentation

## Table of Contents
1. [Project Overview](#project-overview)
2. [System Architecture](#system-architecture)
3. [Core Concepts](#core-concepts)
4. [Technical Stack](#technical-stack)
5. [Data Flow](#data-flow)
6. [Key Features](#key-features)

---

## Project Overview

Hello AI is an innovative AI-powered learning platform that transforms books into interactive coaching experiences. Users engage in real-time video conversations with AI agents that embody the wisdom and teachings from their favorite books, creating a personalized learning journey.

### Vision
To democratize access to world-class coaching and mentorship by leveraging AI to create interactive learning experiences based on timeless wisdom from books.

### Primary Use Case
Users select a book-based learning program (blueprint), which creates a personalized AI coach that guides them through structured conversations designed to help them internalize and apply the book's teachings.

---

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (Next.js 15)                  │
├─────────────────────────────────────────────────────────────┤
│                         API Layer (tRPC)                      │
├─────────────────────────────────────────────────────────────┤
│                    Business Logic Layer                       │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │   Agents    │  │   Meetings   │  │  LLM Analysis    │   │
│  │ Management  │  │  Management  │  │    Engine        │   │
│  └─────────────┘  └──────────────┘  └──────────────────┘   │
├─────────────────────────────────────────────────────────────┤
│                    Data Layer (DrizzleORM)                    │
├─────────────────────────────────────────────────────────────┤
│                    External Services                          │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │  Stream.io  │  │   OpenAI     │  │      Neon        │   │
│  │ Video/Chat  │  │  Real-time   │  │   PostgreSQL     │   │
│  └─────────────┘  └──────────────┘  └──────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Module Architecture
The application follows a feature-based modular architecture:

```
src/modules/
├── agents/         # Agent and blueprint management
├── meetings/       # Meeting lifecycle and management  
├── call/          # Real-time video/audio functionality
├── auth/          # Authentication flows
├── dashboard/     # User dashboard features
├── home/          # Landing page
└── premium/       # Subscription management
```

---

## Core Concepts

### 1. **Agent Blueprint**
- Master template for a learning program based on a book
- Contains structured conversation sessions with specific learning objectives
- Includes marketing collateral (book cover, author, description)
- Defines the complete learning journey

### 2. **Agent**
- User's personal instance created from a blueprint
- Contains a snapshot of the blueprint (version isolation)
- Tracks individual progress through the learning journey
- Maintains conversation history and insights

### 3. **Meeting**
- Individual conversation session between user and AI agent
- Has specific learning objectives (completion criteria)
- Includes pre-computed AI instructions
- Automatically progresses to next session upon completion

### 4. **Session Progress**
- Tracks completion status for each conversation in the journey
- Stores participant-specific insights and notes
- Maintains criteria completion tracking
- Used for generating personalized next session prompts

---

## Technical Stack

### Frontend
- **Next.js 15**: React framework with App Router
- **React 19**: Latest features including concurrent rendering
- **TypeScript 5**: End-to-end type safety
- **Tailwind CSS v4**: Utility-first styling
- **Shadcn/ui**: Component library
- **Radix UI**: Accessible UI primitives
- **TanStack Query**: Server state management
- **React Hook Form**: Form management
- **Three.js/WebGL**: 3D audio visualizations

### Backend
- **tRPC**: Type-safe API layer
- **DrizzleORM**: Type-safe database toolkit
- **Neon**: Serverless PostgreSQL
- **Better Auth**: Authentication system
- **Zod**: Schema validation

### Real-time & AI
- **Stream.io Video SDK**: WebRTC video calling
- **Stream.io Chat SDK**: Real-time messaging
- **OpenAI API**: GPT-4 for conversation and analysis
- **OpenAI Realtime API**: Voice conversation capabilities

### Infrastructure
- **Vercel**: Deployment platform
- **ngrok**: Webhook development
- **Inngest**: Background job processing (deprecated in favor of immediate processing)

---

## Data Flow

### 1. **User Journey Flow**
```
Landing Page → Browse Blueprints → Select Blueprint
    ↓
Create Agent from Blueprint → First Meeting Auto-Created
    ↓
Start Meeting → Real-time AI Conversation → Complete Meeting
    ↓
Automatic Analysis → Progress Update → Next Meeting Created
    ↓
Continue Journey → Complete Program
```

### 2. **Meeting Lifecycle**
```
upcoming → active → processing → completed
   │         │          │           │
   │         │          │           └→ Next meeting created
   │         │          └→ Transcript analysis
   │         └→ Real-time transcript collection
   └→ User clicks "Start"
```

### 3. **Real-time Transcript Collection**
```
User speaks → Stream.io → OpenAI Realtime → AI responds
     ↓                                            ↓
Transcript chunk stored ← ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘
     ↓
Meeting ends → Immediate analysis → Progress update
```

---

## Key Features

### 1. **Blueprint-Based Learning**
- Structured learning programs based on books
- Multiple conversation sessions per blueprint
- Clear learning objectives and outcomes
- Beautiful book cover presentation

### 2. **Automatic Meeting Progression**
- No manual meeting creation required
- Next conversation automatically scheduled
- Progress tracking across sessions
- Seamless learning journey

### 3. **Sophisticated AI Analysis**
- Transcript analysis against learning objectives
- Progress tracking with criteria completion
- Participant insights and personalization
- Dynamic prompt generation for next session

### 4. **Real-time Features**
- Live video/audio conversations with AI
- Real-time transcript collection
- 3D audio visualizations
- Chat integration for post-meeting questions

### 5. **Progress Tracking**
- Visual journey progress
- Detailed session completion tracking
- Personal insights and notes
- Achievement tracking

### 6. **Version Isolation**
- User journeys protected from blueprint updates
- Consistent experience throughout program
- Blueprint snapshot stored with agent

---

## Database Schema

### Core Tables

#### `agentBlueprints`
- Master templates for learning programs
- Contains session definitions and instructions
- Marketing collateral for display

#### `agents`
- User instances of blueprints
- Blueprint snapshot for version isolation
- Progress tracking (via meetings)

#### `meetings`
- Individual conversation sessions
- Status lifecycle management
- Transcript and recording URLs
- Progress tracking array

#### `transcriptChunks`
- Real-time transcript storage
- Sequential ordering
- Speaker identification

---

## Security & Authentication

- **Better Auth**: Modern authentication system
- **Row-level security**: User data isolation
- **API protection**: tRPC middleware for auth checks
- **Webhook verification**: Stream.io signature validation

---

## Performance Optimizations

- **Real-time transcript collection**: Eliminates wait time
- **Immediate processing**: No queue delays
- **Code splitting**: Lazy loading for 3D visualizations
- **Optimistic updates**: Instant UI feedback
- **Database indexes**: Fast queries on foreign keys

---

*This documentation provides a comprehensive overview of the Hello AI platform architecture and implementation.*