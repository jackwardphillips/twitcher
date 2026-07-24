export interface TestDatabaseEnvironment {
  TEST_DATABASE_URL?: string;
  ALLOW_TEST_DATABASE_RESET?: string;
}

export interface TestDatabaseIdentity {
  database: string;
  role: string;
}

export interface TestDatabaseTarget extends TestDatabaseIdentity {
  rawUrl: string;
}

export function validateTestDatabaseEnvironment(
  environment: TestDatabaseEnvironment,
): TestDatabaseTarget;

export function validateConnectedIdentity(
  expected: TestDatabaseIdentity,
  actual: TestDatabaseIdentity,
): void;

export function redactUrl(rawUrl: string): string;

export function redactErrorMessage(message: string, rawUrl: string): string;
