import { lazy, type ComponentType, type LazyExoticComponent } from 'react';

/** `React.lazy` for a named export: `lazyNamed(() => import('./Page'), 'Page')`. */
export function lazyNamed<K extends string, P extends object>(
  load: () => Promise<Record<K, ComponentType<P>>>,
  name: K
): LazyExoticComponent<ComponentType<P>> {
  return lazy(() => load().then((module) => ({ default: module[name] })));
}
