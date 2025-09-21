import type { FC } from 'react';

import type { Store } from '../types.js';

interface StoreCardProps {
  store: Store;
}

export const StoreCard: FC<StoreCardProps> = ({ store }) => {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-brand-accent focus-within:ring-2 focus-within:ring-brand-accent">
      <header className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-semibold text-slate-900">{store.name}</h2>
          {store.rating ? (
            <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
              <span aria-hidden>★</span>
              <span>
                {store.rating.toFixed(1)}
                {store.userRatingsTotal ? ` (${store.userRatingsTotal})` : ''}
              </span>
            </span>
          ) : null}
        </div>
        <p className="text-sm text-slate-600">{store.formattedAddress}</p>
      </header>

      <div className="mt-3 flex flex-wrap gap-2">
        {store.categories.map((category) => (
          <span
            key={category}
            className="rounded-full bg-brand-primary/10 px-2 py-0.5 text-xs font-medium uppercase text-brand-primary"
          >
            {category.replace(/_/g, ' ')}
          </span>
        ))}
      </div>

      <dl className="mt-4 space-y-2 text-sm text-slate-700">
        {store.openingHours?.currentOpeningHours?.length ? (
          <div>
            <dt className="font-medium text-slate-500">Currently</dt>
            <dd>{store.openingHours.currentOpeningHours[0]}</dd>
          </div>
        ) : null}
        {store.phoneNumber ? (
          <div>
            <dt className="font-medium text-slate-500">Phone</dt>
            <dd>
              <a href={`tel:${store.phoneNumber}`} className="text-brand-primary underline">
                {store.phoneNumber}
              </a>
            </dd>
          </div>
        ) : null}
        {store.website ? (
          <div>
            <dt className="font-medium text-slate-500">Website</dt>
            <dd>
              <a href={store.website} target="_blank" rel="noopener noreferrer" className="text-brand-primary underline">
                {store.website}
              </a>
            </dd>
          </div>
        ) : null}
      </dl>

      <footer className="mt-4 flex flex-wrap items-center gap-3 text-sm text-slate-600">
        <a
          href={store.googleMapsUri}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-full bg-brand-accent px-3 py-1 text-sm font-semibold text-white shadow focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
        >
          Open in Maps
        </a>
        {store.delivery ? <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">Delivery available</span> : null}
        {store.takeout ? <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-700">Pickup ready</span> : null}
        {store.wheelchairAccessibleEntrance ? (
          <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700">Accessible entrance</span>
        ) : null}
      </footer>
    </article>
  );
};
