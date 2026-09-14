// Categories Redux Slice

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { Category, CategoryWithChildren, CreateCategoryInput, CategoryType } from '../../shared/types';
import { categoryRepository } from '../../services/database';
import { enqueueSync } from '../../services/supabase/sync';

interface CategoriesState {
  items: Category[];
  expenseTree: CategoryWithChildren[];
  incomeTree: CategoryWithChildren[];
  loading: boolean;
  error: string | null;
  selectedId: string | null;
}

const initialState: CategoriesState = {
  items: [],
  expenseTree: [],
  incomeTree: [],
  loading: false,
  error: null,
  selectedId: null,
};

export const fetchCategories = createAsyncThunk('categories/fetchAll', async () => {
  const [items, expenseTree, incomeTree] = await Promise.all([
    categoryRepository.getAll(),
    categoryRepository.getTree('expense'),
    categoryRepository.getTree('income'),
  ]);
  return { items, expenseTree, incomeTree };
});

export const fetchCategoriesByType = createAsyncThunk(
  'categories/fetchByType',
  async (type: CategoryType) => {
    return categoryRepository.getByType(type);
  }
);

const getUserId = (getState: () => unknown) =>
  (getState() as { auth: { user: { id: string } | null } }).auth?.user?.id ?? null;

export const createCategory = createAsyncThunk(
  'categories/create',
  async (input: CreateCategoryInput, { getState }) => {
    const category = await categoryRepository.create(input);
    const userId = getUserId(getState);
    if (userId) await enqueueSync('category', category.id, 'create', { ...category as unknown as Record<string, unknown>, userId });
    return category;
  }
);

export const updateCategory = createAsyncThunk(
  'categories/update',
  async ({
    id,
    updates,
  }: {
    id: string;
    updates: Partial<Pick<Category, 'name' | 'icon' | 'color' | 'parentId' | 'sortOrder'>>;
  }, { getState }) => {
    const result = await categoryRepository.update(id, updates);
    if (!result) throw new Error('Category not found');
    const userId = getUserId(getState);
    if (userId) await enqueueSync('category', result.id, 'update', { ...result as unknown as Record<string, unknown>, userId });
    return result;
  }
);

export const archiveCategory = createAsyncThunk(
  'categories/archive',
  async (id: string, { getState }) => {
    const success = await categoryRepository.archive(id);
    if (!success) throw new Error('Failed to archive category');
    const userId = getUserId(getState);
    const updated = await categoryRepository.getById(id);
    if (userId && updated) await enqueueSync('category', id, 'update', { ...updated as unknown as Record<string, unknown>, userId });
    return id;
  }
);

export const deleteCategory = createAsyncThunk(
  'categories/delete',
  async (id: string, { getState }) => {
    const success = await categoryRepository.delete(id);
    if (!success) throw new Error('Failed to delete category');
    const userId = getUserId(getState);
    if (userId) await enqueueSync('category', id, 'delete', { id });
    return id;
  }
);

const categoriesSlice = createSlice({
  name: 'categories',
  initialState,
  reducers: {
    selectCategory(state, action: PayloadAction<string | null>) {
      state.selectedId = action.payload;
    },
    clearError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCategories.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCategories.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.items;
        state.expenseTree = action.payload.expenseTree;
        state.incomeTree = action.payload.incomeTree;
      })
      .addCase(fetchCategories.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? 'Failed to fetch categories';
      })
      .addCase(fetchCategoriesByType.fulfilled, (state, action) => {
        for (const cat of action.payload) {
          const index = state.items.findIndex((c) => c.id === cat.id);
          if (index !== -1) state.items[index] = cat;
          else state.items.push(cat);
        }
      })
      .addCase(createCategory.fulfilled, (state, action) => {
        state.items.push(action.payload);
      })
      .addCase(createCategory.rejected, (state, action) => {
        state.error = action.error.message ?? 'Failed to create category';
      })
      .addCase(updateCategory.fulfilled, (state, action) => {
        const index = state.items.findIndex((c) => c.id === action.payload.id);
        if (index !== -1) state.items[index] = action.payload;
      })
      .addCase(archiveCategory.fulfilled, (state, action) => {
        state.items = state.items.filter((c) => c.id !== action.payload);
        if (state.selectedId === action.payload) state.selectedId = null;
      })
      .addCase(deleteCategory.fulfilled, (state, action) => {
        state.items = state.items.filter((c) => c.id !== action.payload);
        if (state.selectedId === action.payload) state.selectedId = null;
      })
      .addCase(deleteCategory.rejected, (state, action) => {
        state.error = action.error.message ?? 'Failed to delete category';
      });
  },
});

export const { selectCategory, clearError } = categoriesSlice.actions;

export const selectExpenseCategories = (state: { categories: CategoriesState }) =>
  state.categories.items.filter((c) => c.type === 'expense');

export const selectIncomeCategories = (state: { categories: CategoriesState }) =>
  state.categories.items.filter((c) => c.type === 'income');

export default categoriesSlice.reducer;
