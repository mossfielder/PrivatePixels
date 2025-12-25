# PrivatePixels

PrivatePixels is a privacy-first pixel canvas that lets users draw on a 10x10 grid, encrypt their selections with Zama
FHE, and store the ciphertext on-chain. Users can later retrieve their canvas and decrypt it to reveal the image.

## Project goals

- Provide a minimal, understandable FHE workflow for end users.
- Keep user artwork private while still using a public blockchain.
- Make on-chain ownership verifiable without exposing raw pixel data.
- Offer a small, deterministic grid that is easy to reason about and test.

## Problems this project solves

- Public on-chain art makes creative choices permanent and fully transparent.
- Off-chain storage breaks the integrity and ownership story for digital art.
- Traditional encryption requires manual key handling that most users cannot manage.

PrivatePixels keeps the drawing data encrypted end-to-end while storing it on-chain, so users get privacy and
verifiability at the same time.

## Key features

- 10x10 canvas with cell IDs 1-100 (row-major order).
- Encrypted storage of selected cell IDs using Zama FHE.
- On-chain persistence of user canvas data.
- Frontend decrypt flow to reconstruct the drawn image.
- Wallet-based ownership with no local storage.

## How it works

1. The user creates a canvas.
2. The user selects pixels on a 10x10 grid.
3. The selected cell IDs are encrypted with Zama FHE.
4. Ciphertext is stored in the smart contract.
5. The user fetches their canvas and decrypts it in the frontend.

## Advantages

- Privacy by default: raw pixel IDs never appear on-chain.
- Deterministic layout: the grid and ID mapping are stable and verifiable.
- Simple UX: users only connect a wallet and draw.
- Clear separation of read/write concerns: reads via viem, writes via ethers.

## Tech stack

- Smart contracts: Solidity with Hardhat
- FHE: Zama FHEVM
- Frontend: React + Vite
- Web3: viem (reads), ethers (writes), RainbowKit for wallet connection
- Package manager: npm

## Repository layout

```
contracts/     Smart contracts
deploy/        Deployment scripts
deployments/   Network deployments (ABI for frontend)
tasks/         Hardhat tasks
test/          Contract tests
home/          Frontend (React + Vite)
docs/          Zama references
```

## Prerequisites

- Node.js 20+
- npm

## Installation

```bash
npm install
```

## Contract development workflow

1. Compile contracts:

   ```bash
   npm run compile
   ```

2. Run tests:

   ```bash
   npm run test
   ```

3. Run tasks as needed:

   ```bash
   npx hardhat --help
   ```

## Local deployment (for contract validation)

```bash
npx hardhat node
npx hardhat deploy --network localhost
```

The frontend is not intended to use localhost; it targets Sepolia for real usage.

## Sepolia deployment

Deployment uses a private key and RPC access via `.env`. Ensure these are set:

- `PRIVATE_KEY`
- `INFURA_API_KEY`
- Optional: `ETHERSCAN_API_KEY`

Then deploy:

```bash
npx hardhat deploy --network sepolia
```

Notes:

- Mnemonic-based deployment is not supported.
- The frontend ABI must be copied from `deployments/sepolia` after deployment.

## Frontend development

```bash
cd home
npm install
npm run dev
```

Frontend notes:

- No Tailwind is used.
- No environment variables are used in the frontend.
- No local storage is used; on-chain data is the source of truth.

## Usage walkthrough

1. Open the frontend and connect a wallet.
2. Create a new 10x10 canvas.
3. Click cells to draw; selections are tracked as IDs 1-100.
4. Encrypt and save the canvas to the smart contract.
5. Load your canvas and decrypt to view the image.

## Security and privacy notes

- Ciphertext is stored on-chain; plaintext cell IDs never leave the client unencrypted.
- The view functions do not rely on `msg.sender` to preserve explicit address handling.
- The relayer flow follows Zama documentation in `docs/zama_doc_relayer.md`.

## Limitations

- Canvas size is fixed at 10x10 for simplicity and predictable gas costs.
- Each user manages their own canvas; no shared canvases yet.
- Gas costs scale with the number of encrypted cell IDs.

## Future plans

- Expand to variable-sized canvases with chunked encryption.
- Add multi-canvas collections per user.
- Introduce sharing via selective re-encryption.
- Optimize storage layout to reduce gas usage.
- Add metadata for titles and timestamps (still encrypted).

## License

BSD-3-Clause-Clear. See `LICENSE`.
