
    export type RemoteKeys = 'itinerary_main/App';
    type PackageType<T> = T extends 'itinerary_main/App' ? typeof import('itinerary_main/App') :any;