// Vercel Serverless API Handler
export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-review-passphrase');

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

  // Auth: Login / Register / Clerk Sync / Me
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

  // Organization Storage Usage
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

  // Organization Files & Jio AI Cloud Vault Link
  if (url.includes('/organization/files')) {
    return res.status(200).json({
      cloudStorageUrl: 'https://www.jioaicloud.com/l/?u=g4hmxUTO-wgVwF-fLP9Bx-cyfJyX-vprhmiygn1LPJ50buo7GG7VSBbwMbOf04FwhIb',
      files: [
        {
          version_id: 'ver-1',
          version_number: 2,
          original_filename: 'WhatsApp Video 2026-07-29 at 15.25.53.mp4',
          download_filename: 'WhatsApp Video 2026-07-29 at 15.25.53.mp4',
          mime_type: 'video/mp4',
          size_bytes: 7450000,
          duration_seconds: 15.2,
          drive_file_id: 'jio-drive-1',
          created_at: '2026-07-29T11:00:00.000Z',
          asset_id: 'ast-1',
          asset_name: 'Wedding Teaser Cut V2',
          asset_type: 'video',
          asset_status: 'ready_for_review',
          project_id: 'proj-1',
          project_name: 'Sharma - Verma Wedding 2026',
          client_name: 'Rahul Sharma & Ananya Verma',
          drive_folder_id: 'fld-1',
          review_token: 'sharma-wedding-teaser-review',
        },
        {
          version_id: 'ver-2',
          version_number: 1,
          original_filename: 'Sharma_Verma_Sangeet_Teaser_V1.mp4',
          download_filename: 'Sharma_Verma_Sangeet_Teaser_V1.mp4',
          mime_type: 'video/mp4',
          size_bytes: 15400000,
          duration_seconds: 28.4,
          drive_file_id: 'jio-drive-2',
          created_at: '2026-07-28T16:00:00.000Z',
          asset_id: 'ast-2',
          asset_name: 'Groom & Bride Portrait Teaser',
          asset_type: 'video',
          asset_status: 'changes_requested',
          project_id: 'proj-1',
          project_name: 'Sharma - Verma Wedding 2026',
          client_name: 'Rahul Sharma & Ananya Verma',
          drive_folder_id: 'fld-1',
          review_token: null,
        },
      ],
    });
  }

  // Organization Notifications
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
          metadata: JSON.stringify({ body: 'lalaa', time_seconds: 5.0 }),
          created_at: new Date(Date.now() - 1500000).toISOString(),
          project_name: 'Sharma - Verma Wedding 2026',
          client_name: 'Rahul Sharma & Ananya Verma',
          target_asset_id: 'ast-1',
        },
      ],
    });
  }

  // Projects: GET /api/projects
  if (url.endsWith('/projects') || url.endsWith('/projects/')) {
    if (method === 'POST') {
      const { name, clientName, description } = body || {};
      const newProject = {
        id: `proj-${Date.now()}`,
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
      return res.status(200).json({ project: newProject });
    }

    return res.status(200).json({
      projects: [
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
      ],
    });
  }

  // Specific Project: /api/projects/:id
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
      const asset = {
        id: astId,
        project_id: projId,
        name: 'Wedding Media Cut',
        asset_type: 'video',
        status: 'ready_for_review',
        current_version_id: verId,
        created_by: 'usr-director',
        created_at: new Date().toISOString(),
        version_number: 1,
        mime_type: 'video/mp4',
        size_bytes: 7450000,
        duration_seconds: 15.2,
      };
      const version = {
        id: verId,
        asset_id: astId,
        version_number: 1,
        original_filename: 'WhatsApp Video 2026-07-29 at 15.25.53.mp4',
        download_filename: 'WhatsApp Video 2026-07-29 at 15.25.53.mp4',
        mime_type: 'video/mp4',
        size_bytes: 7450000,
        duration_seconds: 15.2,
        created_at: new Date().toISOString(),
      };
      return res.status(200).json({ asset, currentVersion: version });
    }

    if (method === 'PATCH') {
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

    // Default GET project
    const defaultName = projId === 'proj-2' ? 'Aditi & Vikram Sangeet & Reception' : 'Sharma - Verma Wedding 2026';
    const defaultClient = projId === 'proj-2' ? 'Aditi Kapoor' : 'Rahul Sharma & Ananya Verma';

    return res.status(200).json({
      project: {
        id: projId,
        organization_id: 'org-wedding-studio',
        name: body?.name || defaultName,
        client_name: body?.clientName || defaultClient,
        description: 'Cinematic wedding cut, Sangeet highlights, and 4K teaser in Udaipur.',
        status: 'active',
        drive_folder_id: 'fld-' + projId,
        created_by: 'usr-director',
        created_at: new Date().toISOString(),
        asset_count: 2,
        total_bytes: 22850000,
      },
      assets: [
        {
          id: 'ast-1',
          project_id: projId,
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
          comment_count: 2,
          open_comment_count: 1,
        },
      ],
    });
  }

  // Assets: /api/assets/:id
  if (url.includes('/assets/')) {
    const parts = url.split('?')[0].split('/');
    const astIndex = parts.indexOf('assets');
    const astId = parts[astIndex + 1];
    const subRoute = parts[astIndex + 2];

    if (subRoute === 'review-links') {
      if (method === 'POST') {
        return res.status(200).json({
          reviewLink: {
            id: 'link-' + Date.now(),
            project_id: 'proj-1',
            asset_id: astId,
            raw_token_display: 'sharma-wedding-teaser-review',
            can_comment: 1,
            can_download: 1,
            can_approve: 1,
            show_previous_versions: 1,
            created_by: 'usr-director',
            created_at: new Date().toISOString(),
          },
        });
      }
      return res.status(200).json({ reviewLinks: [] });
    }

    if (subRoute === 'versions' && method === 'POST') {
      const ver = {
        id: 'ver-' + Date.now(),
        asset_id: astId,
        version_number: 2,
        original_filename: 'WhatsApp Video 2026-07-29 at 15.25.53.mp4',
        download_filename: 'WhatsApp Video 2026-07-29 at 15.25.53.mp4',
        mime_type: 'video/mp4',
        size_bytes: 7450000,
        duration_seconds: 15.2,
        created_at: new Date().toISOString(),
      };
      return res.status(200).json({
        asset: {
          id: astId,
          project_id: 'proj-1',
          name: 'Wedding Teaser Cut V2',
          asset_type: 'video',
          status: 'ready_for_review',
          current_version_id: ver.id,
          created_by: 'usr-director',
          created_at: new Date().toISOString(),
        },
        version: ver,
      });
    }

    const version = {
      id: 'ver-1',
      asset_id: astId,
      version_number: 2,
      original_filename: 'WhatsApp Video 2026-07-29 at 15.25.53.mp4',
      download_filename: 'WhatsApp Video 2026-07-29 at 15.25.53.mp4',
      mime_type: 'video/mp4',
      size_bytes: 7450000,
      duration_seconds: 15.2,
      created_at: '2026-07-29T11:00:00.000Z',
    };

    return res.status(200).json({
      asset: {
        id: astId,
        project_id: 'proj-1',
        name: 'Wedding Teaser Cut V2',
        asset_type: 'video',
        status: 'ready_for_review',
        current_version_id: 'ver-1',
        created_by: 'usr-director',
        created_at: '2026-07-29T11:00:00.000Z',
      },
      currentVersion: version,
      versions: [version],
    });
  }

  // Comments: /api/comments
  if (url.includes('/comments')) {
    if (method === 'POST') {
      return res.status(200).json({
        comment: {
          id: 'cmt-' + Date.now(),
          asset_version_id: 'ver-1',
          author_name: body?.authorName || 'Studio Member',
          body: body?.body || '',
          time_seconds: body?.timeSeconds ?? null,
          status: 'open',
          created_at: new Date().toISOString(),
        },
      });
    }
    if (method === 'PATCH') {
      return res.status(200).json({
        comment: {
          id: 'cmt-1',
          status: body?.status || 'done',
        },
        statusEvent: { id: 'evt-' + Date.now(), previous_status: 'open', new_status: body?.status },
      });
    }
    return res.status(200).json({
      comments: [
        {
          id: 'cmt-1',
          asset_version_id: 'ver-1',
          author_name: 'Client Reviewer',
          body: 'lalaa',
          time_seconds: 5.0,
          status: 'open',
          created_at: new Date(Date.now() - 3600000).toISOString(),
        },
      ],
    });
  }

  // Review Room: /api/review/:token
  if (url.includes('/review/')) {
    const version = {
      id: 'ver-1',
      asset_id: 'ast-1',
      version_number: 2,
      original_filename: 'WhatsApp Video 2026-07-29 at 15.25.53.mp4',
      download_filename: 'WhatsApp Video 2026-07-29 at 15.25.53.mp4',
      mime_type: 'video/mp4',
      size_bytes: 7450000,
      duration_seconds: 15.2,
      created_at: '2026-07-29T11:00:00.000Z',
    };

    return res.status(200).json({
      requiresPassphrase: false,
      project: {
        name: 'Sharma - Verma Wedding 2026',
        clientName: 'Rahul Sharma & Ananya Verma',
      },
      asset: {
        id: 'ast-1',
        name: 'Wedding Teaser Cut V2',
        type: 'video',
        status: 'ready_for_review',
        currentVersionId: 'ver-1',
      },
      permissions: {
        canComment: true,
        canDownload: true,
        canApprove: true,
        showPreviousVersions: true,
      },
      currentVersion: version,
      versions: [version],
      comments: [
        {
          id: 'cmt-1',
          asset_version_id: 'ver-1',
          author_name: 'Client Reviewer',
          body: 'lalaa',
          time_seconds: 5.0,
          status: 'open',
          created_at: new Date(Date.now() - 3600000).toISOString(),
        },
      ],
    });
  }

  // Fallback 200 JSON for any other API endpoints
  return res.status(200).json({ success: true, message: 'Vercel API route active', url, method });
}
