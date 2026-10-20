import { expect, type Locator, type Page } from '@playwright/test';

const NEXT = /^(Siguiente →|Terminar el paso \d+ ✓)/;
const NOT_APPLICABLE = /^(No tengo|No sé|No soy|No hay|No)/;

/** The card of the question on screen: the one that holds the «Siguiente» button. */
function card(page: Page): Locator {
  return page
    .getByRole('button', { name: NEXT })
    .locator('xpath=ancestor::*[self::section or @role="region"][1]');
}

async function titleOf(page: Page): Promise<string> {
  return (await card(page).getByRole('heading', { level: 2 }).first().textContent()) ?? '';
}

export interface WalkOptions {
  /** Named answers: a part of the question → the text of the option (or the value to type). */
  answers?: Record<string, string>;
  /** The walk ends when this button is on screen (the last step of the assistant). */
  until: Locator;
}

/**
 * Walks a guided assistant (Renta or Autónomos) from the question on screen to its last step:
 * on each question it answers («No» where it can, the first option otherwise), fills the fields
 * and moves on, waiting for the next question every time. The same answers give the same path.
 */
export async function walkWizard(page: Page, options: WalkOptions): Promise<string[]> {
  const asked: string[] = [];
  for (let i = 0; i < 60; i++) {
    if (await options.until.isVisible()) return asked;
    const q = card(page);
    await expect(q.first()).toBeVisible();
    const title = await titleOf(page);
    asked.push(title);
    const named = Object.entries(options.answers ?? {}).find(([part]) => title.includes(part));

    for (const group of await q.getByRole('radiogroup').all()) {
      const no = group.locator('label').filter({ hasText: /^No(,| |$)/ });
      if (!named && (await no.count())) await no.first().click();
      else if (named) await group.locator('label').filter({ hasText: named[1] }).first().click();
      else await group.locator('input[type="radio"]').first().check({ force: true });
    }
    const select = q.locator('select');
    if (await select.count()) {
      await select.first().selectOption({ label: named?.[1] ?? 'Comunidad de Madrid' });
    }
    for (const field of await q.locator('input[type="text"], input[inputmode="decimal"]').all()) {
      await field.fill(named?.[1] ?? (/años|edad/i.test(title) ? '35' : '30000'));
    }

    const next = q.getByRole('button', { name: NEXT });
    if (await next.isEnabled()) await next.click();
    else await q.getByRole('button', { name: NOT_APPLICABLE }).first().click();
    // The next question (or the last step) is on screen before answering again.
    await expect
      .poll(async () => (await options.until.isVisible()) || (await titleOf(page)) !== title, {
        timeout: 10_000,
      })
      .toBe(true);
  }
  throw new Error(`The assistant did not finish after 60 questions: ${asked.join(' | ')}`);
}
