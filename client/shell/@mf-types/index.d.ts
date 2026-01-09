import type { PackageType as PackageType_0,RemoteKeys as RemoteKeys_0 } from './itinerary_main/apis.d.ts';
import type { PackageType as PackageType_1,RemoteKeys as RemoteKeys_1 } from './mf_duringtrip/apis.d.ts';
import type { PackageType as PackageType_2,RemoteKeys as RemoteKeys_2 } from './mf_itinerary/apis.d.ts';
import type { PackageType as PackageType_3,RemoteKeys as RemoteKeys_3 } from './mf_pretrip/apis.d.ts';
import type { PackageType as PackageType_4,RemoteKeys as RemoteKeys_4 } from './pretrip_main/apis.d.ts';
    declare module "@module-federation/runtime" {
      type RemoteKeys = RemoteKeys_0 | RemoteKeys_1 | RemoteKeys_2 | RemoteKeys_3 | RemoteKeys_4;
      type PackageType<T, Y=any> = T extends RemoteKeys_0 ? PackageType_0<T> :
T extends RemoteKeys_1 ? PackageType_1<T> :
T extends RemoteKeys_2 ? PackageType_2<T> :
T extends RemoteKeys_3 ? PackageType_3<T> :
T extends RemoteKeys_4 ? PackageType_4<T> :
Y ;
      export function loadRemote<T extends RemoteKeys,Y>(packageName: T): Promise<PackageType<T, Y>>;
      export function loadRemote<T extends string,Y>(packageName: T): Promise<PackageType<T, Y>>;
    }
declare module "@module-federation/enhanced/runtime" {
      type RemoteKeys = RemoteKeys_0 | RemoteKeys_1 | RemoteKeys_2 | RemoteKeys_3 | RemoteKeys_4;
      type PackageType<T, Y=any> = T extends RemoteKeys_0 ? PackageType_0<T> :
T extends RemoteKeys_1 ? PackageType_1<T> :
T extends RemoteKeys_2 ? PackageType_2<T> :
T extends RemoteKeys_3 ? PackageType_3<T> :
T extends RemoteKeys_4 ? PackageType_4<T> :
Y ;
      export function loadRemote<T extends RemoteKeys,Y>(packageName: T): Promise<PackageType<T, Y>>;
      export function loadRemote<T extends string,Y>(packageName: T): Promise<PackageType<T, Y>>;
    }
declare module "@module-federation/runtime-tools" {
      type RemoteKeys = RemoteKeys_0 | RemoteKeys_1 | RemoteKeys_2 | RemoteKeys_3 | RemoteKeys_4;
      type PackageType<T, Y=any> = T extends RemoteKeys_0 ? PackageType_0<T> :
T extends RemoteKeys_1 ? PackageType_1<T> :
T extends RemoteKeys_2 ? PackageType_2<T> :
T extends RemoteKeys_3 ? PackageType_3<T> :
T extends RemoteKeys_4 ? PackageType_4<T> :
Y ;
      export function loadRemote<T extends RemoteKeys,Y>(packageName: T): Promise<PackageType<T, Y>>;
      export function loadRemote<T extends string,Y>(packageName: T): Promise<PackageType<T, Y>>;
    }
    