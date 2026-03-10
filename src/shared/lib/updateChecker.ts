const GITHUB_API = 'https://api.github.com/repos/insushim/iwendefense/releases/latest';
const CURRENT_VERSION = '1.0.0';

export interface UpdateInfo {
  available: boolean;
  version: string;
  notes: string;
  downloadUrl: string;
}

export async function checkForUpdate(): Promise<UpdateInfo> {
  try {
    const res = await fetch(GITHUB_API);
    if (!res.ok) return { available: false, version: CURRENT_VERSION, notes: '', downloadUrl: '' };

    const data = await res.json();
    const latestVersion = data.tag_name?.replace('v', '') || CURRENT_VERSION;

    if (latestVersion !== CURRENT_VERSION) {
      const apkAsset = data.assets?.find((a: any) => a.name.endsWith('.apk'));
      return {
        available: true,
        version: latestVersion,
        notes: data.body || '새로운 버전이 출시되었습니다!',
        downloadUrl: apkAsset?.browser_download_url || '',
      };
    }
    return { available: false, version: CURRENT_VERSION, notes: '', downloadUrl: '' };
  } catch {
    return { available: false, version: CURRENT_VERSION, notes: '', downloadUrl: '' };
  }
}
