import { cpSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const distDir = join(__dirname, '..', 'dist');
const pbPublicDir = join(__dirname, '..', '..', 'pb_public');

try {
  // Ensure pb_public directory exists
  if (!existsSync(pbPublicDir)) {
    mkdirSync(pbPublicDir, { recursive: true });
  }

  // Copy all files from dist to pb_public
  cpSync(distDir, pbPublicDir, {
    recursive: true,
    force: true
  });

  console.log('✅ Successfully copied build files to pb_public');
} catch (error) {
  console.error('❌ Error copying files to pb_public:', error);
  process.exit(1);
}