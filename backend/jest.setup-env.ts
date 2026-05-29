// Se ejecuta antes de los imports de cada archivo de test (setupFiles).
// Carga .env.test y fuerza DATABASE_URL/JWT_SECRET hacia la base de datos de test
// ANTES de que los controllers instancien PrismaClient.
import { config } from 'dotenv';

config({ path: '.env.test', override: true });
