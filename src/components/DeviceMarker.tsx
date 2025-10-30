import React from 'react';
import type { Device } from '../types';

interface DeviceMarkerProps {
  device: Device;
  onClick: (device: Device) => void;
}

const getIconClass = (type: string): string => {
  switch (type) {
    case 'battery':
      return 'fas fa-battery-half text-green-600';
    case 'light':
      return 'fas fa-lightbulb text-yellow-500';
    case 'phone':
      return 'fas fa-mobile-alt text-blue-600';
    default:
      return 'fas fa-circle text-gray-600';
  }
};

const DeviceMarker: React.FC<DeviceMarkerProps> = ({ device, onClick }) => {
  return (
    <button
      className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer"
      style={{
        top: device.position.top,
        left: device.position.left,
        right: device.position.right,
        bottom: device.position.bottom,
      }}
      onClick={() => onClick(device)}
    >
      <div className="relative">
        <div className="w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center border-2 border-gray-200">
          <i className={`${getIconClass(device.type)} text-lg`}></i>
        </div>
        <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-80 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
          {device.distance}m
        </div>
      </div>
    </button>
  );
};

export default DeviceMarker;

