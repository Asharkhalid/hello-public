import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env file
const envPath = resolve(process.cwd(), '.env');
config({ path: envPath });

console.log('✅ Environment variables loaded from:', envPath);