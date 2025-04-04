// loadEnv.js
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from project root
config({ path: path.resolve(__dirname, '.env') });


console.log('✅ Environment variables loaded');