import React from 'react';
import CustomAlert from '@/components/CustomAlert';
import { useAlert } from '@/providers/AlertProvider';

export default function AlertRoot() {
  const { visible, config, dismissAlert } = useAlert();
  return (
    <CustomAlert
      visible={visible}
      config={config}
      onDismiss={dismissAlert}
    />
  );
}
