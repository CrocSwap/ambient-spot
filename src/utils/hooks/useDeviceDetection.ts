import { useState, useEffect } from 'react';

// Define device types enum for type safety
export enum DeviceType {
    Mobile = 'Mobile',
    Tablet = 'Tablet',
    Desktop = 'Desktop',
}

// Device detection patterns
const DEVICE_PATTERNS = {
    mobile: /iphone|ipod|android|blackberry|windows phone/i,
    tablet: /(ipad|tablet|playbook|silk)|(android(?!.*mobile))/i,
} as const;

/**
 * Interface for user agent matching functions
 */
interface DeviceMatchers {
    isMobile: (userAgent: string) => boolean;
    isTablet: (userAgent: string) => boolean;
}

/**
 * Device detection utility functions
 */
const deviceMatchers: DeviceMatchers = {
    isMobile: (userAgent: string): boolean =>
        DEVICE_PATTERNS.mobile.test(userAgent),
    isTablet: (userAgent: string): boolean =>
        DEVICE_PATTERNS.tablet.test(userAgent),
};

/**
 * Custom hook for detecting device type based on user agent
 * @returns {DeviceType} Current device type
 */
const useDeviceDetection = (): DeviceType => {
    const [device, setDevice] = useState<DeviceType>(DeviceType.Desktop);

    useEffect(() => {
        const handleDeviceDetection = (): void => {
            const userAgent = navigator.userAgent.toLowerCase();

            switch (true) {
                case deviceMatchers.isMobile(userAgent):
                    setDevice(DeviceType.Mobile);
                    break;
                case deviceMatchers.isTablet(userAgent):
                    setDevice(DeviceType.Tablet);
                    break;
                default:
                    setDevice(DeviceType.Desktop);
            }
        };

        // Initial detection
        handleDeviceDetection();

        // Add event listener for window resize
        window.addEventListener('resize', handleDeviceDetection);

        // Cleanup
        return () => {
            window.removeEventListener('resize', handleDeviceDetection);
        };
    }, []);

    return device;
};

export default useDeviceDetection;
