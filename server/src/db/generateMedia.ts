import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

export function ensureSampleMedia(): { v1Path: string; v2Path: string; imgPath: string; pdfPath: string } {
  const sampleDir = path.resolve(process.cwd(), '.sample_media');
  if (!fs.existsSync(sampleDir)) {
    fs.mkdirSync(sampleDir, { recursive: true });
  }

  const v1Path = path.join(sampleDir, 'sharma_wedding_highlights_v1.mp4');
  const v2Path = path.join(sampleDir, 'sharma_wedding_highlights_v2.mp4');
  const imgPath = path.join(sampleDir, 'wedding_portrait_preview.png');
  const pdfPath = path.join(sampleDir, 'wedding_event_schedule.pdf');

  // 1. Generate V1 MP4 with ffmpeg (20-second dynamic test pattern + audio)
  if (!fs.existsSync(v1Path)) {
    try {
      console.log('Generating sample MP4 video (V1)...');
      execSync(
        `ffmpeg -y -f lavfi -i testsrc=duration=20:size=1280x720:rate=30 -f lavfi -i sine=frequency=440:duration=20 -c:v libx264 -pix_fmt yuv420p -c:a aac -b:a 128k -movflags +faststart "${v1Path}"`,
        { stdio: 'ignore' }
      );
    } catch (e) {
      console.warn('Could not generate sample video via ffmpeg', e);
    }
  }

  // 2. Generate V2 MP4 with ffmpeg (20-second SMPTE color bars + distinct audio pitch)
  if (!fs.existsSync(v2Path)) {
    try {
      console.log('Generating revised sample MP4 video (V2)...');
      execSync(
        `ffmpeg -y -f lavfi -i smptebars=duration=20:size=1280x720:rate=30 -f lavfi -i sine=frequency=580:duration=20 -c:v libx264 -pix_fmt yuv420p -c:a aac -b:a 128k -movflags +faststart "${v2Path}"`,
        { stdio: 'ignore' }
      );
    } catch (e) {
      console.warn('Could not generate sample video v2', e);
    }
  }

  // 3. Generate sample PNG
  if (!fs.existsSync(imgPath)) {
    try {
      execSync(
        `ffmpeg -y -f lavfi -i testsrc=duration=1:size=1200x800:rate=1 -frames:v 1 "${imgPath}"`,
        { stdio: 'ignore' }
      );
    } catch (e) {
      fs.writeFileSync(imgPath, Buffer.from('Mock PNG image'));
    }
  }

  // 4. Sample PDF
  if (!fs.existsSync(pdfPath)) {
    const minimalPdf = `%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj
4 0 obj<</Length 92>>stream
BT /F1 24 Tf 70 700 Td (Wedding Photography & Video Delivery Schedule) Tj ET
endstream endobj
5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000052 00000 n 
0000000101 00000 n 
0000000213 00000 n 
0000000355 00000 n 
trailer<</Size 6/Root 1 0 R>>
startxref
424
%%EOF`;
    fs.writeFileSync(pdfPath, minimalPdf);
  }

  return { v1Path, v2Path, imgPath, pdfPath };
}
