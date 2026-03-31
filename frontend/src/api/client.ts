const API_BASE = import.meta.env.VITE_API_URL || '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

export interface Wine {
  id: number;
  name: string;
  color: 'red' | 'white' | 'rose' | 'sparkling';
  region?: string;
  appellation?: string;
  grapeVarietyOrBlend?: string;
  createdAt: string;
  vintages?: Vintage[];
  averageRating?: number;
  tastingCount?: number;
}

export type WineSource = 'weimax' | 'costco' | 'other';

export interface Vintage {
  id: number;
  wineId: number;
  vintageYear: number;
  sellerNotes?: string | null;
  source?: WineSource;
  sourceCustom?: string;
  notAvailable?: boolean;
  createdAt: string;
  wine?: Wine;
  tastingEvents?: TastingEvent[];
  purchaseItems?: PurchaseItem[];
  averageRating?: number;
  tastingCount?: number;
}

export interface TastingEvent {
  id: number;
  vintageId: number;
  tastingDate?: string | null;
  rating: number;
  notes?: string;
  vintage?: Vintage;
}

export interface PurchaseBatch {
  id: number;
  purchaseDate: string;
  theme?: string;
  createdAt: string;
  items?: PurchaseItem[];
}

export interface PurchaseItem {
  id: number;
  purchaseBatchId: number;
  wineId: number;
  vintageId: number;
  pricePaid?: number;
  quantityPurchased: number;
  wine?: Wine;
  vintage?: Vintage;
  purchaseBatch?: PurchaseBatch;
}

export interface PotentialMatch {
  existingId: number;
  existingName: string;
  importedName: string;
  similarity: number;
  matchType: 'exact_normalized' | 'high_similarity' | 'contains';
}

export interface ImportPreview {
  batches: any[];
  ambiguities: {
    type: string;
    message: string;
    context: string;
    suggestion?: string;
  }[];
  potentialMatches?: {
    batchIndex: number;
    itemIndex: number;
    importedName: string;
    matches: PotentialMatch[];
  }[];
  existingMatches?: {
    name: string;
    vintageYear: number;
    message: string;
  }[];
  summary: {
    batchCount: number;
    itemCount: number;
    tastingCount: number;
    ambiguityCount: number;
    existingCount?: number;
    newCount?: number;
    potentialMatchCount?: number;
  };
}

export interface ImportResult {
  success: boolean;
  results: {
    winesCreated: number;
    winesMatched: number;
    vintagesCreated: number;
    vintagesMatched: number;
    purchaseBatchesCreated: number;
    purchaseItemsCreated: number;
    tastingsCreated: number;
  };
  importedWineIds?: number[];
  ambiguities: any[];
}

function buildQuery(params?: Record<string, string | number | undefined>): string {
  if (!params) return '';
  const filtered = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => [k, String(v)]);
  if (filtered.length === 0) return '';
  return '?' + new URLSearchParams(filtered).toString();
}

