import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { sepolia } from 'wagmi/chains';

export const config = getDefaultConfig({
  appName: 'PrivatePixels',
  projectId: 'privatepixels-connect',
  chains: [sepolia],
  ssr: false,
});
