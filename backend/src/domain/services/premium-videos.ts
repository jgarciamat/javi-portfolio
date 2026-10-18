/**
 * The Premium videos of the «Videoteca». On YouTube they are unlisted, so their ids never reach the
 * public web app: the server gives them to Premium users only (GET /api/videos/premium).
 *
 * How to add one: a line `number: 'youtubeId'` below (the `v=` part of the link), and
 * `published: true` in its entry of `frontend/src/modules/guides/domain/videos.ts` so the card shows.
 */
export const PREMIUM_VIDEO_IDS: Readonly<Record<number, string>> = {
  17: 'I6XofjXihyA',
  18: '5D9_c2lZJmo',
  19: 'Ke11Uw8OCe4',
  20: 'FFNWp0s6SD4',
  27: 'XMyY6z7269s',
  28: '097frSE3Hac',
  29: 'xA1dbQuHuSQ',
  39: 'LpONlSKhTCA',
  40: '9p0NXNZj8C8',
  41: 'uebBMXI8-40',
  42: 'Ah-CTg4FYG8',
  43: 'ajLH0b66HRs',
  44: 'Z4tKw-vI7s0',
};
