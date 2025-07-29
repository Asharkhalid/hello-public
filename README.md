# Hello AI - Talk with and Learn from your favourite books

AI-powered video call application with real-time agents, meeting summaries, and post-call features.

## Features

- 🤖 **AI-powered calls with custom agents** - Create agents from blueprints and have conversations
- 📚 **Agent blueprints & learning programs** - Structured learning journeys based on books
- 🔄 **Automatic meeting progression** - Next conversation automatically created after completion
- 📊 **Progress tracking & analytics** - Detailed journey tracking with LLM-generated insights
- 📞 **Real-time video & audio calls** - Using Stream SDK with WebRTC
- 🎨 **3D Audio visualization** - Enhanced WebGL-based audio reactive visuals with particle systems
- 💫 **Multiple visualization modes** - Aura, glow, pulse, wave, and dual-zone visualizers
- 📝 **Automatic meeting summaries & transcripts** - AI-powered meeting analysis
- 🔍 **Smart transcript search & playback** - Search through conversations with video sync
- 💬 **Real-time chat integration** - Chat during calls with Stream Chat SDK
- 🎯 **Pre-computed meeting instructions** - AI instructions ready before conversations start
- ⚙️ **Background job processing** - Inngest-powered transcript analysis and progression
- 🔐 **Authentication with Better Auth** - Secure user authentication
- 📱 **Mobile responsive design** - Works seamlessly across all devices
- 🗄️ **Database with DrizzleORM** - Type-safe database operations with Neon PostgreSQL
- 🌓 **Dark/Light theme support** - Beautiful UI with theme switching
- 💳 **Subscription management with Polar** (In Progress) - Premium features framework
- 🎮 **Interactive dashboard** - Comprehensive agent and meeting management
- 🔄 **Version isolation** - User journeys isolated from blueprint changes

## Tech Stack

- Next.js 15
- React 19
- Tailwind v4
- Shadcn/ui
- tRPC
- DrizzleORM
- Neon Database
- OpenAI
- Stream Video & Chat - 
- Better Auth
- Inngest
- Polar

## Development Flow

```bash
# Install dependencies (use --legacy-peer-deps for React 19 compatibility)
npm install --legacy-peer-deps

# Start development servers
npm run dev          # Start Next.js development server
npm run dev:webhook  # Start webhook server (requires ngrok static domain in package.json)
npx inngest-cli@latest dev  # Start Inngest development server
```

## Additional Commands

```bash
# Database
npm run db:push      # Push database changes
npm run db:studio    # Open database studio

# Production
npm run build        # Build for production
npm run start        # Start production server
```

> Note: For `dev:webhook` to work, you need to add your ngrok static domain to the script in `package.json`:
> ```json
> "dev:webhook": "ngrok http --url=[YOUR_NGROK_STATIC_DOMAIN] 3000"
> ```

---

## 🎯 System Overview

The Hello AI application is built around an **Automatic Meeting System** that enables users to have structured, progressive conversations with AI agents based on learning blueprints from their favorite books.

### Key Terminology

- **Agent Blueprint**: Master template defining a learning program with multiple conversations
- **Agent**: User's personal conversational agent created from a blueprint
- **Meeting**: Individual conversation between user and agent (what gets automated)
- **Web Session**: Authentication session (completely unrelated to conversation flow)

### System Architecture

```
Agent Blueprint (Template)
    ↓
Agent (User Instance)
    ↓
Meeting 1 (Conversation) → Meeting 2 → Meeting 3 → ...
```

## 🏗️ Core Data Flow

### 1. Blueprint Selection & Agent Creation
```typescript
User clicks "Start Conversation" on Blueprint
    ↓
System creates Agent with blueprint snapshot
    ↓
First Meeting created with pre-computed instructions
    ↓
User can start conversation
```

### 2. Meeting Completion & Auto-Progression
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

## ✨ Advanced Features

### Automatic Progression
- **No Manual Meeting Creation**: Next conversation automatically created after completion
- **Pre-computed Instructions**: Meeting instructions ready before conversation starts
- **Progress Tracking**: Detailed journey tracking with notes and insights
- **Version Isolation**: User journeys isolated from blueprint changes

### Conversation Enhancement
- **Contextual Instructions**: AI instructions enhanced with previous conversation context
- **Progress Notes**: Detailed tracking of learning progress and insights
- **Smart Analysis**: LLM analyzes transcripts against conversation objectives
- **Continuous Flow**: Seamless progression through structured learning programs

## 📁 Project Structure

```
src/
├── modules/
│   ├── agents/                    # Agent management and blueprints
│   ├── meetings/                  # Meeting/conversation management
│   ├── call/                      # Real-time video/audio calls
│   ├── auth/                      # Authentication
│   ├── dashboard/                 # Dashboard features
│   ├── home/                      # Home page
│   └── premium/                   # Subscription features
│
├── components/                    # Shared UI components
├── db/                           # Database schema and connection
├── lib/                          # Shared utilities and configurations
├── trpc/                         # tRPC configuration and routers
├── inngest/                      # Background job processing
└── hooks/                        # Shared React hooks
```

## 🤝 Contributing

1. **Read the Architecture Documentation** in `/docs` to understand the system design
2. **Follow the established patterns** described in the architecture guide
3. **Update documentation** when making significant changes
4. **Maintain consistency** with existing code organization

## 📚 Documentation

For detailed technical documentation, see the [docs](./docs) folder:

- **[Architecture Guide](./docs/ARCHITECTURE.md)** - System design and technical implementation
- **[Best Practices](./docs/BEST_PRACTICES.md)** - Development standards and guidelines
- **[Meeting System Requirements](./docs/meeting/REQUIREMENTS.md)** - Automatic meeting system specifications
- **[Meeting System Design](./docs/meeting/DESIGN.md)** - Technical implementation details

---
