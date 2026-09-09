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

  // Fallback 200 JSON for any unhandled API endpoints
  return res.status(200).json({ success: true, message: 'Vercel API route active', url, method });
}
