// Vercel Serverless API Handler
import fs from 'fs';
import path from 'path';

// In-memory data store for serverless execution
const projectsStore = [
  {
    id: 'proj-1',
    organization_id: 'org-wedding-studio',
    name: 'Sharma - Verma Wedding 2026',
    client_name: 'Rahul Sharma & Ananya Verma',
    description: 'Cinematic wedding cut, Sangeet highlights, and 4K teaser in Udaipur.',
    status: 'active',
    drive_folder_id: 'fld-1',
    created_by: 'usr-director',
    created_at: '2026-07-28T10:00:00.000Z',
    asset_count: 2,
    total_bytes: 22850000,
  },
  {
    id: 'proj-2',
    organization_id: 'org-wedding-studio',
    name: 'Aditi & Vikram Sangeet & Reception',
    client_name: 'Aditi Kapoor',
    description: 'Multi-cam choreography edit and drone portraits in Goa.',
    status: 'active',
    drive_folder_id: 'fld-2',
    created_by: 'usr-director',
    created_at: '2026-07-25T14:30:00.000Z',
    asset_count: 1,
    total_bytes: 34500000,
  },
];

const assetsStore = {
  'proj-1': [
    {
      id: 'ast-1',
      project_id: 'proj-1',
      name: 'Wedding Teaser Cut V2',
      asset_type: 'video',
      status: 'ready_for_review',
      current_version_id: 'ver-1',
      created_by: 'usr-director',
      created_at: '2026-07-29T11:00:00.000Z',
      version_number: 2,
      mime_type: 'video/mp4',
      size_bytes: 7450000,
      duration_seconds: 15.2,
      original_filename: 'WhatsApp Video 2026-07-29 at 15.25.53.mp4',
      download_filename: 'WhatsApp Video 2026-07-29 at 15.25.53.mp4',
      comment_count: 2,
      open_comment_count: 1,
    },
    {
      id: 'ast-2',
      project_id: 'proj-1',
      name: 'Groom & Bride Portrait Teaser',
      asset_type: 'video',
      status: 'changes_requested',
      current_version_id: 'ver-2',
      created_by: 'usr-director',
      created_at: '2026-07-28T16:00:00.000Z',
      version_number: 1,
      mime_type: 'video/mp4',
      size_bytes: 15400000,
      duration_seconds: 28.4,
      original_filename: 'Sharma_Verma_Sangeet_Teaser_V1.mp4',
      download_filename: 'Sharma_Verma_Sangeet_Teaser_V1.mp4',
      comment_count: 1,
      open_comment_count: 1,
    },
  ],
  'proj-2': [
    {
      id: 'ast-3',
      project_id: 'proj-2',
      name: 'Full Highlights 4K',
      asset_type: 'video',
      status: 'approved',
      current_version_id: 'ver-3',
      created_by: 'usr-director',
      created_at: '2026-07-26T18:00:00.000Z',
      version_number: 1,
      mime_type: 'video/mp4',
      size_bytes: 34500000,
      duration_seconds: 45.0,
      original_filename: 'Aditi_Vikram_FullHighlight_4K.mp4',
      download_filename: 'Aditi_Vikram_FullHighlight_4K.mp4',
      comment_count: 0,
      open_comment_count: 0,
    },
  ],
};

// Aliases for client compatibility
assetsStore['demo-proj-1'] = assetsStore['proj-1'];
assetsStore['demo-proj-2'] = assetsStore['proj-2'];

