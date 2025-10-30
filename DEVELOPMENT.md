# 개발 가이드

## 🏗️ 아키텍처

### 컴포넌트 구조

이 프로젝트는 **컴포넌트 기반 아키텍처**를 사용합니다:

```
App (메인 컨테이너)
├── Header (상단 헤더)
├── SearchBar & CategoryFilter (검색/필터 영역)
├── MapView (지도 뷰)
│   └── DeviceMarker (기기 마커들)
└── BottomNavigation (하단 네비게이션)
```

### 상태 관리

현재는 React의 `useState` 훅을 사용한 로컬 상태 관리를 사용합니다:

- `searchValue`: 검색어 상태
- `activeCategory`: 선택된 카테고리
- `activeNav`: 활성화된 네비게이션 탭

### 데이터 흐름

1. **Props Down**: 부모 컴포넌트에서 자식으로 데이터 전달
2. **Events Up**: 자식 컴포넌트에서 이벤트 핸들러를 통해 부모에게 알림

## 📝 코딩 규칙

### TypeScript

- 모든 컴포넌트는 TypeScript로 작성
- Props 인터페이스는 컴포넌트 파일 내에 정의
- 공통 타입은 `src/types/index.ts`에 정의
- `type` 키워드를 사용하여 타입만 import

```typescript
// ✅ 올바른 방법
import type { Device } from './types';

// ❌ 잘못된 방법
import { Device } from './types';
```

### React 컴포넌트

- 함수형 컴포넌트 사용
- `React.FC` 타입 사용
- Props 타입은 인터페이스로 정의

```typescript
interface MyComponentProps {
  title: string;
  onClick: () => void;
}

const MyComponent: React.FC<MyComponentProps> = ({ title, onClick }) => {
  return <div onClick={onClick}>{title}</div>;
};
```

### 스타일링

- **Tailwind CSS** 유틸리티 클래스 사용
- 커스텀 CSS는 최소화
- 조건부 스타일링은 템플릿 리터럴 사용

```typescript
className={`
  px-3 py-2 rounded-full text-sm
  ${active ? 'bg-blue-600 text-white' : 'bg-white text-gray-600'}
`}
```

## 🔧 개발 팁

### 핫 리로드

Vite는 자동으로 HMR(Hot Module Replacement)을 지원합니다. 파일을 저장하면 브라우저가 자동으로 업데이트됩니다.

### 디버깅

개발자 도구를 사용하여 디버깅할 수 있습니다:

```typescript
console.log('기기 클릭:', device);
```

### 린팅

저장 시 자동 린팅이 실행되며, 수동으로 실행하려면:

```bash
npm run lint
```

## 🎨 새 컴포넌트 추가하기

1. `src/components` 디렉토리에 새 파일 생성

```typescript
// src/components/NewComponent.tsx
import React from 'react';

interface NewComponentProps {
  // props 정의
}

const NewComponent: React.FC<NewComponentProps> = (props) => {
  return (
    <div>
      {/* 컴포넌트 내용 */}
    </div>
  );
};

export default NewComponent;
```

2. `src/components/index.ts`에 export 추가

```typescript
export { default as NewComponent } from './NewComponent';
```

3. 필요한 곳에서 import

```typescript
import { NewComponent } from './components';
```

## 🔄 상태 관리 확장

프로젝트가 커지면 다음과 같은 상태 관리 라이브러리 도입을 고려할 수 있습니다:

- **Zustand**: 가볍고 간단한 상태 관리
- **Redux Toolkit**: 복잡한 상태 관리
- **React Query**: 서버 상태 관리

## 🌐 API 통합

백엔드 API를 통합할 때:

1. `src/api` 디렉토리 생성
2. API 클라이언트 설정 (axios 등)
3. React Query 또는 SWR 사용 권장

```typescript
// src/api/devices.ts
export const fetchDevices = async () => {
  const response = await fetch('/api/devices');
  return response.json();
};
```

## 📦 빌드 및 배포

### 프로덕션 빌드

```bash
npm run build
```

빌드 결과물은 `dist` 폴더에 생성됩니다.

### 배포 옵션

- **Vercel**: 가장 간단한 배포 (추천)
- **Netlify**: CI/CD 통합
- **GitHub Pages**: 무료 호스팅

## 🧪 테스트

테스트 프레임워크를 추가하려면:

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom
```

## 📚 추가 학습 자료

- [React 공식 문서](https://react.dev)
- [TypeScript 핸드북](https://www.typescriptlang.org/docs/)
- [Tailwind CSS 문서](https://tailwindcss.com/docs)
- [Vite 가이드](https://vitejs.dev/guide/)

