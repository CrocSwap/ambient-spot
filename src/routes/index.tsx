import React from 'react';
import PlatformAmbientRoutes from './PlatformAmbient';

export const RouteRenderer: React.FC<{ platformName: string }> = ({
    platformName: _platformName,
}) => {
    return <PlatformAmbientRoutes />;
};

// export default getRoutes;
