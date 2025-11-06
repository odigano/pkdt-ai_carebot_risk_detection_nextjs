export async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  return new Promise((resolve) => {
    if (!address || !window.kakao?.maps?.services) return resolve(null);
    const geocoder = new kakao.maps.services.Geocoder();
    geocoder.addressSearch(address, (result, status) => {
      if (status === kakao.maps.services.Status.OK && result.length > 0) {
        const { y, x } = result[0];
        resolve({ lat: parseFloat(y), lng: parseFloat(x) });
      } else {
        resolve(null);
      }
    });
  });
}