import { getPaper, getShape, getTemplate } from './catalog';
import { computeLayout } from './layout';
import type { EventSetup, PublicEvent } from './server/events';

/** An event whose setup has been chosen. */
export type ConfiguredEvent = Omit<PublicEvent, 'setup'> & { setup: EventSetup };

export const isConfigured = (e: PublicEvent): e is ConfiguredEvent => e.setup !== null;

/** Looks up everything a setup refers to and works out its sheet layout. Sheets are always portrait. */
export function resolveSetup(s: EventSetup) {
  const paper = getPaper(s.paperId)!;
  const template = getTemplate(s.templateId)!;
  const shape = getShape(s.shapeId)!;
  return { paper, template, shape, layout: computeLayout(paper, 'portrait', template) };
}
