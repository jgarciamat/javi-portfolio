import request from 'supertest';
import { TestContext, createTestApp } from '../helpers/testApp';

describe('Client error reports', () => {
  let ctx: TestContext;
  let warn: jest.SpyInstance;

  beforeEach(() => {
    ctx = createTestApp();
    warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => warn.mockRestore());

  it('logs the report without the query string, no session needed', async () => {
    await request(ctx.app)
      .post('/api/client-errors')
      .set('User-Agent', 'jest')
      .send({
        kind: 'render',
        message: 'boom',
        stack: 'Error: boom\n    at App',
        path: '/reset-password?token=secret#x',
      })
      .expect(204);
    expect(warn).toHaveBeenCalledTimes(1);
    const line = warn.mock.calls[0][0] as string;
    expect(line.startsWith('[client] ')).toBe(true);
    expect(JSON.parse(line.slice(9))).toEqual({
      kind: 'render',
      message: 'boom',
      stack: 'Error: boom\n    at App',
      path: '/reset-password',
      userAgent: 'jest',
    });
    expect(line).not.toContain('secret');
  });

  it('accepts a report with only the required fields', async () => {
    await request(ctx.app)
      .post('/api/client-errors')
      .send({ kind: 'unhandledrejection', message: 'nope' })
      .expect(204);
    expect(JSON.parse((warn.mock.calls[0][0] as string).slice(9))).toMatchObject({
      kind: 'unhandledrejection',
      message: 'nope',
    });
  });

  it('rejects malformed reports', async () => {
    const res = await request(ctx.app)
      .post('/api/client-errors')
      .send({ kind: 'other', message: '' })
      .expect(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
    expect(warn).not.toHaveBeenCalled();
  });
});

describe('Unexpected server errors', () => {
  it('are reported to the tracker (when there is one) without the query string', async () => {
    const { errorHandler } = await import('../../infrastructure/http/middleware');
    const capture = jest.fn();
    const handler = errorHandler({ error: jest.fn() }, { capture });
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const err = new Error('boom');
    handler(err, { method: 'GET', originalUrl: '/api/x?t=1' } as never, res as never, jest.fn());
    expect(res.status).toHaveBeenCalledWith(500);
    expect(capture).toHaveBeenCalledWith(err, { method: 'GET', path: '/api/x?t=1' });
  });
});
