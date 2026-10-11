import { DisabledPushSender, WebPushSender } from '@infrastructure/push/WebPushSender';

const sub = { endpoint: 'https://push.test/x', p256dh: 'p', auth: 'a' };
const payload = { title: 'T', body: 'B', url: '/' };
const keys = { publicKey: 'pub', privateKey: 'priv', subject: 'mailto:a@b.c' };

describe('WebPushSender', () => {
  const make = (send: jest.Mock) => {
    const client = { sendNotification: send, setVapidDetails: jest.fn() };
    return { sender: new WebPushSender(keys, client as never), client };
  };

  it('signs with the VAPID keys and sends the payload as JSON', async () => {
    const { sender, client } = make(jest.fn().mockResolvedValue({}));
    expect(client.setVapidDetails).toHaveBeenCalledWith('mailto:a@b.c', 'pub', 'priv');
    expect(sender.enabled).toBe(true);
    expect(sender.publicKey()).toBe('pub');
    expect(await sender.send(sub, payload)).toBe('sent');
    const [target, body] = client.sendNotification.mock.calls[0];
    expect(target).toEqual({ endpoint: sub.endpoint, keys: { p256dh: 'p', auth: 'a' } });
    expect(JSON.parse(body)).toEqual(payload);
  });

  it('reports gone subscriptions and rethrows the other errors', async () => {
    expect(
      await make(jest.fn().mockRejectedValue({ statusCode: 410 })).sender.send(sub, payload)
    ).toBe('gone');
    expect(
      await make(jest.fn().mockRejectedValue({ statusCode: 404 })).sender.send(sub, payload)
    ).toBe('gone');
    await expect(
      make(jest.fn().mockRejectedValue({ statusCode: 500 })).sender.send(sub, payload)
    ).rejects.toEqual({
      statusCode: 500,
    });
  });
});

describe('DisabledPushSender', () => {
  it('is off and sends nothing', async () => {
    const sender = new DisabledPushSender();
    expect(sender.enabled).toBe(false);
    expect(sender.publicKey()).toBeNull();
    expect(await sender.send()).toBe('sent');
  });
});
