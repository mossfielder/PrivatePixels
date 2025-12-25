// PrivatePixels contract ABI (copied from deployments artifact). Update the address after deploying to Sepolia.
export const CONTRACT_ADDRESS = '0x1B67488E15f11E6f98FE6B61a42a561455bdd887';

export const CONTRACT_ABI = [
  {
    "inputs": [],
    "name": "ZamaProtocolUnsupported",
    "type": "error"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "owner",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "canvasId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "label",
        "type": "string"
      }
    ],
    "name": "CanvasCreated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "owner",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "canvasId",
        "type": "uint256"
      }
    ],
    "name": "CanvasFinalized",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "owner",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "canvasId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "cellCount",
        "type": "uint256"
      }
    ],
    "name": "CanvasSaved",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "owner",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "canvasId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "viewer",
        "type": "address"
      }
    ],
    "name": "ViewerGranted",
    "type": "event"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "canvasId",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "viewer",
        "type": "address"
      }
    ],
    "name": "allowViewer",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "canvasCount",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "confidentialProtocolId",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "label",
        "type": "string"
      }
    ],
    "name": "createCanvas",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "canvasId",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "canvasId",
        "type": "uint256"
      }
    ],
    "name": "finalizeCanvas",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "canvasId",
        "type": "uint256"
      }
    ],
    "name": "getCanvasCells",
    "outputs": [
      {
        "internalType": "euint32[]",
        "name": "",
        "type": "bytes32[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "user",
        "type": "address"
      }
    ],
    "name": "getCanvasIds",
    "outputs": [
      {
        "internalType": "uint256[]",
        "name": "",
        "type": "uint256[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "canvasId",
        "type": "uint256"
      }
    ],
    "name": "getCanvasMetadata",
    "outputs": [
      {
        "internalType": "address",
        "name": "owner",
        "type": "address"
      },
      {
        "internalType": "string",
        "name": "label",
        "type": "string"
      },
      {
        "internalType": "uint256",
        "name": "createdAt",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "updatedAt",
        "type": "uint256"
      },
      {
        "internalType": "bool",
        "name": "finalized",
        "type": "bool"
      },
      {
        "internalType": "uint256",
        "name": "cellCount",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "canvasId",
        "type": "uint256"
      },
      {
        "internalType": "externalEuint32[]",
        "name": "encryptedCells",
        "type": "bytes32[]"
      },
      {
        "internalType": "bytes",
        "name": "inputProof",
        "type": "bytes"
      }
    ],
    "name": "saveEncryptedCells",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;
