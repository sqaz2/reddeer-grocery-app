import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import axios from 'axios';
import clsx from 'clsx';
import { useEffect, useMemo, useState } from 'react';
import React from 'react';
import ReactDOM from 'react-dom/client';

import './index.css';
import { StoreCard } from './components/StoreCard.js';
import type { Store, StoreResponse } from './types.js';

const queryClient = new QueryClient();

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000',
  timeout: 15000,
});

const fetchStores = async (params: { q?: string }) => {
  const response = await api.get<StoreResponse>('/stores', { params });
  return response.data;
};

const formatUpdatedAt = (value?: string) => {
  if (!value) {
    return null;
  }

  try {
    const formatter = new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
    return formatter.format(new Date(value));
  } catch (error) {
    console.warn('Failed to format date', error);
    return null;
  }
};

const useKeyboardAwareClass = () => {
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  useEffect(() => {
    const handleFocusIn = (event: FocusEvent) => {
      const target = event.target as HTMLElement | null;
      const isInput = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement;
      if (isInput) {
        setKeyboardOpen(true);
      } else {
        const active = document.activeElement;
        const stillInput =
          active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement;
        if (!stillInput) {
          setKeyboardOpen(false);
        }
      }
    };

    const handleFocusOut = () => {
      const active = document.activeElement;
      if (!(active instanceof HTMLInputElement) && !(active instanceof HTMLTextAreaElement)) {
        setKeyboardOpen(false);
      }
    };

    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('focusout', handleFocusOut);

    return () => {
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('focusout', handleFocusOut);
    };
  }, []);

  return keyboardOpen;
};

const App = () => {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const keyboardOpen = useKeyboardAwareClass();

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 250);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [search]);

  const { data, isLoading, isError, error } = useQuery<StoreResponse, Error>({
    queryKey: ['stores', debouncedSearch],
    queryFn: () => fetchStores({ q: debouncedSearch || undefined }),
    placeholderData: (previousData) => previousData,
  });

  const stores: Store[] = data?.stores ?? [];
  const updatedAt = useMemo(() => formatUpdatedAt(data?.generatedAt), [data?.generatedAt]);

  return (
    <div
      className={clsx(
        'keyboard-aware-root bg-slate-50 text-slate-900',
        keyboardOpen && 'keyboard-open',
      )}
    >
      <header className="sticky top-0 z-10 bg-white/95 shadow-sm backdrop-blur">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-3 px-4 py-4">
          <div>
            <h1 className="text-xl font-semibold text-brand-primary">Red Deer Grocery Stores</h1>
            <p className="text-sm text-slate-600">
              Real-time directory sourced from Google Places. Search to find nearby retailers and tap
              through for live navigation.
            </p>
          </div>
          <label className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 shadow-inner focus-within:border-brand-primary focus-within:ring-2 focus-within:ring-brand-primary/40">
            <span className="text-slate-400" aria-hidden>
              🔍
            </span>
            <input
              type="search"
              value={search}
              inputMode="search"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search stores, addresses, or categories"
              className="w-full bg-transparent text-base text-slate-900 placeholder:text-slate-400 focus:outline-none"
              aria-label="Search stores"
              autoCorrect="off"
            />
          </label>
          {updatedAt ? (
            <p className="text-xs text-slate-500">Store catalogue last updated {updatedAt}.</p>
          ) : null}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-6">
          {isLoading ? <p className="text-sm text-slate-500">Loading stores…</p> : null}
          {isError ? (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
              Unable to load store information. {error instanceof Error ? error.message : ''}
            </p>
          ) : null}
          {!isLoading && stores.length === 0 ? (
            <p className="text-sm text-slate-500">No stores found for your search.</p>
          ) : null}
          <div className="flex flex-col gap-4 pb-6">
            {stores.map((store: Store) => (
              <StoreCard key={store.placeId} store={store} />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>,
);
