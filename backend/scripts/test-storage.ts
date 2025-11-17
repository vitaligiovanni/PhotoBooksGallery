import 'dotenv/config';
import { createStorageProvider, generateUploadKey } from '../src/utils/storageProvider';

async function main() {
  console.log('NODE_ENV=', process.env.NODE_ENV);
  const storage = createStorageProvider();
  const key = generateUploadKey('test-upload-id', 'photo-1.jpg');
  console.log('Generated key:', key);
  const url = await storage.createPresignedPut(key, 'image/jpeg', 3600);
  console.log('Presigned PUT URL:', url);
}

main().catch(err => {
  console.error('Storage test failed:', err);
  process.exit(1);
});
