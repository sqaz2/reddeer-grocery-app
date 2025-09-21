export interface StoreHours {
  weekdayText?: string[];
  currentOpeningHours?: string[];
}

export interface StoreLocation {
  lat: number;
  lng: number;
}

export interface Store {
  placeId: string;
  name: string;
  formattedAddress: string;
  location: StoreLocation;
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

export interface StoreDataset {
  stores: Store[];
  metadata: {
    generatedAt: string;
    sourceQueries: string[];
  };
}