export const api = {
  // Wines
  getWines: (params?: { color?: string; search?: string; availableOnly?: string }) => {
    return request<Wine[]>(`/wines${buildQuery(params)}`);
  },
  getWine: (id: number) => request<Wine>(`/wines/${id}`),
  updateWine: (id: number, data: Partial<Wine>) =>
    request<Wine>(`/wines/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteWine: (id: number) =>
    request<{ success: boolean }>(`/wines/${id}`, { method: 'DELETE' }),
  previewMerge: (wine1Id: number, wine2Id: number) =>
    request<{
      wine1: { id: number; name: string };
      wine2: { id: number; name: string };
      wineConflicts: Array<{
        field: string;
        wine1Value: string | null;
        wine2Value: string | null;
      }>;
      vintageConflicts: Array<{
        vintageYear: number;
        wine1VintageId: number;
        wine2VintageId: number;
        conflicts: Array<{
          field: string;
          wine1Value: string | null;
          wine2Value: string | null;
        }>;
        wine1Tastings: number;
        wine2Tastings: number;
        wine1Purchases: number;
        wine2Purchases: number;
      }>;
      wine1UniqueVintages: Array<{ year: number; tastings: number; purchases: number }>;
      wine2UniqueVintages: Array<{ year: number; tastings: number; purchases: number }>;
      hasConflicts: boolean;
    }>(`/wines/${wine1Id}/merge/${wine2Id}/preview`),
  mergeWines: (wine1Id: number, wine2Id: number, resolutions?: {
    wineFields?: Record<string, 'wine1' | 'wine2'>;
    vintages?: Record<string, Record<string, 'wine1' | 'wine2'>>;
  }) =>
    request<{
      success: boolean;
      keptWine: string;
      deletedWine: string;
      results: {
        vintagesMoved: number;
        vintagesMerged: number;
        tastingsMoved: number;
        purchaseItemsMoved: number;
      };
    }>(`/wines/${wine1Id}/merge/${wine2Id}`, {
      method: 'POST',
      body: JSON.stringify({ resolutions })
    }),
  getFavorites: (params?: { minRating?: number; color?: string; availableOnly?: string }) => {
    return request<Wine[]>(`/wines/favorites/list${buildQuery(params)}`);
  },

  // Vintages
  getVintage: (id: number) => request<Vintage>(`/vintages/${id}`),
  createVintage: (data: { wineId: number; vintageYear: number; sellerNotes?: string; source?: WineSource; sourceCustom?: string }) =>
    request<Vintage>('/vintages', { method: 'POST', body: JSON.stringify(data) }),
  updateVintage: (id: number, data: Partial<Vintage>) =>
    request<Vintage>(`/vintages/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteVintage: (wineId: number, vintageId: number) =>
    request<{ success: boolean }>(`/wines/${wineId}/vintages/${vintageId}`, { method: 'DELETE' }),
  getVintageFavorites: (params?: { minRating?: number; availableOnly?: string }) => {
    return request<Vintage[]>(`/vintages/favorites/list${buildQuery(params)}`);
  },

  // Tastings
  getTastings: (params?: { startDate?: string; endDate?: string; minRating?: number; limit?: number }) => {
    return request<TastingEvent[]>(`/tastings${buildQuery(params)}`);
  },
  getRecentTastings: (limit: number = 5) => {
    return request<TastingEvent[]>(`/tastings?limit=${limit}`);
  },
  createTasting: (data: { vintageId: number; tastingDate?: string; rating: number; notes?: string }) =>
    request<TastingEvent>('/tastings', { method: 'POST', body: JSON.stringify(data) }),
  updateTasting: (id: number, data: Partial<TastingEvent>) =>
    request<TastingEvent>(`/tastings/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteTasting: (id: number) =>
    request<void>(`/tastings/${id}`, { method: 'DELETE' }),

  // Purchases
  getPurchases: () => request<PurchaseBatch[]>('/purchases'),
  getPurchase: (id: number) => request<PurchaseBatch>(`/purchases/${id}`),
  updatePurchaseItem: (id: number, data: { pricePaid?: number; quantityPurchased?: number }) =>
    request<PurchaseItem>(`/purchases/items/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deletePurchaseItem: (id: number) =>
    request<void>(`/purchases/items/${id}`, { method: 'DELETE' }),
  createPurchaseItem: (data: { vintageId: number; wineId: number; pricePaid?: number; quantityPurchased?: number; purchaseDate?: string }) =>
    request<PurchaseItem>('/purchases/items', { method: 'POST', body: JSON.stringify(data) }),
  updatePurchaseBatch: (id: number, data: { purchaseDate?: string; theme?: string }) =>
    request<PurchaseBatch>(`/purchases/batches/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // Import
  previewImport: (text: string, mode?: 'standard' | 'receipt' | 'label') =>
    request<ImportPreview>('/import/preview', { method: 'POST', body: JSON.stringify({ text, mode }) }),
  executeImport: (text: string, mode?: 'standard' | 'receipt' | 'label', matchDecisions?: Record<string, number | null>, editedBatches?: any[]) =>
    request<ImportResult>('/import/execute', { method: 'POST', body: JSON.stringify({ text: editedBatches ? undefined : text, mode, matchDecisions, editedBatches }) }),

  scanLabel: (image: string, mediaType: string) =>
    request<ImportPreview>('/import/scan-label', { method: 'POST', body: JSON.stringify({ image, mediaType }) }),

  saveCorrections: (corrections: { fieldName: string; wrongValue: string; correctValue: string; originalText?: string }[], mode: string) =>
    request<{ success: boolean }>('/import/corrections', { method: 'POST', body: JSON.stringify({ corrections, mode }) }),

  // Remi
  remiEnrich: (data: { wineId: number; vintageYear: number; wineName: string; color: string; region?: string; appellation?: string; grape?: string }) =>
    request<{ profile: string }>('/remi/enrich', { method: 'POST', body: JSON.stringify(data) }),
  remiEnrichAll: () =>
    request<{ enriched: number; skipped: number }>('/remi/enrich-all', { method: 'POST' }),
  remiGetEnrichment: (wineId: number, vintageYear: number) =>
    request<{ profile: string }>(`/remi/enrichment/${wineId}/${vintageYear}`),
  remiGenerateSuggestions: () =>
    request<{ suggestions: { id: number; content: string; wineId: number | null }[] }>('/remi/suggestions', { method: 'POST' }),
  remiGetSuggestions: () =>
    request<{ suggestions: { id: number; content: string; wineId: number | null; createdAt: string }[] }>('/remi/suggestions'),
  remiChat: (message: string, focusWineId?: number | null) =>
    request<{ reply: string }>('/remi/chat', { method: 'POST', body: JSON.stringify({ message, focusWineId }) }),
  remiGetChat: () =>
    request<{ messages: { id: number; role: string; content: string; createdAt: string }[] }>('/remi/chat'),
  remiClearChat: () =>
    request<{ cleared: number }>('/remi/chat', { method: 'DELETE' }),
  remiDismissSuggestion: (id: number) =>
    request<{ dismissed: boolean }>(`/remi/suggestions/${id}`, { method: 'DELETE' }),
  remiFindThemes: (minRating?: number) =>
    request<{ themes: { theme: string; wines: string[]; description: string }[] }>('/remi/themes', { method: 'POST', body: JSON.stringify({ minRating }) }),

  // AI
  tellMeMore: (data: { wineName: string; vintageYear?: number; color?: string; region?: string; appellation?: string; grapeVarietyOrBlend?: string }) =>
    request<{ text: string }>('/ai/tell-me-more', { method: 'POST', body: JSON.stringify(data) }),

  // Manual wine entry
  createWineWithVintage: (data: {
    name: string;
    color: 'red' | 'white' | 'rose' | 'sparkling';
    vintageYear: number;
    price?: number;
    quantity?: number;
    purchaseDate?: string;
    sellerNotes?: string;
    source?: WineSource;
    sourceCustom?: string;
    tasting?: {
      rating: number;
      notes?: string;
      tastingDate?: string;
    };
  }) =>
    request<{ wineCreated: boolean; vintageCreated: boolean; tastingCreated?: boolean; wine: Wine; vintage: Vintage }>(
      '/wines/create-with-vintage',
      { method: 'POST', body: JSON.stringify(data) }
    ),
};
