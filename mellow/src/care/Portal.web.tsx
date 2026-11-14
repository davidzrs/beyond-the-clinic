// Web: the care team portal, loaded only when a clinician needs it.
import React, { Suspense } from 'react';
import { ActivityIndicator, View } from 'react-native';

const PortalApp = React.lazy(() => import('./PortalApp'));

export function CarePortal() {
  return (
    <Suspense fallback={<View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f2f6fb' }}><ActivityIndicator color="#2a6db0" /></View>}>
      <PortalApp />
    </Suspense>
  );
}
