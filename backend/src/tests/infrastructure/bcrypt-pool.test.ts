import bcrypt from 'bcryptjs';
import { BcryptPasswordHasher } from '@infrastructure/auth/JwtTokenService';
import { BcryptWorkerPool, sharedBcryptPool } from '@infrastructure/auth/bcryptPool';

describe('BcryptWorkerPool', () => {
  const pool = new BcryptWorkerPool(2);
  afterAll(() => pool.close());

  it('hashes like bcryptjs and verifies hashes made by bcryptjs', async () => {
    const hash = await pool.hash('Secret-123', 4);
    expect(hash).toMatch(/^\$2b\$04\$/);
    expect(bcrypt.compareSync('Secret-123', hash)).toBe(true);
    const old = bcrypt.hashSync('Secret-123', 4);
    await expect(pool.compare('Secret-123', old)).resolves.toBe(true);
    await expect(pool.compare('wrong', old)).resolves.toBe(false);
  });

  it('queues more jobs than threads', async () => {
    const hashes = await Promise.all(['a', 'b', 'c', 'd', 'e'].map((p) => pool.hash(p, 4)));
    const checks = await Promise.all(hashes.map((h, i) => pool.compare('abcde'[i], h)));
    expect(checks).toEqual([true, true, true, true, true]);
  });

  it('reports the errors of bcrypt', async () => {
    await expect(pool.compare('x', 123 as unknown as string)).rejects.toThrow(/Illegal arguments/);
    await expect(pool.hash('still', 4)).resolves.toMatch(/^\$2b\$/);
  });

  it('replaces a thread that dies', async () => {
    const crashing = new BcryptWorkerPool(
      1,
      `require('worker_threads').parentPort.on('message', () => { throw new Error('boom'); });`
    );
    await expect(crashing.hash('x', 4)).rejects.toThrow('boom');
    await expect(crashing.hash('x', 4)).rejects.toThrow('boom');
    await crashing.close();
  });

  it('does not block the event loop while hashing', async () => {
    const started = Date.now();
    let ticks = 0;
    const timer = setInterval(() => ticks++, 5);
    await pool.hash('Secret-123', 10);
    clearInterval(timer);
    // A blocking hash would leave the timer no chance to run until the end.
    expect(ticks).toBeGreaterThan((Date.now() - started) / 20);
  });
});

describe('BcryptPasswordHasher', () => {
  afterAll(() => sharedBcryptPool().close());

  it('hashes and verifies through the shared pool', async () => {
    const hasher = new BcryptPasswordHasher(4);
    const hash = await hasher.hash('Secret-123');
    await expect(hasher.verify('Secret-123', hash)).resolves.toBe(true);
    await expect(hasher.verify('nope', hash)).resolves.toBe(false);
    expect(sharedBcryptPool()).toBe(sharedBcryptPool());
  });
});
