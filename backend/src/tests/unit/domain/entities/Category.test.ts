import { Category } from '@domain/entities/Category';

describe('Category entity', () => {
    describe('create', () => {
        it('should create with required name only', () => {
            const cat = Category.create({ name: 'Food' });
            expect(cat.name).toBe('Food');
            expect(cat.color).toBe('#6366f1');
            expect(cat.icon).toBe('💰');
            expect(cat.id).toBeDefined();
            expect(cat.id.length).toBeGreaterThan(0);
        });

        it('should create with custom color and icon', () => {
            const cat = Category.create({ name: 'Transport', color: '#3b82f6', icon: '🚗' });
            expect(cat.color).toBe('#3b82f6');
            expect(cat.icon).toBe('🚗');
        });

        it('should trim the name', () => {
            const cat = Category.create({ name: '  Salary  ' });
            expect(cat.name).toBe('Salary');
        });

        it('should throw when name is empty', () => {
            expect(() => Category.create({ name: '' })).toThrow('Category name cannot be empty');
        });

        it('should throw when name is only spaces', () => {
            expect(() => Category.create({ name: '   ' })).toThrow('Category name cannot be empty');
        });

        it('should generate unique ids for different instances', () => {
            const a = Category.create({ name: 'A' });
            const b = Category.create({ name: 'B' });
            expect(a.id).not.toBe(b.id);
        });
    });

    describe('reconstitute', () => {
        it('should restore a category with a known id', () => {
            const cat = Category.reconstitute({ id: 'known-id', name: 'Bills', color: '#f00', icon: '🏠' });
            expect(cat.id).toBe('known-id');
            expect(cat.name).toBe('Bills');
        });
    });

    describe('toJSON', () => {
        it('should return all fields', () => {
            const cat = Category.create({ name: 'Health', color: '#22c55e', icon: '💊' });
            const json = cat.toJSON();
            expect(json.name).toBe('Health');
            expect(json.color).toBe('#22c55e');
            expect(json.icon).toBe('💊');
            expect(json.id).toBeDefined();
        });
    });
});