const versionsStore = {
  'ver-1': {
    id: 'ver-1',
    asset_id: 'ast-1',
    version_number: 2,
    original_filename: 'WhatsApp Video 2026-07-29 at 15.25.53.mp4',
    download_filename: 'WhatsApp Video 2026-07-29 at 15.25.53.mp4',
    mime_type: 'video/mp4',
    size_bytes: 7450000,
    duration_seconds: 15.2,
    created_at: '2026-07-29T11:00:00.000Z',
  },
  'ver-2': {
    id: 'ver-2',
    asset_id: 'ast-2',
    version_number: 1,
    original_filename: 'Sharma_Verma_Sangeet_Teaser_V1.mp4',
    download_filename: 'Sharma_Verma_Sangeet_Teaser_V1.mp4',
    mime_type: 'video/mp4',
    size_bytes: 15400000,
    duration_seconds: 28.4,
    created_at: '2026-07-28T16:00:00.000Z',
  },
  'ver-3': {
    id: 'ver-3',
    asset_id: 'ast-3',
    version_number: 1,
    original_filename: 'Aditi_Vikram_FullHighlight_4K.mp4',
    download_filename: 'Aditi_Vikram_FullHighlight_4K.mp4',
    mime_type: 'video/mp4',
    size_bytes: 34500000,
    duration_seconds: 45.0,
    created_at: '2026-07-26T18:00:00.000Z',
  },
};

const reviewLinksStore = [
  {
    id: 'link-demo-1',
    project_id: 'proj-1',
    asset_id: 'ast-1',
    raw_token_display: 'sharma-wedding-teaser-review',
    shareUrl: '/review/sharma-wedding-teaser-review',
    can_comment: 1,
    can_download: 1,
    can_approve: 1,
    show_previous_versions: 1,
    created_by: 'usr-director',
    created_at: '2026-07-29T12:00:00.000Z',
    asset_name: 'Wedding Teaser Cut V2',
    project_name: 'Sharma - Verma Wedding 2026',
    client_name: 'Rahul Sharma & Ananya Verma',
  },
  {
    id: 'link-demo-2',
    project_id: 'proj-1',
    asset_id: 'ast-1',
    raw_token_display: 'demo-review-token',
    shareUrl: '/review/demo-review-token',
    can_comment: 1,
    can_download: 1,
    can_approve: 1,
    show_previous_versions: 1,
    created_by: 'usr-director',
    created_at: '2026-07-29T12:00:00.000Z',
    asset_name: 'Wedding Teaser Cut V2',
    project_name: 'Sharma - Verma Wedding 2026',
    client_name: 'Rahul Sharma & Ananya Verma',
  },
];

const PERSIST_FILE = '/tmp/wedding_review_links.json';

function loadPersistedLinks() {
  try {
    if (fs.existsSync(PERSIST_FILE)) {
      const data = JSON.parse(fs.readFileSync(PERSIST_FILE, 'utf8'));
      if (Array.isArray(data)) {
        for (const item of data) {
          const idx = reviewLinksStore.findIndex(
            (l) => l.id === item.id || l.raw_token_display === item.raw_token_display
          );
          if (idx === -1) {
            reviewLinksStore.push(item);
          } else if (item.revoked_at) {
            reviewLinksStore[idx].revoked_at = item.revoked_at;
          }
        }
      }
    }
  } catch (e) {}
}

function persistLinks() {
  try {
    fs.writeFileSync(PERSIST_FILE, JSON.stringify(reviewLinksStore), 'utf8');
  } catch (e) {}
}

// Initial load
loadPersistedLinks();

function decodeReviewToken(token) {
  if (!token || typeof token !== 'string' || !token.startsWith('rev_')) return null;
  try {
    let base64 = token.slice(4).replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) base64 += '=';
    const jsonStr = Buffer.from(base64, 'base64').toString('utf8');
    return JSON.parse(jsonStr);
  } catch (e) {
    return null;
  }
}

function findReviewLink(token) {
  loadPersistedLinks();
  let link = reviewLinksStore.find((l) => l.raw_token_display === token || l.id === token);
  if (!link && token && typeof token === 'string' && token.startsWith('rev_')) {
    const payload = decodeReviewToken(token);
    if (payload && (payload.asset_id || payload.astId)) {
      const astId = payload.asset_id || payload.astId;
      const prjId = payload.project_id || payload.prjId || 'proj-1';
      link = {
        id: payload.id || `link-${astId}`,
        project_id: prjId,
        asset_id: astId,
        raw_token_display: token,
        shareUrl: `/review/${token}`,
        can_comment: payload.can_comment ?? payload.com ?? 1,
        can_download: payload.can_download ?? payload.dwn ?? 1,
        can_approve: payload.can_approve ?? payload.app ?? 1,
        show_previous_versions: payload.show_previous_versions ?? payload.prev ?? 1,
        passphrase: payload.passphrase || payload.pass || null,
        expires_at: payload.expires_at || payload.exp || null,
        revoked_at: payload.revoked_at || null,
        asset_name: payload.asset_name || payload.astName || 'Wedding Media Cut',
        project_name: payload.project_name || payload.prjName || 'Wedding Film',
        client_name: payload.client_name || payload.cliName || 'Wedding Client',
      };
      // Check if revoked in store
      const revoked = reviewLinksStore.find((l) => (l.id === link.id || l.raw_token_display === token) && l.revoked_at);
      if (revoked) {
        link.revoked_at = revoked.revoked_at;
      }
    }
  }
  return link;
}

