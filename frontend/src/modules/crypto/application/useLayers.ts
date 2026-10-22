import { useState } from 'react';
import { storage } from '@shared/utils/storage';
import { LAYERS, type LayerId } from '../domain/indicators';

const KEY = 'mm_crypto_layers';

/** The chart layers turned on last time on this device (a preference, nothing more). */
export function savedLayers(): LayerId[] {
  try {
    const saved: unknown = JSON.parse(storage.get(KEY) ?? '[]');
    return Array.isArray(saved) ? LAYERS.filter((l) => saved.includes(l)) : [];
  } catch {
    return [];
  }
}

/** Layers that are on, and a switch for each one, remembered on this device. */
export function useLayers(): [LayerId[], (layer: LayerId) => void] {
  const [active, setActive] = useState(savedLayers);
  const toggle = (layer: LayerId) => {
    const next = active.includes(layer) ? active.filter((l) => l !== layer) : [...active, layer];
    setActive(next);
    storage.set(KEY, JSON.stringify(next));
  };
  return [active, toggle];
}
