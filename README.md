# AI Chat Hub

Multi-provider LLM interface with MCP (Model Context Protocol) support.

## Features

- **Multi-model chat** — Groq (Llama, Mixtral) and OpenRouter (GPT, Claude, Gemini, etc.)
- **MCP Tools** — Connect MCP servers for filesystem access, web fetching, and custom tools
- **Web Search** — Real-time web search via Serper API
- **Memory** — AI remembers facts across conversations
- **Chain of Thought** — Collapsible reasoning blocks
- **PWA** — Installable on mobile and desktop
- **Authentication** — JWT-based auth with encrypted API key storage

## Quick Start

### 1. Install dependencies

```bash
npm run install:all
```

### 2. Configure environment

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env` with your API keys:
- **GROQ_API_KEY** — Get from https://console.groq.com/keys (free)
- **OPENROUTER_API_KEY** — Get from https://openrouter.ai/keys (free tier available)
- **SERPER_API_KEY** — Get from https://serper.dev/api-key (2500 free queries)
- **JWT_SECRET** — Generate with: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`
- **ENCRYPTION_KEY** — Generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

### 3. Run database migration

```bash
npm run db:migrate
```

### 4. Start development servers

```bash
npm run dev
```

Open http://localhost:5173 in your browser.

## Testing

### Test backend API directly

```bash
# Register
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"password123","name":"Test"}'

# Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"password123"}'

# Save token from response, then:
TOKEN="your_token_here"

# Get models
curl http://localhost:3001/api/models -H "Authorization: Bearer $TOKEN"

# Send chat message (SSE stream)
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"message":"Hello!","model":"llama-3.3-70b-versatile","provider":"groq"}'
```

### Test MCP server

```bash
# Add filesystem MCP server
curl -X POST http://localhost:3001/api/mcp/servers \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"Filesystem","command":"npx","args":["-y","@modelcontextprotocol/server-filesystem","/tmp"]}'

# List servers
curl http://localhost:3001/api/mcp/servers -H "Authorization: Bearer $TOKEN"

# List tools
curl http://localhost:3001/api/mcp/tools -H "Authorization: Bearer $TOKEN"
```

## Project Structure

```
ai-chat-hub/
├── backend/
│   ├── prisma/           # Database schema & migrations
│   ├── src/
│   │   ├── routes/       # API endpoints
│   │   ├── services/     # LLM client, MCP manager, tools
│   │   ├── middleware/    # Auth middleware
│   │   └── utils/        # Prisma client, encryption
│   └── .env              # Environment variables
├── frontend/
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── store/        # Zustand state management
│   │   └── utils/        # API client, helpers
│   └── public/           # Static assets
└── package.json          # Root package with scripts
```

## MCP Servers

MCP (Model Context Protocol) allows connecting external tool servers. Popular servers:

- **Filesystem** — `npx -y @modelcontextprotocol/server-filesystem /path`
- **Fetch** — `npx -y @modelcontextprotocol/server-fetch`
- **GitHub** — `npx -y @modelcontextprotocol/server-github`

Add servers via the MCP panel in the UI or via API.

## Production Build

```bash
npm run build
NODE_ENV=production npm start
```

The backend will serve the frontend build from `frontend/dist/`.
