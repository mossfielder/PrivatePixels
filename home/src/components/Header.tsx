import { ConnectButton } from '@rainbow-me/rainbowkit';
import '../styles/Header.css';

export function Header() {
  return (
    <header className="header">
      <div className="header-inner">
        <div>
          <p className="eyebrow">Private Pixels</p>
          <h1 className="header-title">Design private canvases on-chain</h1>
          <p className="header-subtitle">
            Draw on a 10x10 grid, encrypt every stroke with Zama FHE, and keep your art private until you decrypt it.
          </p>
        </div>
        <ConnectButton label="Connect wallet" showBalance={false} />
      </div>
      <div className="header-ribbon" />
    </header>
  );
}
