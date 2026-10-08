import { randomUUID } from 'crypto';
import { ValidationError } from '@domain/errors';
import { isHexColor } from '@domain/shared/text';

export const CATEGORY_NAME_MAX = 50;
export const DEFAULT_CATEGORY_COLOR = '#6366f1';
export const DEFAULT_CATEGORY_ICON = '💰';
/** Category that receives movements when no better one is known. */
export const FALLBACK_CATEGORY_NAME = 'Otros';

export interface CategoryProps {
  id: string;
  userId: string;
  name: string;
  color: string;
  icon: string;
}

function cleanName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) throw new ValidationError('El nombre de la categoría no puede estar vacío');
  if (trimmed.length > CATEGORY_NAME_MAX) {
    throw new ValidationError(`El nombre no puede superar ${CATEGORY_NAME_MAX} caracteres`);
  }
  return trimmed;
}

function cleanColor(color: string | undefined, fallback: string): string {
  const value = (color ?? '').trim() || fallback;
  if (!isHexColor(value)) throw new ValidationError('Color inválido (formato #rrggbb)');
  return value;
}

function cleanIcon(icon: string | undefined, fallback: string): string {
  const value = (icon ?? '').trim() || fallback;
  if ([...value].length > 8) throw new ValidationError('Icono demasiado largo');
  return value;
}

export class Category {
  private constructor(private readonly props: CategoryProps) {}

  static create(input: { userId: string; name: string; color?: string; icon?: string }): Category {
    return new Category({
      id: randomUUID(),
      userId: input.userId,
      name: cleanName(input.name),
      color: cleanColor(input.color, DEFAULT_CATEGORY_COLOR),
      icon: cleanIcon(input.icon, DEFAULT_CATEGORY_ICON),
    });
  }

  static reconstitute(props: CategoryProps): Category {
    return new Category({ ...props });
  }

  update(changes: { name?: string; color?: string; icon?: string }): Category {
    return new Category({
      ...this.props,
      name: changes.name !== undefined ? cleanName(changes.name) : this.props.name,
      color:
        changes.color !== undefined
          ? cleanColor(changes.color, this.props.color)
          : this.props.color,
      icon: changes.icon !== undefined ? cleanIcon(changes.icon, this.props.icon) : this.props.icon,
    });
  }

  get id(): string {
    return this.props.id;
  }
  get name(): string {
    return this.props.name;
  }

  toPrimitives(): CategoryProps {
    return { ...this.props };
  }
}

/** Categories every new user starts with (names are the canonical Spanish keys the UI translates). */
export const DEFAULT_CATEGORIES: ReadonlyArray<{ name: string; color: string; icon: string }> = [
  { name: 'Agua', color: '#38bdf8', icon: '💧' },
  { name: 'Ahorro', color: '#a78bfa', icon: '🐷' },
  { name: 'Alimentación', color: '#f97316', icon: '🍔' },
  { name: 'Educación', color: '#84cc16', icon: '📚' },
  { name: 'Freelance', color: '#6366f1', icon: '🖥️' },
  { name: 'Gas', color: '#fb923c', icon: '🔥' },
  { name: 'Gastos', color: '#f43f5e', icon: '💸' },
  { name: 'Inversiones', color: '#eab308', icon: '📈' },
  { name: 'Luz', color: '#facc15', icon: '💡' },
  { name: 'Niño', color: '#a78bfa', icon: '🧒' },
  { name: 'Ocio', color: '#ec4899', icon: '🎉' },
  { name: 'Otros', color: '#94a3b8', icon: '📦' },
  { name: 'Ropa', color: '#f59e0b', icon: '👕' },
  { name: 'Salario', color: '#10b981', icon: '💼' },
  { name: 'Salud', color: '#22c55e', icon: '💊' },
  { name: 'Tecnología', color: '#06b6d4', icon: '💻' },
  { name: 'Transporte', color: '#3b82f6', icon: '🚗' },
  { name: 'Vivienda', color: '#8b5cf6', icon: '🏠' },
];
