# Client Media Review & Approval Platform

A Frame.io-inspired client media review, annotation, and approval platform built for creative studios, videographers, and post-production teams.

![Platform Overview](https://img.shields.io/badge/Platform-Frame.io%20Style-6366f1?style=for-the-badge)
![Tech Stack](https://img.shields.io/badge/Stack-React%2019%20%7C%20TypeScript%20%7C%20Express%20%7C%20Bun-emerald?style=for-the-badge)
![Cloud Storage](https://img.shields.io/badge/Storage-Jio%20AI%20Cloud-blue?style=for-the-badge)

---

## Key Features

### 🎬 Frame-Accurate Video Review Room
- **Maximized Cinema Viewport**: Full-bleed responsive video player with high precision playback.
- **SMPTE Timecode Precision**: Exact `HH:MM:SS:FF` playhead timecode tracking.
- **Timeline Avatar Comment Markers**: Interactive circular avatar markers (e.g. `CR`, `RD`, `SA`) placed directly on the playback timeline scrub bar.
- **Instant Seek**: Click any marker or comment timestamp to seek directly to that exact frame.
- **One-Click Comment Resolution (`✓`)**: Resolve/reopen comments with instant visual state feedback.

### ☁️ Jio AI Cloud & Unified Storage Vault
- **Jio AI Cloud Connected Repository**: Integrated cloud folder syncing for all client masters, video cuts, and photo albums.
- **Direct Cloud Access**: One-click deep link to open the connected folder directly in Jio AI Cloud.
- **Unified Files Vault**: View, search, filter, and stream all media files across all projects with format tags and size metrics.
- **150 GB Quota Meter**: Visual quota utilization and capacity tracking.

### 🔔 Notifications & Studio Audit Trail
- **Live Activity Feed**: Real-time reverse-chronological notifications for comments, client decisions (approvals and revision requests), and cut uploads.
- **Instant Jump**: Click any notification to navigate directly into the review player for that specific asset cut.
- **Categorized Tabs**: Filter activity by Comments, Approvals, or Uploads.

### 🔍 Quick Search Command Palette
- Instant search across all projects, client names, video cuts, and photos.

---

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, Lucide Icons
- **Backend**: Node.js / Bun, Express 5, Multer (multipart video streaming & HTTP 206 Partial Content)
- **Database**: SQLite (WAL mode, high concurrency)
- **Storage**: Jio AI Cloud / Google Drive adapter with 150 GB quota enforcement
- **Security**: JWT Authentication, cryptographically random review tokens, optional link passphrases

---

## Quick Start

### Prerequisites
- [Bun](https://bun.com) (v1.2+) installed on your machine.

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd <repo-folder>

# Install dependencies
bun install
```

### Running Locally

```bash
# Build client bundle
bun run build

# Start server (Express API + Web Application)
bun run server/src/index.ts
```

The application will be accessible at:
- **Web App**: [http://localhost:3001](http://localhost:3001)
- **API Health**: [http://localhost:3001/api/health](http://localhost:3001/api/health)
- **Client Review Room**: [http://localhost:3001/review/sharma-wedding-teaser-review](http://localhost:3001/review/sharma-wedding-teaser-review)

### Default Staff Account
- **Email**: `arjun@luminastudio.com`
- **Password**: `password123`

---

## Project Structure

```
├── client/                     # React 19 Frontend Application
│   ├── src/
│   │   ├── components/         # VideoPlayer, CommentThread, SidebarRail, SearchModal, etc.
│   │   ├── pages/              # Dashboard, ProjectView, AssetView, StorageView, NotificationsView, ClientReviewRoom
│   │   ├── services/           # API client methods
│   │   └── context/            # AuthContext & state providers
├── server/                     # Express Backend Server
│   ├── src/
│   │   ├── db/                 # SQLite schema & seeding
│   │   ├── routes/             # Projects, Assets, Comments, Review, Organization routes
│   │   ├── storage/            # Drive & Jio AI Cloud storage adapter
│   │   └── middleware/         # Authentication & token verification
└── dist/                       # Compiled production web bundle
```
