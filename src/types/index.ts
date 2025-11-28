export type DeviceType = 'battery' | 'light' | 'clothes';

export interface Device {
  id: string;
  name: string;
  type: DeviceType;
  distance: number;
  position: {
    lat?: number;
    lng?: number;
  };
}

export interface Category {
  id: string;
  label: string;
  icon: string;
  type: DeviceType;
}

export type NavItem = {
  id: string;
  label: string;
  icon: string;
  active: boolean;
};

