import { GUIDES } from '@modules/guides/domain/guides';
import { guideVideo, guidesForTool } from '@modules/guides/domain/guideLinks';
import { VIDEOS, type VideoEntry } from '@modules/guides/domain/videos';
import { TOOL_PAGES } from '@modules/tools/domain/toolPages';

describe('links between guides, calculators and videos', () => {
  it('pairs guides with a public video only', () => {
    expect(guideVideo('modelo-130-paso-a-paso')?.number).toBe(23);
    expect(guideVideo('no-such-guide')).toBeUndefined();
    const premium: VideoEntry[] = [
      { number: 23, section: 'hacienda', title: 'x', premium: true, published: true },
    ];
    expect(guideVideo('modelo-130-paso-a-paso', premium)).toBeUndefined();
    for (const g of GUIDES) {
      const video = guideVideo(g.slug);
      if (video) {
        expect(video.youtubeId).toBeTruthy();
        expect(video.premium).toBeUndefined();
      }
    }
    expect(VIDEOS.length).toBeGreaterThan(0);
  });

  it('gives every calculator at least one guide', () => {
    for (const tool of TOOL_PAGES) expect(guidesForTool(tool.path).length).toBeGreaterThan(0);
    expect(guidesForTool('/calculadora-iva').map((g) => g.slug)).toContain(
      'iva-para-autonomos-modelo-303'
    );
    expect(guidesForTool('/nope')).toEqual([]);
  });
});

describe('sitemap videos', () => {
  it('lists every public video and never a Premium one', async () => {
    const { readFileSync } = await import('fs');
    const sitemap = readFileSync('public/sitemap.xml', 'utf8');
    for (const v of VIDEOS) {
      const thumb = `/videos/${String(v.number).padStart(2, '0')}.webp</video:thumbnail_loc>`;
      if (v.premium) expect(sitemap).not.toContain(thumb);
      else if (v.youtubeId) {
        expect(sitemap).toContain(thumb);
        expect(sitemap).toContain(`https://www.youtube.com/embed/${v.youtubeId}<`);
      }
    }
  });
});
