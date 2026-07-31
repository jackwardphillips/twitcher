import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import {
  redactErrorMessage,
  redactUrl,
  validateConnectedIdentity,
  validateTestDatabaseEnvironment,
} from '../../test-db-guard.js';
import { unitTestFiles } from '../../test-tiers';

const safeEnvironment = {
  TEST_DATABASE_URL: 'postgresql://twitcher_test:secret@localhost:5432/twitcher_test',
  ALLOW_TEST_DATABASE_RESET: '1',
};

describe('disposable test database guard', () => {
  it('accepts the disposable CI database convention', () => {
    expect(validateTestDatabaseEnvironment(safeEnvironment)).toMatchObject({
      database: 'twitcher_test',
      role: 'twitcher_test',
    });
  });

  it('accepts an explicitly acknowledged Neon branch with a different endpoint', () => {
    expect(validateTestDatabaseEnvironment({
      TEST_DATABASE_URL: 'postgresql://owner:secret@ep-test-branch-pooler.us-east-1.aws.neon.tech/neondb',
      PRODUCTION_DATABASE_URL: 'postgresql://owner:secret@ep-production-pooler.us-east-1.aws.neon.tech/neondb',
      ALLOW_TEST_DATABASE_RESET: '1',
      ALLOW_NEON_BRANCH_RESET: '1',
    })).toMatchObject({
      database: 'neondb',
      role: 'owner',
    });
  });

  it.each([
    [{
      TEST_DATABASE_URL: 'postgresql://owner:x@ep-test.us-east-1.aws.neon.tech/neondb',
      ALLOW_TEST_DATABASE_RESET: '1',
      ALLOW_NEON_BRANCH_RESET: '1',
    }, 'PRODUCTION_DATABASE_URL is required'],
    [{
      TEST_DATABASE_URL: 'postgresql://owner:x@ep-production-pooler.us-east-1.aws.neon.tech/neondb',
      PRODUCTION_DATABASE_URL: 'postgresql://owner:x@ep-production.us-east-1.aws.neon.tech/neondb',
      ALLOW_TEST_DATABASE_RESET: '1',
      ALLOW_NEON_BRANCH_RESET: '1',
    }, 'must differ from production'],
    [{
      TEST_DATABASE_URL: 'postgresql://owner:x@localhost/neondb',
      PRODUCTION_DATABASE_URL: 'postgresql://owner:x@ep-production.us-east-1.aws.neon.tech/neondb',
      ALLOW_TEST_DATABASE_RESET: '1',
      ALLOW_NEON_BRANCH_RESET: '1',
    }, 'require a neon.tech'],
  ])('rejects unsafe Neon branch reset configuration', (environment, message) => {
    expect(() => validateTestDatabaseEnvironment(environment)).toThrow(message);
  });

  it.each([
    [{ ALLOW_TEST_DATABASE_RESET: '1' }, 'TEST_DATABASE_URL is required'],
    [{ ...safeEnvironment, ALLOW_TEST_DATABASE_RESET: 'yes' }, 'must be exactly "1"'],
    [{ ...safeEnvironment, TEST_DATABASE_URL: 'not a url' }, 'must be a valid URL'],
    [{ ...safeEnvironment, TEST_DATABASE_URL: 'file:./test.db' }, 'must use PostgreSQL'],
    [{ ...safeEnvironment, TEST_DATABASE_URL: 'postgresql://twitcher_test:x@localhost/twitcher' }, 'database name must end'],
    [{ ...safeEnvironment, TEST_DATABASE_URL: 'postgresql://twitcher:x@localhost/twitcher_test' }, 'database role must end'],
  ])('rejects unsafe configuration', (environment, message) => {
    expect(() => validateTestDatabaseEnvironment(environment)).toThrow(message);
  });

  it('rejects a connected database or role that differs from the URL', () => {
    const expected = validateTestDatabaseEnvironment(safeEnvironment);
    expect(() => validateConnectedIdentity(expected, {
      database: 'production',
      role: expected.role,
    })).toThrow('Connected database does not match');
    expect(() => validateConnectedIdentity(expected, {
      database: expected.database,
      role: 'production',
    })).toThrow('Connected database role does not match');
  });

  it('redacts passwords', () => {
    expect(redactUrl(safeEnvironment.TEST_DATABASE_URL)).not.toContain('secret');
    expect(redactErrorMessage(
      `Connection failed for ${safeEnvironment.TEST_DATABASE_URL}: secret`,
      safeEnvironment.TEST_DATABASE_URL,
    )).not.toContain('secret');
  });

  it('assigns each explicitly database-free test to an existing unique file', () => {
    expect(new Set(unitTestFiles).size).toBe(unitTestFiles.length);
    expect(unitTestFiles.every((file) => existsSync(file))).toBe(true);
  });
});
