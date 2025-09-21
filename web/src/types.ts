export interface StoreHours {
  weekdayText?: string[];
  currentOpeningHours?: string[];
}

export interface Store {
  placeId: string;
  name: string;
  formattedAddress: string;
  googleMapsUri: string;
  businessStatus?: string;
  phoneNumber?: string;
  internationalPhoneNumber?: string;
  website?: string;
  types: string[];
  categories: string[];
  rating?: number;
  userRatingsTotal?: number;
  openingHours?: StoreHours;
  delivery?: boolean;
  takeout?: boolean;
  wheelchairAccessibleEntrance?: boolean;
  lastSyncedAt: string;
}

export interface StoreResponse {
  stores: Store[];
  total: number;
  generatedAt: string;
}
