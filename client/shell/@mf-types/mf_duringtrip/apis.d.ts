
    export type RemoteKeys = 'mf_duringtrip/App';
    type PackageType<T> = T extends 'mf_duringtrip/App' ? typeof import('mf_duringtrip/App') :any;