const commentsStore = {
  'ver-1': [
    {
      id: 'cmt-1',
      asset_version_id: 'ver-1',
      author_name: 'Client Reviewer',
      body: 'Color grading adjustment made for wedding vows entrance',
      time_seconds: 5.0,
      status: 'open',
      created_at: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      id: 'cmt-2',
      asset_version_id: 'ver-1',
      author_name: 'Studio Director',
      body: 'Drone establishing shot timing approved',
      time_seconds: 8.5,
      status: 'done',
      created_at: new Date(Date.now() - 7200000).toISOString(),
    },
  ],
};

// Helper: Stream a sample MP4 video with HTTP 206 Partial Content Range support
function streamMedia(req, res) {
  const candidatePaths = [
    path.resolve(process.cwd(), 'public/sample-video.mp4'),
    path.resolve(process.cwd(), '.sample_media/sharma_wedding_highlights_v1.mp4'),
    path.resolve(process.cwd(), 'dist/sample-video.mp4'),
  ];

  const filePath = candidatePaths.find((p) => fs.existsSync(p));

  if (!filePath) {
    // If local file is missing, redirect to static sample video URL
    res.writeHead(302, { Location: '/sample-video.mp4' });
    return res.end();
  }

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.range;

  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunkSize = end - start + 1;

    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunkSize,
      'Content-Type': 'video/mp4',
    });
    fs.createReadStream(filePath, { start, end }).pipe(res);
  } else {
    res.writeHead(200, {
      'Content-Length': fileSize,
      'Content-Type': 'video/mp4',
      'Accept-Ranges': 'bytes',
    });
    fs.createReadStream(filePath).pipe(res);
  }
}

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-review-passphrase, Range');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Range, Accept-Ranges, Content-Length, Content-Disposition');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const url = req.url || '';
  const method = req.method || 'GET';

  // Helper to parse body if string
  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch (e) {
      body = {};
    }
  }

  // Health check
  if (url.includes('/health')) {
    return res.status(200).json({ status: 'online', serverless: true, timestamp: new Date().toISOString() });
  }

  // --------------------------------------------------------------------------
  // MEDIA STREAMING: /api/review/:token/media & /api/assets/:id/versions/:verId/media
  // --------------------------------------------------------------------------
  if (url.includes('/media')) {
    if (url.includes('/review/')) {
      const parts = url.split('?')[0].split('/');
      const revIdx = parts.indexOf('review');
      const tkn = parts[revIdx + 1];
      const link = findReviewLink(tkn);
      if (link && link.revoked_at) {
        return res.status(403).json({ error: 'This review link has been revoked by the studio.' });
      }
      if (link && link.expires_at && new Date(link.expires_at) < new Date()) {
        return res.status(403).json({ error: 'This review link has expired.' });
      }
    }
    return streamMedia(req, res);
  }

  // --------------------------------------------------------------------------
  // MEDIA DOWNLOAD: /api/review/:token/download/:versionId
  // --------------------------------------------------------------------------
  if (url.includes('/download/')) {
    if (url.includes('/review/')) {
      const parts = url.split('?')[0].split('/');
      const revIdx = parts.indexOf('review');
      const tkn = parts[revIdx + 1];
      const link = findReviewLink(tkn);
      if (link && link.revoked_at) {
        return res.status(403).json({ error: 'This review link has been revoked by the studio.' });
      }
      if (link && link.expires_at && new Date(link.expires_at) < new Date()) {
        return res.status(403).json({ error: 'This review link has expired.' });
      }
    }
    const candidatePaths = [
      path.resolve(process.cwd(), 'public/sample-video.mp4'),
      path.resolve(process.cwd(), '.sample_media/sharma_wedding_highlights_v1.mp4'),
      path.resolve(process.cwd(), 'dist/sample-video.mp4'),
    ];
    const filePath = candidatePaths.find((p) => fs.existsSync(p));
    if (filePath) {
      const stat = fs.statSync(filePath);
      res.writeHead(200, {
        'Content-Type': 'video/mp4',
        'Content-Length': stat.size,
        'Content-Disposition': 'attachment; filename="wedding_media_cut.mp4"',
      });
      return fs.createReadStream(filePath).pipe(res);
    }
    return res.redirect(302, '/sample-video.mp4');
  }

  // --------------------------------------------------------------------------
  // Auth: Login / Register / Clerk Sync / Me
  // --------------------------------------------------------------------------
  if (url.includes('/auth/clerk-sync') || url.includes('/auth/login') || url.includes('/auth/register')) {
    const email = body?.email || 'director@luminastudio.com';
    const fullName = body?.fullName || 'Studio Director';
    return res.status(200).json({
      token: 'serverless-token-' + Date.now(),
      user: {
        id: body?.clerkId || 'usr-director',
        organizationId: 'org-wedding-studio',
        organizationName: 'Lumina Wedding Media Studio',
        email,
        fullName,
        role: 'owner',
      },
    });
  }

  if (url.includes('/auth/me')) {
    return res.status(200).json({
      user: {
        id: 'usr-director',
        organizationId: 'org-wedding-studio',
        organizationName: 'Lumina Wedding Media Studio',
        email: 'director@luminastudio.com',
        fullName: 'Studio Director',
        role: 'owner',
      },
    });
  }

  // --------------------------------------------------------------------------
  // Organization Storage Usage & Files & Notifications
  // --------------------------------------------------------------------------
  if (url.includes('/organization/usage')) {
    return res.status(200).json({
      organization: {
        id: 'org-wedding-studio',
        name: 'Lumina Wedding Media Studio',
        driveRootFolderId: 'root',
      },
      storage: {
        quotaBytes: 161061273600,
        quotaGb: '150.00',
        usedBytes: 26316800000,
        usedGb: '24.51',
        usedPercentage: 16.3,
        remainingBytes: 134744473600,
        remainingGb: '125.49',
        warningThreshold: 85,
        blockingThreshold: 98,
        isWarning: false,
        isBlocking: false,
      },
    });
  }

  if (url.includes('/organization/files')) {
    const allFiles = [];
    for (const proj of projectsStore) {
      const projAssets = assetsStore[proj.id] || [];
      for (const asset of projAssets) {
        const ver = versionsStore[asset.current_version_id] || {
          id: asset.current_version_id || 'ver-1',
          version_number: asset.version_number || 1,
          original_filename: asset.original_filename || asset.name,
          download_filename: asset.download_filename || asset.name,
          mime_type: asset.mime_type || 'video/mp4',
          size_bytes: asset.size_bytes || 7450000,
          duration_seconds: asset.duration_seconds || 15.2,
          created_at: asset.created_at,
        };
        const link = reviewLinksStore.find((l) => l.asset_id === asset.id && !l.revoked_at);
        allFiles.push({
          version_id: ver.id,
          version_number: ver.version_number,
          original_filename: ver.original_filename,
          download_filename: ver.download_filename,
          mime_type: ver.mime_type,
          size_bytes: ver.size_bytes,
          duration_seconds: ver.duration_seconds,
          drive_file_id: `gdrive-${ver.id}`,
          created_at: ver.created_at,
          asset_id: asset.id,
          asset_name: asset.name,
          asset_type: asset.asset_type,
          asset_status: asset.status,
          project_id: proj.id,
          project_name: proj.name,
          client_name: proj.client_name,
          drive_folder_id: proj.drive_folder_id,
          review_token: link?.raw_token_display || null,
        });
      }
    }

    return res.status(200).json({
      cloudStorageUrl: 'https://www.jioaicloud.com/l/?u=g4hmxUTO-wgVwF-fLP9Bx-cyfJyX-vprhmiygn1LPJ50buo7GG7VSBbwMbOf04FwhIb',
      files: allFiles,
    });
  }

  if (url.includes('/organization/notifications')) {
    return res.status(200).json({
      notifications: [
        {
          id: 'notif-1',
          organization_id: 'org-wedding-studio',
          project_id: 'proj-1',
          actor_name: 'Client Reviewer',
          event_type: 'comment',
          object_id: 'cmt-1',
          metadata: JSON.stringify({ body: 'Color grading adjustment made', time_seconds: 5.0 }),
          created_at: new Date(Date.now() - 1500000).toISOString(),
          project_name: 'Sharma - Verma Wedding 2026',
          client_name: 'Rahul Sharma & Ananya Verma',
          target_asset_id: 'ast-1',
        },
      ],
    });
  }

  // --------------------------------------------------------------------------
  // REVIEW LINKS ROOT: GET /api/review-links, DELETE /api/review-links/:id
  // --------------------------------------------------------------------------
  if (url.includes('/review-links') && !url.includes('/assets/')) {
    const parts = url.split('?')[0].split('/');
    const linkIndex = parts.indexOf('review-links');
    const linkId = parts[linkIndex + 1];

    if (method === 'DELETE' && linkId) {
      loadPersistedLinks();
      const idx = reviewLinksStore.findIndex((l) => l.id === linkId || l.raw_token_display === linkId);
      if (idx !== -1) {
        reviewLinksStore[idx].revoked_at = new Date().toISOString();
      } else {
        reviewLinksStore.push({
          id: linkId,
          raw_token_display: linkId,
          revoked_at: new Date().toISOString(),
        });
      }
      persistLinks();
      return res.status(200).json({ success: true, revokedId: linkId });
    }

    loadPersistedLinks();
    return res.status(200).json({ reviewLinks: reviewLinksStore });
  }

  // --------------------------------------------------------------------------
  // PROJECTS: GET /api/projects, POST /api/projects
  // --------------------------------------------------------------------------
  if (url.endsWith('/projects') || url.endsWith('/projects/')) {
    if (method === 'POST') {
      const { name, clientName, description } = body || {};
      const newProject = {
        id: `proj-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        organization_id: 'org-wedding-studio',
        name: name || 'New Wedding Film',
        client_name: clientName || 'Wedding Client',
        description: description || '',
        status: 'active',
        drive_folder_id: `gdrive_${Date.now()}`,
        created_by: 'usr-director',
        created_at: new Date().toISOString(),
        asset_count: 0,
        total_bytes: 0,
      };
      projectsStore.unshift(newProject);
      // Newly created projects MUST have empty assets array!
      assetsStore[newProject.id] = [];
      return res.status(200).json({ project: newProject });
    }

    // Return all projects with accurate asset_count
    const projectsWithCount = projectsStore.map((p) => ({
      ...p,
      asset_count: (assetsStore[p.id] || []).length,
      total_bytes: (assetsStore[p.id] || []).reduce((acc, a) => acc + (a.size_bytes || 0), 0),
    }));

    return res.status(200).json({ projects: projectsWithCount });
  }

  // --------------------------------------------------------------------------
  // SPECIFIC PROJECT: /api/projects/:id
  // --------------------------------------------------------------------------
  if (url.includes('/projects/')) {
    const parts = url.split('?')[0].split('/');
    const projIndex = parts.indexOf('projects');
    const projId = parts[projIndex + 1];
    const subRoute = parts[projIndex + 2];

    if (subRoute === 'activity') {
      return res.status(200).json({ activities: [] });
    }

    if (subRoute === 'assets' && method === 'POST') {
      const astId = 'ast-' + Date.now();
      const verId = 'ver-' + Date.now();
      const filename = body?.name || 'Wedding Media Cut';
      const version = {
        id: verId,
        asset_id: astId,
        version_number: 1,
        original_filename: filename,
        download_filename: filename,
        mime_type: 'video/mp4',
        size_bytes: 7450000,
        duration_seconds: 15.2,
        created_at: new Date().toISOString(),
      };
      const asset = {
        id: astId,
        project_id: projId,
        name: filename,
        asset_type: 'video',
        status: 'ready_for_review',
        current_version_id: verId,
        created_by: 'usr-director',
        created_at: new Date().toISOString(),
        version_number: 1,
        mime_type: 'video/mp4',
        size_bytes: 7450000,
        duration_seconds: 15.2,
        original_filename: filename,
        download_filename: filename,
        comment_count: 0,
        open_comment_count: 0,
      };

      if (!assetsStore[projId]) assetsStore[projId] = [];
      assetsStore[projId].unshift(asset);
      versionsStore[verId] = version;

      const p = projectsStore.find((proj) => proj.id === projId);
      if (p) {
        p.asset_count = assetsStore[projId].length;
        p.total_bytes = (p.total_bytes || 0) + asset.size_bytes;
      }

      return res.status(200).json({ asset, currentVersion: version });
    }

    if (method === 'PATCH') {
      const p = projectsStore.find((proj) => proj.id === projId);
      if (p) {
        if (body?.name) p.name = body.name;
        if (body?.clientName) p.client_name = body.clientName;
        if (body?.status) p.status = body.status;
        return res.status(200).json({ project: p });
      }
      return res.status(200).json({
        project: {
          id: projId,
          organization_id: 'org-wedding-studio',
          name: body?.name || 'Updated Wedding Cut',
          client_name: body?.clientName || 'Client',
          status: body?.status || 'active',
          drive_folder_id: 'fld-' + projId,
          created_by: 'usr-director',
          created_at: new Date().toISOString(),
        },
      });
    }

    // GET project: Find in store or return project with EMPTY assets if new!
    const effectiveProjId = projId === 'demo-proj-1' ? 'proj-1' : projId === 'demo-proj-2' ? 'proj-2' : projId;
    let project = projectsStore.find((p) => p.id === projId || p.id === effectiveProjId);
    if (!project) {
      project = {
        id: projId,
        organization_id: 'org-wedding-studio',
        name: 'New Wedding Film',
        client_name: 'Wedding Client',
        description: '',
        status: 'active',
        drive_folder_id: 'fld-' + projId,
        created_by: 'usr-director',
        created_at: new Date().toISOString(),
        asset_count: 0,
        total_bytes: 0,
      };
    }

    // CRITICAL: Only demo projects have initial demo assets; all newly created projects have empty asset list!
    const assets = assetsStore[projId] || assetsStore[effectiveProjId] || [];

    return res.status(200).json({
      project: {
        ...project,
        asset_count: assets.length,
        total_bytes: assets.reduce((acc, a) => acc + (a.size_bytes || 0), 0),
      },
      assets,
    });
  }

  // --------------------------------------------------------------------------
  // ASSETS: /api/assets/:id
  // --------------------------------------------------------------------------
  if (url.includes('/assets/')) {
    const parts = url.split('?')[0].split('/');
    const astIndex = parts.indexOf('assets');
    const astId = parts[astIndex + 1];
    const subRoute = parts[astIndex + 2];

    // Find the asset
    let asset = null;
    let parentProject = null;
    for (const [projId, assets] of Object.entries(assetsStore)) {
      const found = assets.find((a) => a.id === astId);
      if (found) {
        asset = found;
        parentProject = projectsStore.find((p) => p.id === projId);
        break;
      }
    }

    if (!asset) {
      asset = {
        id: astId,
        project_id: 'proj-1',
        name: 'Wedding Media Cut',
        asset_type: 'video',
        status: 'ready_for_review',
        current_version_id: 'ver-1',
        created_by: 'usr-director',
        created_at: new Date().toISOString(),
        version_number: 1,
      };
    }

    // Create / List Review Links for asset
    if (subRoute === 'review-links') {
      if (method === 'POST') {
        const rawToken =
          body?.token ||
          body?.rawToken ||
          `rev-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
        const newReviewLink = {
          id: 'link-' + Date.now(),
          project_id: asset.project_id || 'proj-1',
          asset_id: astId,
          raw_token_display: rawToken,
          shareUrl: `/review/${rawToken}`,
          can_comment: body?.canComment !== false ? 1 : 0,
          can_download: body?.canDownload !== false ? 1 : 0,
          can_approve: body?.canApprove !== false ? 1 : 0,
          show_previous_versions: body?.showPreviousVersions !== false ? 1 : 0,
          passphrase: body?.passphrase || null,
          expires_at: body?.expiresAt || null,
          created_by: 'usr-director',
          created_at: new Date().toISOString(),
          asset_name: asset.name,
          project_name: parentProject?.name || 'Wedding Film',
          client_name: parentProject?.client_name || 'Wedding Client',
        };

        reviewLinksStore.unshift(newReviewLink);
        persistLinks();
        return res.status(200).json({ reviewLink: newReviewLink });
      }

      // GET review links for this asset
      loadPersistedLinks();
      const assetLinks = reviewLinksStore.filter((l) => l.asset_id === astId);
      return res.status(200).json({ reviewLinks: assetLinks });
    }

    if (subRoute === 'versions' && method === 'POST') {
      const verId = 'ver-' + Date.now();
      const filename = body?.name || `${asset.name} V${(asset.version_number || 1) + 1}`;
      const ver = {
        id: verId,
        asset_id: astId,
        version_number: (asset.version_number || 1) + 1,
        original_filename: filename,
        download_filename: filename,
        mime_type: 'video/mp4',
        size_bytes: 7450000,
        duration_seconds: 15.2,
        created_at: new Date().toISOString(),
      };
      versionsStore[verId] = ver;
      asset.current_version_id = verId;
      asset.version_number = ver.version_number;

      return res.status(200).json({ asset, version: ver });
    }

    if (subRoute === 'status' && method === 'PATCH') {
      if (body?.status) {
        asset.status = body.status;
      }
      return res.status(200).json({ asset });
    }

    const currVer = versionsStore[asset.current_version_id] || {
      id: asset.current_version_id || 'ver-1',
      asset_id: astId,
      version_number: asset.version_number || 1,
      original_filename: asset.original_filename || asset.name,
      download_filename: asset.download_filename || asset.name,
      mime_type: asset.mime_type || 'video/mp4',
      size_bytes: asset.size_bytes || 7450000,
      duration_seconds: asset.duration_seconds || 15.2,
      created_at: asset.created_at,
    };

    return res.status(200).json({
      asset,
      currentVersion: currVer,
      versions: [currVer],
    });
  }

  // --------------------------------------------------------------------------
  // COMMENTS: /api/comments
  // --------------------------------------------------------------------------
  if (url.includes('/comments')) {
    if (method === 'POST') {
      const versionId = body?.versionId || 'ver-1';
      const newComment = {
        id: 'cmt-' + Date.now(),
        asset_version_id: versionId,
        author_name: body?.authorName || 'Studio Member',
        body: body?.body || '',
        time_seconds: body?.timeSeconds ?? null,
        status: 'open',
        created_at: new Date().toISOString(),
      };
      if (!commentsStore[versionId]) commentsStore[versionId] = [];
      commentsStore[versionId].push(newComment);
      return res.status(200).json({ comment: newComment });
    }

    if (method === 'PATCH') {
      const commentId = url.split('/').pop();
      return res.status(200).json({
        comment: {
          id: commentId,
          status: body?.status || 'done',
        },
        statusEvent: { id: 'evt-' + Date.now(), previous_status: 'open', new_status: body?.status },
      });
    }

    return res.status(200).json({
      comments: Object.values(commentsStore).flat(),
    });
  }

  // --------------------------------------------------------------------------
  // CLIENT REVIEW ROOM: /api/review/:token (metadata, comments, decision)
  // --------------------------------------------------------------------------
  if (url.includes('/review/')) {
    const parts = url.split('?')[0].split('/');
    const reviewIndex = parts.indexOf('review');
    const token = parts[reviewIndex + 1];
    const subRoute = parts[reviewIndex + 2];

    // Find review link by token or id (including self-describing rev_ tokens and persisted file)
    const link = findReviewLink(token);

    if (!link) {
      return res.status(404).json({ error: 'Review link not found or invalid' });
    }

    if (link.revoked_at) {
      return res.status(403).json({ error: 'This review link has been revoked by the studio.' });
    }

    if (link.expires_at && new Date(link.expires_at) < new Date()) {
      return res.status(403).json({ error: 'This review link has expired.' });
    }

    // Comments submission on review room
    if (subRoute === 'comments' && method === 'POST') {
      const newComment = {
        id: 'cmt-' + Date.now(),
        asset_version_id: body?.versionId || 'ver-1',
        author_name: body?.authorName || link?.client_name || 'Client Reviewer',
        body: body?.body || '',
        time_seconds: body?.timeSeconds ?? null,
        status: 'open',
        created_at: new Date().toISOString(),
      };
      return res.status(200).json({ comment: newComment });
    }

    // Decision submission on review room
    if (subRoute === 'decision' && method === 'POST') {
      return res.status(200).json({
        decision: {
          id: 'dec-' + Date.now(),
          decision: body?.decision || 'approved',
          message: body?.message || '',
          reviewer_name: body?.reviewerName || link?.client_name || 'Client Reviewer',
          created_at: new Date().toISOString(),
        },
        assetStatus: body?.decision === 'approved' ? 'approved' : 'changes_requested',
      });
    }

    // Resolve review link metadata
    const assetId = link.asset_id || 'ast-1';
    let asset = null;
    let project = null;

    for (const [projId, assets] of Object.entries(assetsStore)) {
      const found = assets.find((a) => a.id === assetId);
      if (found) {
        asset = found;
        project = projectsStore.find((p) => p.id === projId || (projId === 'proj-1' && p.id === 'demo-proj-1'));
        break;
      }
    }

    if (!asset) {
      asset = {
        id: assetId,
        project_id: link.project_id || 'proj-1',
        name: link.asset_name || 'Wedding Teaser Cut V2',
        asset_type: 'video',
        status: 'ready_for_review',
        current_version_id: 'ver-' + assetId,
      };
    }

    if (!project) {
      project = {
        name: link.project_name || 'Wedding Film',
        clientName: link.client_name || 'Wedding Client',
      };
    }

    const version = versionsStore[asset.current_version_id || 'ver-1'] || {
      id: asset.current_version_id || 'ver-' + asset.id,
      asset_id: asset.id,
      version_number: 1,
      original_filename: `${asset.name}.mp4`,
      download_filename: `${asset.name}.mp4`,
      mime_type: 'video/mp4',
      size_bytes: 7450000,
      duration_seconds: 15.2,
      created_at: link.created_at || new Date().toISOString(),
    };

    const comments = commentsStore[version.id] || [
      {
        id: 'cmt-1',
        asset_version_id: version.id,
        author_name: 'Client Reviewer',
        body: 'Color grading looks stunning!',
        time_seconds: 5.0,
        status: 'open',
        created_at: new Date(Date.now() - 3600000).toISOString(),
      },
    ];

    return res.status(200).json({
      requiresPassphrase: Boolean(link?.passphrase && req.headers['x-review-passphrase'] !== link.passphrase),
      project: {
        name: project.name,
        clientName: project.client_name || project.clientName,
      },
      asset: {
        id: asset.id,
        name: asset.name,
        type: asset.asset_type || 'video',
        status: asset.status || 'ready_for_review',
        currentVersionId: version.id,
      },
      permissions: {
        canComment: link ? Boolean(link.can_comment) : true,
        canDownload: link ? Boolean(link.can_download) : true,
        canApprove: link ? Boolean(link.can_approve) : true,
        showPreviousVersions: link ? Boolean(link.show_previous_versions) : true,
      },
      currentVersion: version,
      versions: [version],
      comments,
    });
  }

  // Fallback 200 JSON for any unhandled routes
  return res.status(200).json({ success: true, message: 'Vercel API route active', url, method });
}
