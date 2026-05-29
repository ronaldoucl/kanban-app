import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/*.test.ts'],
  // Carga .env.test antes de los imports de cada archivo de test
  setupFiles: ['<rootDir>/jest.setup-env.ts'],
  // Crea/recrea el schema de la base de datos de test una sola vez
  globalSetup: '<rootDir>/jest.global-setup.ts',
};

export default config;
