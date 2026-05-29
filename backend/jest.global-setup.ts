// globalSetup de Jest: se ejecuta una sola vez antes de toda la suite.
// Crea la base de datos de test (si no existe) y sincroniza el schema con
// `prisma db push --force-reset` para arrancar siempre desde un estado limpio.
import { execSync } from 'child_process';
import { config } from 'dotenv';

export default async function globalSetup(): Promise<void> {
  config({ path: '.env.test', override: true });

  execSync('npx prisma db push --force-reset --skip-generate', {
    stdio: 'inherit',
    env: { ...process.env },
  });
}
