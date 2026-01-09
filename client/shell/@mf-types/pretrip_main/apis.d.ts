
    export type RemoteKeys = 'pretrip_main/App';
    type PackageType<T> = T extends 'pretrip_main/App' ? typeof import('pretrip_main/App') :any;