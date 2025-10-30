# 어디-비움 (Eodi-bium) - 기기 찾기 앱

React + TypeScript + Tailwind CSS로 구축된 기기 찾기 애플리케이션입니다.

## 🚀 기능

- **지도 뷰**: 주변 기기를 지도에서 시각적으로 확인
- **실시간 검색**: 기기 이름으로 빠른 검색
- **카테고리 필터**: 배터리, 형광등, 스마트폰 등 카테고리별 필터링
- **거리 표시**: 각 기기까지의 거리를 미터 단위로 표시
- **반응형 디자인**: 모바일 우선 디자인

## 📦 기술 스택

- **React 19** - UI 라이브러리
- **TypeScript** - 타입 안정성
- **Tailwind CSS** - 유틸리티 기반 CSS 프레임워크
- **Vite** - 빠른 개발 서버 및 빌드 도구
- **Font Awesome** - 아이콘

## 📁 프로젝트 구조

```
src/
├── components/           # React 컴포넌트
│   ├── Header.tsx       # 상단 헤더 (뒤로가기, 제목, 설정)
│   ├── SearchBar.tsx    # 검색 바
│   ├── CategoryFilter.tsx # 카테고리 필터 버튼
│   ├── MapView.tsx      # 지도 뷰
│   ├── DeviceMarker.tsx # 기기 마커
│   └── BottomNavigation.tsx # 하단 네비게이션
├── types/               # TypeScript 타입 정의
│   └── index.ts        # Device, Category, NavItem 타입
├── App.tsx             # 메인 앱 컴포넌트
├── App.css             # 앱 스타일
├── index.css           # 전역 스타일 (Tailwind)
└── main.tsx            # 앱 진입점
```

## 🛠️ 설치 및 실행

### 필수 요구사항

- Node.js 18+ 
- npm 또는 yarn

### 설치

```bash
npm install
```

### 개발 서버 실행

```bash
npm run dev
```

브라우저에서 `http://localhost:5173`을 열어 앱을 확인하세요.

### 빌드

```bash
npm run build
```

### 프리뷰

```bash
npm run preview
```

## 🎨 컴포넌트 설명

### Header
- 뒤로가기, 타이틀, 설정 버튼이 포함된 상단 헤더

### SearchBar
- 기기 이름으로 검색할 수 있는 검색 바
- 필터 버튼 포함

### CategoryFilter
- 전체, 배터리, 형광등, 스마트폰 카테고리 버튼
- 활성 카테고리 하이라이팅

### MapView
- 지도 배경과 기기 마커 표시
- 현재 위치 표시 (중앙 파란색 점)
- 줌 인/아웃 컨트롤

### DeviceMarker
- 지도 위에 표시되는 개별 기기 마커
- 기기 타입에 따른 아이콘 표시
- 거리 정보 표시

### BottomNavigation
- 지도, 목록, 기록, 내 정보 네비게이션
- 활성 탭 하이라이팅

## 📝 타입 정의

```typescript
// 기기 타입
type DeviceType = 'battery' | 'light' | 'phone';

// 기기 인터페이스
interface Device {
  id: string;
  name: string;
  type: DeviceType;
  distance: number;
  position: {
    top?: string;
    left?: string;
    right?: string;
    bottom?: string;
  };
}

// 카테고리 인터페이스
interface Category {
  id: string;
  label: string;
  icon: string;
  type: DeviceType | 'all';
}

// 네비게이션 아이템
type NavItem = {
  id: string;
  label: string;
  icon: string;
  active: boolean;
};
```

## 🎯 향후 개선 사항

- [ ] 실제 지도 API 통합 (Google Maps, Kakao Maps 등)
- [ ] 백엔드 API 연동
- [ ] 기기 추가/삭제 기능
- [ ] 기기 상세 정보 모달
- [ ] 목록, 기록, 내 정보 페이지 구현
- [ ] 실시간 위치 추적
- [ ] 푸시 알림 기능
- [ ] 다크 모드 지원

## 📄 라이선스

MIT
