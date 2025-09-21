import { Router } from 'express';
import { z } from 'zod';

import { storeRepository } from '../lib/storeRepository.js';

const querySchema = z.object({
  q: z.string().trim().optional(),
  type: z
    .string()
    .trim()
    .optional()
    .transform((value) => value?.toLowerCase()),
});

export const storesRouter = Router();

storesRouter.get('/', async (req, res, next) => {
  try {
    const { q, type } = querySchema.parse(req.query);
    const stores = await storeRepository.getAll();

    const filtered = stores.filter((store) => {
      const matchesQuery = q
        ? [store.name, store.formattedAddress, ...store.categories]
            .join(' ')
            .toLowerCase()
            .includes(q.toLowerCase())
        : true;

      const matchesType = type
        ? store.categories.some((category) => category.toLowerCase() === type)
        : true;

      return matchesQuery && matchesType;
    });

    res.json({ stores: filtered, total: filtered.length, generatedAt: new Date().toISOString() });
  } catch (error) {
    next(error);
  }
});

storesRouter.get('/:placeId', async (req, res, next) => {
  try {
    const store = await storeRepository.getByPlaceId(req.params.placeId);
    if (!store) {
      res.status(404).json({ error: 'store_not_found' });
      return;
    }

    res.json(store);
  } catch (error) {
    next(error);
  }
});
