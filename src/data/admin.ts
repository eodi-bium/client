import { RECYCLING_CATEGORIES } from '../constants/categories';

export const adminItemOptions = RECYCLING_CATEGORIES.map((item) => ({
  value: item.code,
  label: item.label,
}));
