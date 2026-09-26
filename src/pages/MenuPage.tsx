import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CATEGORIES, searchItems } from '@/data/menu';
import type { CategoryId, MenuItem } from '@/data/types';
import { Chip } from '@/components/ui/Chip';
import { Button } from '@/components/ui/Button';
import { ItemCard } from '@/components/menu/ItemCard';

type SortId = 'popular' | 'quick' | 'price-asc' | 'price-desc';

const SORTS: { id: SortId; label: string }[] = [
  { id: 'popular', label: 'Most ordered' },
  { id: 'quick', label: 'Fastest to the table' },
  { id: 'price-asc', label: 'Price, low to high' },
  { id: 'price-desc', label: 'Price, high to low' },
];

const FILTERS: { id: CategoryId | 'all'; label: string }[] = [
  { id: 'all', label: 'Everything' },
  ...CATEGORIES.map((category) => ({ id: category.id, label: category.shortName })),
];

function sortItems(items: MenuItem[], sort: SortId): MenuItem[] {
  const copy = [...items];
  switch (sort) {
    case 'quick':
      return copy.sort((a, b) => a.prepMinutes - b.prepMinutes);
    case 'price-asc':
      return copy.sort((a, b) => a.price - b.price);
    case 'price-desc':
      return copy.sort((a, b) => b.price - a.price);
    default:
      return copy.sort((a, b) => b.orderedTimes - a.orderedTimes);
  }
}

export function MenuPage() {
  const [params, setParams] = useSearchParams();
  const [sort, setSort] = useState<SortId>('popular');

  const rawCategory = params.get('category');
  const category: CategoryId | 'all' =
    rawCategory && CATEGORIES.some((entry) => entry.id === rawCategory) ? (rawCategory as CategoryId) : 'all';
  const query = params.get('q') ?? '';

  const results = useMemo(() => sortItems(searchItems(query, category), sort), [query, category, sort]);

  const activeCategory = CATEGORIES.find((entry) => entry.id === category);

  const update = (patch: { category?: CategoryId | 'all'; q?: string }) => {
    const next = new URLSearchParams(params);
    if (patch.category !== undefined) {
      if (patch.category === 'all') next.delete('category');
      else next.set('category', patch.category);
    }
    if (patch.q !== undefined) {
      if (patch.q) next.set('q', patch.q);
      else next.delete('q');
    }
    setParams(next, { replace: true });
  };

  return (
    <div className="shell page">
      <motion.header
        className="page-head"
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
      >
        <span className="eyebrow">The full menu</span>
        <h1>{activeCategory ? activeCategory.name : 'Everything we cook'}</h1>
        <p className="lede">
          {activeCategory
            ? activeCategory.blurb
            : 'Twelve dishes, three counters and a preview that redraws itself as you choose. Every price below is the starting point — the customiser shows the rest.'}
        </p>
      </motion.header>

      <div className="menu-toolbar">
        <div className="chip-cloud" role="group" aria-label="Filter by counter">
          {FILTERS.map((filter) => (
            <Chip key={filter.id} active={category === filter.id} onClick={() => update({ category: filter.id })}>
              {filter.label}
            </Chip>
          ))}
        </div>

        <div className="menu-toolbar__right">
          <label className="search-field">
            <span className="sr-only">Search the menu</span>
            <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M11 4a7 7 0 1 0 4.2 12.6L20 21m-9-3a7 7 0 0 1 0-14Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
              />
            </svg>
            <input
              className="input"
              type="search"
              value={query}
              placeholder="Search pizza, dips, blend-ins…"
              onChange={(event) => update({ q: event.target.value })}
            />
          </label>
          <label className="sort-field">
            <span className="sr-only">Sort order</span>
            <select className="select" value={sort} onChange={(event) => setSort(event.target.value as SortId)}>
              {SORTS.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <p className="menu-count">
        {results.length === 0
          ? 'Nothing matches that yet.'
          : `${results.length} ${results.length === 1 ? 'dish' : 'dishes'} on the pass`}
        {query && ` for “${query}”`}
      </p>

      {results.length === 0 ? (
        <div className="empty-state">
          <h3>No dish by that name</h3>
          <p className="muted">
            Try “pepperoni”, “truffle”, “peri peri” or clear the filters to see the whole pass again.
          </p>
          <Button
            variant="primary"
            onClick={() => {
              update({ category: 'all', q: '' });
            }}
          >
            Reset the menu
          </Button>
        </div>
      ) : (
        <div className="item-grid">
          {results.map((item, index) => (
            <ItemCard key={item.id} item={item} index={index} />
          ))}
        </div>
      )}
    </div>
  );
}
