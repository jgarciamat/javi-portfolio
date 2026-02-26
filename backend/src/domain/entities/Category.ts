export interface CategoryProps {
    id: string;
    name: string;
    color: string;
    icon: string;
}

export class Category {
    private readonly _id: string;
    private _name: string;
    private _color: string;
    private _icon: string;

    private constructor(props: CategoryProps) {
        this._id = props.id;
        this._name = props.name;
        this._color = props.color;
        this._icon = props.icon;
    }

    static create(props: { name: string; color?: string; icon?: string }): Category {
        if (!props.name || props.name.trim() === '') {
            throw new Error('Category name cannot be empty');
        }
        const { v4: uuidv4 } = require('uuid');
        return new Category({
            id: uuidv4(),
            name: props.name.trim(),
            color: props.color ?? '#6366f1',
            icon: props.icon ?? '💰',
        });
    }

    static reconstitute(props: CategoryProps): Category {
        return new Category(props);
    }

    get id(): string {
        return this._id;
    }

    get name(): string {
        return this._name;
    }

    get color(): string {
        return this._color;
    }

    get icon(): string {
        return this._icon;
    }

    toJSON() {
        return {
            id: this._id,
            name: this._name,
            color: this._color,
            icon: this._icon,
        };
    }
}
