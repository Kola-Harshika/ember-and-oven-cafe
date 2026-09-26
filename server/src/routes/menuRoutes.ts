/** The public menu: categories, dishes with their customisation groups, and coupons. */
import { Router } from 'express';
import { ApiError } from '../http/errors.ts';
import { findMenuItem, listCategories, listCoupons, listMenuItems } from '../repositories/menuRepository.ts';

export const menuRouter = Router();

menuRouter.get('/', (_req, res) => {
  res.json({
    categories: listCategories(),
    items: listMenuItems(),
    coupons: listCoupons(),
  });
});

menuRouter.get('/items/:itemId', (req, res) => {
  const item = findMenuItem(req.params.itemId);
  if (!item) throw ApiError.notFound('That dish is not on the menu.');
  res.json({ item });
});
