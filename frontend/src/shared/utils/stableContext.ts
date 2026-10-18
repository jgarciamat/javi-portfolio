import { createContext, type Context } from 'react';

const contexts = new Map<string, Context<unknown>>();

/**
 * `createContext` that gives back the same context each time the calling module runs.
 *
 * In development, hot reload runs a provider's module again when Fast Refresh cannot patch it
 * in place (it also exports hooks or helpers). A new `createContext` then leaves the provider
 * that is already mounted and the components loaded afterwards (the lazy sections, like «Tu
 * plan») on two different contexts, and the hook throws "must be used inside …Provider". This
 * module only imports React, so hot reload never runs it again and the context stays the same.
 * In production every module runs once: nothing changes. Each name must be unique.
 */
export function stableContext<T>(name: string, initial: T): Context<T> {
  let context = contexts.get(name);
  if (!context) {
    context = createContext<unknown>(initial);
    context.displayName = name;
    contexts.set(name, context);
  }
  return context as Context<T>;
}
