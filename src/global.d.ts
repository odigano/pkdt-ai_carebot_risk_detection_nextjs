// src/types/global.d.ts
export {};

declare global {
  // --- 다음 우편번호 API 타입 ---
  interface DaumPostcodeData {
    zonecode: string;
    roadAddress: string;
    sigungu: string;
    bname: string;
  }

  interface Window {
    daum?: {
      Postcode: {
        new (options: { oncomplete: (data: DaumPostcodeData) => void }): {
          open: () => void;
        };
      };
    };
  }

  // --- Kakao Maps API 타입 ---
  interface KakaoLatLng {
    getLat(): number;
    getLng(): number;
  }

  interface KakaoMarker {
    setMap(map: KakaoMapInstance | null): void;
  }

  interface KakaoCustomOverlay {
    setMap(map: KakaoMapInstance | null): void;
  }

  interface KakaoGeocoder {
    addressSearch(
      address: string,
      callback: (result: Array<{ x: string; y: string }>, status: string) => void
    ): void;
    coord2Address(
      lng: number,
      lat: number,
      callback: (result: KakaoAddressResult[], status: string) => void
    ): void;
  }

  interface KakaoAddressResult {
    address: {
      address_name: string;
      region_1depth_name: string;
      region_2depth_name: string;
      region_3depth_name: string;
      mountain_yn: string;
      main_address_no: string;
      sub_address_no: string;
      x: string;
      y: string;
    };
    road_address?: {
      address_name: string;
      region_1depth_name: string;
      region_2depth_name: string;
      region_3depth_name: string;
      road_name: string;
      underground_yn: string;
      main_building_no: string;
      sub_building_no: string;
      building_name: string;
      zone_no: string;
      x: string;
      y: string;
    };
  }

  interface KakaoMapServices {
    Status: {
      OK: string;
      ZERO_RESULT: string;
      ERROR: string;
    };
    Geocoder: new () => KakaoGeocoder;
  }

  interface KakaoMapInstance {
    setCenter(latlng: KakaoLatLng): void;
    setLevel(level: number): void;
  }

  interface KakaoMapOptions {
    center: { lat: number; lng: number };
    level: number;
  }

  interface KakaoMaps {
    Map: new (container: HTMLElement, options: KakaoMapOptions) => KakaoMapInstance;
    Marker: new (options: { position: { lat: number; lng: number } }) => KakaoMarker;
    CustomOverlay: new (options: { position: { lat: number; lng: number }; yAnchor?: number }) => KakaoCustomOverlay;
    LatLng: new (lat: number, lng: number) => KakaoLatLng;
    services: KakaoMapServices;
  }

  declare const kakao: { maps: KakaoMaps };
}