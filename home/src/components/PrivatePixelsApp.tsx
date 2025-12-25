import { useEffect, useMemo, useState } from 'react';
import { Contract } from 'ethers';
import { useAccount, useReadContract } from 'wagmi';

import { CONTRACT_ADDRESS, CONTRACT_ABI } from '../config/contracts';
import { useZamaInstance } from '../hooks/useZamaInstance';
import { useEthersSigner } from '../hooks/useEthersSigner';

const GRID_SIZE = 10;
const MAX_CELLS = 100;

type CanvasMetadata = {
  owner: string;
  label: string;
  createdAt: number;
  updatedAt: number;
  finalized: boolean;
  cellCount: number;
};

const initialMetadata: CanvasMetadata = {
  owner: '',
  label: '',
  createdAt: 0,
  updatedAt: 0,
  finalized: false,
  cellCount: 0,
};

export function PrivatePixelsApp() {
  const { address, isConnected } = useAccount();
  const signer = useEthersSigner();
  const { instance, isLoading: zamaLoading, error: zamaError } = useZamaInstance();
  const contractConfigured = true;

  const [selectedCanvasId, setSelectedCanvasId] = useState<number | null>(null);
  const [labelInput, setLabelInput] = useState<string>('Untitled canvas');
  const [shareTarget, setShareTarget] = useState<string>('');
  const [selectedCells, setSelectedCells] = useState<Set<number>>(new Set());
  const [decryptedCells, setDecryptedCells] = useState<number[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [status, setStatus] = useState<string>('');

  const {
    data: canvasIdsData,
    refetch: refetchCanvasIds,
    isFetching: isFetchingCanvasIds,
  } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'getCanvasIds',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && contractConfigured,
    },
  });

  const canvasIds = useMemo(
    () => (canvasIdsData ? (canvasIdsData as readonly bigint[]).map((value) => Number(value)) : []),
    [canvasIdsData],
  );

  useEffect(() => {
    if (canvasIds.length && (selectedCanvasId === null || !canvasIds.includes(selectedCanvasId))) {
      setSelectedCanvasId(canvasIds[0]);
    }
    if (canvasIds.length === 0) {
      setSelectedCanvasId(null);
      setSelectedCells(new Set());
      setDecryptedCells([]);
    }
  }, [canvasIds, selectedCanvasId]);

  const {
    data: metadataData,
    refetch: refetchMetadata,
    isFetching: isFetchingMetadata,
  } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'getCanvasMetadata',
    args: selectedCanvasId !== null ? [BigInt(selectedCanvasId)] : undefined,
    query: {
      enabled: selectedCanvasId !== null && contractConfigured,
    },
  });

  const parsedMetadata: CanvasMetadata = useMemo(() => {
    if (!metadataData) return initialMetadata;
    const tuple = metadataData as readonly [string, string, bigint, bigint, boolean, bigint];
    return {
      owner: tuple[0],
      label: tuple[1],
      createdAt: Number(tuple[2]),
      updatedAt: Number(tuple[3]),
      finalized: tuple[4],
      cellCount: Number(tuple[5]),
    };
  }, [metadataData]);

  const {
    data: encryptedCellsData,
    refetch: refetchCells,
    isFetching: isFetchingCells,
  } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'getCanvasCells',
    args: selectedCanvasId !== null ? [BigInt(selectedCanvasId)] : undefined,
    query: {
      enabled: selectedCanvasId !== null && contractConfigured,
    },
  });

  const encryptedCells = useMemo(
    () => (encryptedCellsData ? (encryptedCellsData as readonly string[]) : []),
    [encryptedCellsData],
  );

  const toggleCell = (cellId: number) => {
    setSelectedCells((prev) => {
      const next = new Set(prev);
      if (next.has(cellId)) {
        next.delete(cellId);
      } else {
        if (next.size >= MAX_CELLS) return next;
        next.add(cellId);
      }
      return next;
    });
  };

  const gridCells = useMemo(() => Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, i) => i + 1), []);

  const handleCreateCanvas = async () => {
    if (!address || !signer) {
      setStatus('Connect a wallet first');
      return;
    }
    if (!contractConfigured) {
      setStatus('Deploy the contract on Sepolia and update CONTRACT_ADDRESS');
      return;
    }
    setIsCreating(true);
    setStatus('Creating canvas...');
    try {
      const writer = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, await signer);
      const tx = await writer.createCanvas(labelInput.trim() || 'Untitled canvas');
      await tx.wait();
      await refetchCanvasIds();
      setLabelInput('Untitled canvas');
      setStatus('Canvas created');
    } catch (error) {
      console.error(error);
      setStatus('Failed to create canvas');
    } finally {
      setIsCreating(false);
    }
  };

  const handleSave = async () => {
    if (!address || !signer || !instance || selectedCanvasId === null) {
      setStatus('Missing connection or canvas selection');
      return;
    }
    if (!contractConfigured) {
      setStatus('Deploy the contract on Sepolia and update CONTRACT_ADDRESS');
      return;
    }
    const cells = Array.from(selectedCells).sort((a, b) => a - b);
    if (cells.length === 0) {
      setStatus('Select at least one cell before saving');
      return;
    }
    if (cells.length > MAX_CELLS) {
      setStatus('A canvas only holds 100 cells');
      return;
    }

    setIsSaving(true);
    setStatus('Encrypting cells with Zama relayer...');
    try {
      const buffer = instance.createEncryptedInput(CONTRACT_ADDRESS, address);
      cells.forEach((cell) => buffer.add32(cell));
      const encrypted = await buffer.encrypt();

      const writer = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, await signer);
      const tx = await writer.saveEncryptedCells(BigInt(selectedCanvasId), encrypted.handles, encrypted.inputProof);
      setStatus('Waiting for confirmation...');
      await tx.wait();
      await Promise.all([refetchCells(), refetchMetadata()]);
      setDecryptedCells([]);
      setStatus('Encrypted cells saved');
    } catch (error) {
      console.error(error);
      setStatus('Failed to save cells');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDecrypt = async () => {
    if (!instance || !address || !encryptedCells.length || !signer || selectedCanvasId === null) {
      setStatus('Nothing to decrypt yet');
      return;
    }
    if (!contractConfigured) {
      setStatus('Deploy the contract on Sepolia and update CONTRACT_ADDRESS');
      return;
    }

    setIsDecrypting(true);
    setStatus('Requesting decryption via relayer...');
    try {
      const handleContractPairs = encryptedCells.map((handle) => ({
        handle,
        contractAddress: CONTRACT_ADDRESS,
      }));

      const startTimeStamp = Math.floor(Date.now() / 1000).toString();
      const durationDays = '10';
      const contractAddresses = [CONTRACT_ADDRESS];
      const keypair = instance.generateKeypair();
      const eip712 = instance.createEIP712(keypair.publicKey, contractAddresses, startTimeStamp, durationDays);
      const resolvedSigner = await signer;

      const signature = await resolvedSigner?.signTypedData(
        eip712.domain,
        { UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification },
        eip712.message,
      );

      if (!signature) {
        setStatus('Signature rejected');
        setIsDecrypting(false);
        return;
      }

      const result = await instance.userDecrypt(
        handleContractPairs,
        keypair.privateKey,
        keypair.publicKey,
        signature.replace('0x', ''),
        contractAddresses,
        address,
        startTimeStamp,
        durationDays,
      );

      const decryptedList = handleContractPairs.map((pair) => Number(result[pair.handle] ?? 0));
      setDecryptedCells(decryptedList);
      setSelectedCells(new Set(decryptedList));
      setStatus('Decryption complete');
    } catch (error) {
      console.error(error);
      setStatus('Failed to decrypt cells');
    } finally {
      setIsDecrypting(false);
    }
  };

  const handleFinalize = async () => {
    if (!address || !signer || selectedCanvasId === null) {
      setStatus('Select a canvas to finalize');
      return;
    }
    if (!contractConfigured) {
      setStatus('Deploy the contract on Sepolia and update CONTRACT_ADDRESS');
      return;
    }
    setIsFinalizing(true);
    setStatus('Finalizing canvas...');
    try {
      const writer = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, await signer);
      const tx = await writer.finalizeCanvas(BigInt(selectedCanvasId));
      await tx.wait();
      await refetchMetadata();
      setStatus('Canvas finalized');
    } catch (error) {
      console.error(error);
      setStatus('Failed to finalize');
    } finally {
      setIsFinalizing(false);
    }
  };

  const handleShare = async () => {
    if (!address || !signer || selectedCanvasId === null || !shareTarget) {
      setStatus('Enter a viewer address to share');
      return;
    }
    if (!contractConfigured) {
      setStatus('Deploy the contract on Sepolia and update CONTRACT_ADDRESS');
      return;
    }
    setIsSharing(true);
    setStatus('Granting view permission...');
    try {
      const writer = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, await signer);
      const tx = await writer.allowViewer(BigInt(selectedCanvasId), shareTarget);
      await tx.wait();
      setStatus('Viewer allowed to decrypt');
    } catch (error) {
      console.error(error);
      setStatus('Failed to grant access');
    } finally {
      setIsSharing(false);
    }
  };

  const resetSelection = () => {
    setSelectedCells(new Set());
    setDecryptedCells([]);
    setStatus('');
  };

  const isCellActive = (cellId: number) => selectedCells.has(cellId);
  const isCellFromChain = (cellId: number) => decryptedCells.includes(cellId);

  return (
    <main className="app-shell">
      <section className="panels">
        <div className="panel">
          <div className="panel-header">
            <div>
              <p className="panel-kicker">Your canvases</p>
              <h2 className="panel-title">Encrypted drawings</h2>
            </div>
            <button className="ghost-button" onClick={resetSelection}>
              Reset grid
            </button>
          </div>

          {!contractConfigured && (
            <div className="warning-box">
              <p className="hint">
                Deploy PrivatePixels to Sepolia and update <code>CONTRACT_ADDRESS</code> before interacting.
              </p>
            </div>
          )}

          {!isConnected && (
            <div className="empty-state">
              <p>Connect your wallet to start painting private grids.</p>
            </div>
          )}

          {isConnected && (
            <>
              <div className="create-row">
                <input
                  value={labelInput}
                  onChange={(e) => setLabelInput(e.target.value)}
                  className="text-input"
                  placeholder="Canvas label"
                />
                <button className="primary-button" onClick={handleCreateCanvas} disabled={isCreating}>
                  {isCreating ? 'Creating...' : 'New canvas'}
                </button>
              </div>

              <div className="canvas-list">
                {isFetchingCanvasIds ? (
                  <p className="hint">Loading canvases...</p>
                ) : canvasIds.length === 0 ? (
                  <p className="hint">No canvases yet. Create one to begin.</p>
                ) : (
                  canvasIds.map((id) => (
                    <button
                      key={id}
                      onClick={() => {
                        setSelectedCanvasId(id);
                        setStatus('');
                        setDecryptedCells([]);
                      }}
                      className={`canvas-chip ${selectedCanvasId === id ? 'active' : ''}`}
                    >
                      Canvas #{id}
                    </button>
                  ))
                )}
              </div>

              {selectedCanvasId !== null && (
                <div className="metadata">
                  <div>
                    <p className="meta-label">Label</p>
                    <p className="meta-value">{parsedMetadata.label || 'Untitled canvas'}</p>
                  </div>
                  <div>
                    <p className="meta-label">Cells saved</p>
                    <p className="meta-value">{isFetchingMetadata ? '...' : parsedMetadata.cellCount}</p>
                  </div>
                  <div>
                    <p className="meta-label">Status</p>
                    <p className={`badge ${parsedMetadata.finalized ? 'badge-success' : 'badge-muted'}`}>
                      {parsedMetadata.finalized ? 'Finalized' : 'Draft'}
                    </p>
                  </div>
                  <div>
                    <p className="meta-label">Last update</p>
                    <p className="meta-value">
                      {parsedMetadata.updatedAt
                        ? new Date(parsedMetadata.updatedAt * 1000).toLocaleString()
                        : 'Not saved yet'}
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="panel grid-panel">
          <div className="panel-header">
            <div>
              <p className="panel-kicker">10 x 10 grid</p>
              <h2 className="panel-title">Tap cells to paint</h2>
              <p className="hint">Selected cells are encrypted before they ever leave your browser.</p>
            </div>
            <div className="actions">
              <button onClick={handleDecrypt} className="ghost-button" disabled={isDecrypting || !encryptedCells.length}>
                {isDecrypting ? 'Decrypting...' : 'Decrypt stored cells'}
              </button>
              <button
                onClick={handleSave}
                className="primary-button"
                disabled={isSaving || selectedCanvasId === null || zamaLoading}
              >
                {isSaving ? 'Saving...' : 'Encrypt & save'}
              </button>
            </div>
          </div>

          <div className="grid">
            {gridCells.map((cell) => (
              <button
                key={cell}
                onClick={() => toggleCell(cell)}
                className={`grid-cell ${isCellActive(cell) ? 'active' : ''} ${
                  isCellFromChain(cell) ? 'from-chain' : ''
                }`}
              >
                <span>{cell}</span>
              </button>
            ))}
          </div>

          <div className="panel-footer">
            <div className="legend">
              <span className="legend-dot" />
              <p className="hint">Teal cells are selected locally. Amber rings mark decrypted on-chain strokes.</p>
            </div>
            <div className="stacked-buttons">
              <button
                onClick={handleFinalize}
                className="ghost-button"
                disabled={parsedMetadata.finalized || isFinalizing || selectedCanvasId === null}
              >
                {isFinalizing ? 'Finalizing...' : parsedMetadata.finalized ? 'Finalized' : 'Finalize canvas'}
              </button>
              <div className="share-row">
                <input
                  value={shareTarget}
                  onChange={(e) => setShareTarget(e.target.value)}
                  className="text-input"
                  placeholder="Share view rights (0x...)"
                />
                <button className="ghost-button" onClick={handleShare} disabled={isSharing || !shareTarget}>
                  {isSharing ? 'Sharing...' : 'Allow viewer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="status-strip">
        <div className="status-card">
          <p className="status-label">Zama relayer</p>
          <p className={`status-value ${zamaError ? 'error' : zamaLoading ? 'muted' : 'success'}`}>
            {zamaError ? 'Initialization failed' : zamaLoading ? 'Preparing SDK...' : 'Ready'}
          </p>
        </div>
        <div className="status-card">
          <p className="status-label">Chain data</p>
          <p className="status-value muted">
            {isFetchingCells ? 'Fetching encrypted cells...' : `${encryptedCells.length} cells loaded`}
          </p>
        </div>
        <div className="status-card wide">
          <p className="status-label">Activity</p>
          <p className="status-value">{status || 'Waiting for your next move.'}</p>
        </div>
      </section>
    </main>
  );
}
