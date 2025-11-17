import 'dotenv/config';
import { db } from '../src/db';
// Use relative import to avoid path alias issues when running this script directly
import { uploads } from '../../shared/schema';
import { v4 as uuidv4 } from 'uuid';

async function main() {
  const uploadId = uuidv4();
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
  const price = 15000;
  console.log('Inserting upload with id', uploadId);
  const [row] = await db.insert(uploads).values({
    id: uploadId,
    phone: '+37412345678',
    format: 'square',
    size: '20x20',
    pages: 24,
    price: price.toString(),
    comment: null,
    status: 'pending',
    expiresAt,
  } as any).returning();
  console.log('Inserted:', row);
}

main().catch(err => {
  console.error('Insert failed:', err);
  process.exit(1);
});
