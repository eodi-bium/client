const TMAP_SCRIPT_ID = 'tmap-sdk-script';

const getTmapAppKey = () => {
  const appKey = import.meta.env.VITE_TMAP_APP_KEY;
  if (!appKey) {
    throw new Error('VITE_TMAP_APP_KEY가 설정되지 않았습니다.');
  }
  return appKey;
};

export const loadTmapScript = (): Promise<typeof window.Tmapv2> => {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('브라우저 환경에서만 Tmap 스크립트를 로드할 수 있습니다.'));
  }

  if (window.Tmapv2) {
    return Promise.resolve(window.Tmapv2);
  }

  const existingScript = document.getElementById(TMAP_SCRIPT_ID) as HTMLScriptElement | null;
  if (existingScript) {
    return new Promise((resolve, reject) => {
      existingScript.addEventListener('load', () => {
        if (window.Tmapv2) {
          resolve(window.Tmapv2);
        } else {
          reject(new Error('Tmap 스크립트 로드 후 전역 객체를 찾을 수 없습니다.'));
        }
      });
      existingScript.addEventListener('error', () => {
        reject(new Error('Tmap 스크립트 로드에 실패했습니다.'));
      });
    });
  }

  const script = document.createElement('script');
  script.id = TMAP_SCRIPT_ID;
  script.src = `https://apis.openapi.sk.com/tmap/jsv2?version=1&appKey=${getTmapAppKey()}`;
  script.async = false;
  script.defer = false;

  return new Promise((resolve, reject) => {
    const originalWrite = document.write.bind(document);
    const originalWriteln = document.writeln.bind(document);

    const restoreDocumentWriters = () => {
      document.write = originalWrite;
      document.writeln = originalWriteln;
    };

    const safeWriter = (content?: string) => {
      if (!content) return;
      const trimmed = content.trim();

      if (/^<script/i.test(trimmed)) {
        const srcMatch = trimmed.match(/src=["']([^"']+)["']/i);
        if (srcMatch) {
          const childScript = document.createElement('script');
          childScript.src = srcMatch[1];
          childScript.async = false;
          childScript.defer = false;
          document.head.appendChild(childScript);
          return;
        }
      }

      const range = document.createRange();
      const fragment = range.createContextualFragment(content);
      document.head.appendChild(fragment);
    };

    document.write = safeWriter as typeof document.write;
    document.writeln = ((content?: string) => safeWriter(content ?? '')) as typeof document.writeln;

    script.onload = () => {
      if (window.Tmapv2) {
        restoreDocumentWriters();
        resolve(window.Tmapv2);
      } else {
        restoreDocumentWriters();
        reject(new Error('Tmap 스크립트 로드 후 전역 객체를 찾을 수 없습니다.'));
      }
    };
    script.onerror = () => {
      restoreDocumentWriters();
      reject(new Error('Tmap 스크립트 로드에 실패했습니다.'));
    };

    document.head.appendChild(script);
  });
};
