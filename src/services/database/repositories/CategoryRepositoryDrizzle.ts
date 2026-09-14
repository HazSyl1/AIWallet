import { v4 as uuid } from 'uuid';
import { db, categories, transactions, eq, and, sql } from '../drizzle';
import type { Category, NewCategory } from '../schema';

export interface CreateCategoryInput {
  name: string;
  type: Category['type'];
  parentId?: string;
  icon?: string;
  color?: string;
}

export interface CategoryWithChildren extends Category {
  children: CategoryWithChildren[];
}

class CategoryRepositoryDrizzle {
  async create(input: CreateCategoryInput): Promise<Category> {
    const now = new Date().toISOString();
    const id = uuid();

    const last = await db
      .select({ sortOrder: categories.sortOrder })
      .from(categories)
      .where(eq(categories.type, input.type))
      .orderBy(sql`${categories.sortOrder} DESC`)
      .limit(1);
    const sortOrder = (last[0]?.sortOrder ?? -1) + 1;

    const newCategory: NewCategory = {
      id,
      name: input.name,
      type: input.type,
      parentId: input.parentId ?? null,
      icon: input.icon ?? null,
      color: input.color ?? null,
      isSystem: false,
      isActive: true,
      sortOrder,
      createdAt: now,
      updatedAt: now,
    };

    await db.insert(categories).values(newCategory);
    return this.getById(id) as Promise<Category>;
  }

  async getById(id: string): Promise<Category | null> {
    const result = await db.select().from(categories).where(eq(categories.id, id)).limit(1);
    return result[0] ?? null;
  }

  async getByType(type: Category['type']): Promise<Category[]> {
    return db
      .select()
      .from(categories)
      .where(and(eq(categories.type, type), eq(categories.isActive, true)))
      .orderBy(categories.sortOrder);
  }

  async getAll(includeInactive = false): Promise<Category[]> {
    if (includeInactive) {
      return db.select().from(categories).orderBy(categories.type, categories.sortOrder);
    }
    return db
      .select()
      .from(categories)
      .where(eq(categories.isActive, true))
      .orderBy(categories.type, categories.sortOrder);
  }

  async getTree(type?: Category['type']): Promise<CategoryWithChildren[]> {
    const all = type ? await this.getByType(type) : await this.getAll();
    return this.buildTree(all);
  }

  async getChildren(parentId: string): Promise<Category[]> {
    return db
      .select()
      .from(categories)
      .where(and(eq(categories.parentId, parentId), eq(categories.isActive, true)))
      .orderBy(categories.sortOrder);
  }

  async update(
    id: string,
    updates: Partial<Pick<Category, 'name' | 'icon' | 'color' | 'parentId' | 'sortOrder'>>
  ): Promise<Category | null> {
    const existing = await this.getById(id);
    if (!existing) return null;

    if (existing.isSystem && (updates.name !== undefined || updates.parentId !== undefined)) {
      throw new Error('Cannot modify system category name or parent');
    }

    await db
      .update(categories)
      .set({ ...updates, updatedAt: new Date().toISOString() })
      .where(eq(categories.id, id));

    return this.getById(id);
  }

  async archive(id: string): Promise<boolean> {
    const existing = await this.getById(id);
    if (!existing) return false;

    if (existing.isSystem) throw new Error('Cannot archive system category');

    const result = await db
      .update(categories)
      .set({ isActive: false, updatedAt: new Date().toISOString() })
      .where(eq(categories.id, id));
    return (result.changes ?? 0) > 0;
  }

  async delete(id: string): Promise<boolean> {
    const existing = await this.getById(id);
    if (!existing) return false;

    if (existing.isSystem) throw new Error('Cannot delete system category');

    const txCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(transactions)
      .where(eq(transactions.categoryId, id));

    if ((txCount[0]?.count ?? 0) > 0) {
      throw new Error('Cannot delete category with transactions. Archive it instead.');
    }

    const children = await this.getChildren(id);
    if (children.length > 0) throw new Error('Cannot delete category with subcategories');

    const result = await db.delete(categories).where(eq(categories.id, id));
    return (result.changes ?? 0) > 0;
  }

  async findByName(name: string, type?: Category['type']): Promise<Category | null> {
    const conditions = [
      sql`LOWER(${categories.name}) = LOWER(${name})`,
      eq(categories.isActive, true),
    ];
    if (type) conditions.push(eq(categories.type, type));

    const result = await db
      .select()
      .from(categories)
      .where(and(...conditions))
      .limit(1);
    return result[0] ?? null;
  }

  async getAllowList(): Promise<string[]> {
    const result = await db
      .select({ id: categories.id })
      .from(categories)
      .where(eq(categories.isActive, true));
    return result.map((c) => c.id);
  }

  private buildTree(cats: Category[]): CategoryWithChildren[] {
    const map = new Map<string, CategoryWithChildren>();
    const roots: CategoryWithChildren[] = [];

    for (const cat of cats) {
      map.set(cat.id, { ...cat, children: [] });
    }

    for (const cat of cats) {
      const node = map.get(cat.id)!;
      if (cat.parentId && map.has(cat.parentId)) {
        map.get(cat.parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    }

    return roots;
  }
}

export const categoryRepository = new CategoryRepositoryDrizzle();
