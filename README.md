# Insighta Labs+ — Backend

A secure, multi-interface profile intelligence platform.

## System Architecture

The system consists of three components:
- **Backend** — Express.js REST API with GitHub OAuth, JWT auth, and PostgreSQL
- **CLI** — Node.js command-line tool (`insighta`)
- **Web Portal** — React web interface

All three share the same backend API.

## Live URLs
- Backend: https://hngstage1-production-34c5.up.railway.app
- Web Portal: https://insighta-web-tan.vercel.app

## Authentication Flow

1. User runs `insighta login` (CLI) or clicks "Continue with GitHub" (web)
2. User is redirected to GitHub OAuth
3. GitHub redirects back to `/auth/github/callback` with a code
4. Backend exchanges the code for a GitHub access token
5. Backend fetches user info from GitHub
6. Backend creates or updates the user in the database
7. Backend issues a JWT access token (3 min) and refresh token (5 min)
8. CLI stores tokens in `~/.insighta/credentials.json`
9. Web portal stores access token in localStorage

## Token Handling

- **Access token** expires in 3 minutes
- **Refresh token** expires in 5 minutes
- CLI automatically refreshes the access token on 401 responses
- If refresh fails, user is prompted to run `insighta login` again
- Web portal uses access token from localStorage on every request

## Role Enforcement

Two roles exist:
- **admin** — full access: can create and delete profiles, query
- **analyst** — read-only: can only read and search profiles

Default role is `analyst`. Role is checked on every `/api/*` request via middleware.

## CLI Usage

### Installation
```bash
npm install -g .
```

### Auth Commands
```bash
insighta login
insighta logout
insighta whoami
```

### Profile Commands
```bash
insighta profiles list
insighta profiles list --gender male
insighta profiles list --country NG --age-group adult
insighta profiles list --min-age 25 --max-age 40
insighta profiles list --sort-by age --order desc
insighta profiles list --page 2 --limit 20
insighta profiles get <id>
insighta profiles search "young males from nigeria"
insighta profiles create --name "Harriet Tubman"
insighta profiles export --format csv
```

## Natural Language Parsing

The `/api/profiles/search` endpoint uses rule-based parsing. No AI is used.

Supported keywords:
- **Gender**: male, female, man, woman, boy, girl
- **Age groups**: child, teenager, adult, senior, elderly
- **Young/youth**: maps to age range 16-24
- **Age range**: "above X", "over X", "below X", "under X"
- **Country**: full country name e.g. "nigeria", "kenya"

## Tech Stack
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: PostgreSQL (Neon)
- **ORM**: Prisma
- **Auth**: GitHub OAuth + JWT
- **Deployment**: Railway

## Environment Variables
DATABASE_URL="postgresql://neondb_owner:npg_ouT5UxhVIJ2t@ep-little-fog-amcvcpsm-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require"
DIRECT_URL="postgresql://neondb_owner:npg_ouT5UxhVIJ2t@ep-little-fog-amcvcpsm.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require"

GITHUB_CLIENT_ID=Ov23lii3L1iApYKD5gZJ
GITHUB_CLIENT_SECRET=24418e8352da8517e9132d9284000f6c78b8cf29
JWT_SECRET=jncjnknslxsanoddjcnsgyeiuhxbhashd

## Getting Started

```bash
npm install
npx prisma generate
npm run dev
```