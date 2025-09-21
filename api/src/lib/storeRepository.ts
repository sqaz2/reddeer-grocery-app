import { promises as fs } from 'node:fs';
import path from 'node:path';

import { Store, StoreDataset } from './types.js';

const DATA_FILE = process.env.STORE_DATA_FILE || path.resolve(process.cwd(), '../data/stores.json');

export class StoreRepository {
  private cache: StoreDataset | null = null;

  async load(): Promise<StoreDataset> {
    if (this.cache) {
      return this.cache;
    }

    try {
      const file = await fs.readFile(DATA_FILE, 'utf8');
      const parsed = JSON.parse(file) as StoreDataset;
      this.cache = parsed;
      return parsed;
    } catch (error: unknown) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        const empty: StoreDataset = {
          stores: [],
          metadata: {
            generatedAt: new Date(0).toISOString(),
            sourceQueries: [],
          },
        };
        this.cache = empty;
        return empty;
      }

      throw error;
    }
  }

  async getAll(): Promise<Store[]> {
    const dataset = await this.load();
    return dataset.stores;
  }

  async getByPlaceId(placeId: string): Promise<Store | null> {
    const dataset = await this.load();
    return dataset.stores.find((store) => store.placeId === placeId) ?? null;
  }
}

export const storeRepository = new StoreRepository();
