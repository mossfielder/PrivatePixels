// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint32, externalEuint32} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title PrivatePixels
/// @notice Manages 10x10 canvas drawings where cell ids are stored as encrypted values on-chain.
contract PrivatePixels is ZamaEthereumConfig {
    struct Canvas {
        address owner;
        string label;
        uint256 createdAt;
        uint256 updatedAt;
        bool finalized;
        euint32[] cells;
    }

    uint256 private constant MAX_CELLS = 100;

    uint256 private _canvasCounter;
    mapping(uint256 => Canvas) private _canvases;
    mapping(address => uint256[]) private _ownerToCanvasIds;

    event CanvasCreated(address indexed owner, uint256 indexed canvasId, string label);
    event CanvasSaved(address indexed owner, uint256 indexed canvasId, uint256 cellCount);
    event CanvasFinalized(address indexed owner, uint256 indexed canvasId);
    event ViewerGranted(address indexed owner, uint256 indexed canvasId, address viewer);

    modifier onlyCanvasOwner(uint256 canvasId) {
        require(_canvases[canvasId].owner != address(0), "Canvas not found");
        require(_canvases[canvasId].owner == msg.sender, "Caller is not canvas owner");
        _;
    }

    /// @notice Create a new empty canvas for the caller.
    /// @param label A short label to help identify the canvas.
    /// @return canvasId Newly created canvas id.
    function createCanvas(string calldata label) external returns (uint256 canvasId) {
        _canvasCounter += 1;
        canvasId = _canvasCounter;

        Canvas storage canvas = _canvases[canvasId];
        canvas.owner = msg.sender;
        canvas.label = label;
        canvas.createdAt = block.timestamp;
        canvas.updatedAt = block.timestamp;
        canvas.finalized = false;

        _ownerToCanvasIds[msg.sender].push(canvasId);

        emit CanvasCreated(msg.sender, canvasId, label);
    }

    /// @notice Save encrypted cell ids for a canvas. Cells are overwritten on each call.
    /// @param canvasId The canvas to update.
    /// @param encryptedCells Encrypted cell ids (1-100) as external ciphertext handles.
    /// @param inputProof Proof produced by the relayer SDK for these encrypted values.
    function saveEncryptedCells(
        uint256 canvasId,
        externalEuint32[] calldata encryptedCells,
        bytes calldata inputProof
    ) external onlyCanvasOwner(canvasId) {
        require(encryptedCells.length > 0 && encryptedCells.length <= MAX_CELLS, "Invalid cell count");

        Canvas storage canvas = _canvases[canvasId];

        delete canvas.cells;
        canvas.cells = new euint32[](encryptedCells.length);

        for (uint256 i = 0; i < encryptedCells.length; i++) {
            euint32 cellId = FHE.fromExternal(encryptedCells[i], inputProof);

            cellId = FHE.allowThis(cellId);
            cellId = FHE.allow(cellId, canvas.owner);

            canvas.cells[i] = cellId;
        }

        canvas.updatedAt = block.timestamp;
        emit CanvasSaved(msg.sender, canvasId, encryptedCells.length);
    }

    /// @notice Mark a canvas as finalized to signal drawing completion.
    /// @param canvasId The canvas to finalize.
    function finalizeCanvas(uint256 canvasId) external onlyCanvasOwner(canvasId) {
        require(!_canvases[canvasId].finalized, "Canvas already finalized");
        require(_canvases[canvasId].cells.length > 0, "Canvas has no cells");

        _canvases[canvasId].finalized = true;
        _canvases[canvasId].updatedAt = block.timestamp;

        emit CanvasFinalized(msg.sender, canvasId);
    }

    /// @notice Grant another viewer permission to decrypt the stored cells.
    /// @param canvasId The canvas to share.
    /// @param viewer Address that should be allowed to decrypt.
    function allowViewer(uint256 canvasId, address viewer) external onlyCanvasOwner(canvasId) {
        require(viewer != address(0), "Viewer cannot be zero address");

        Canvas storage canvas = _canvases[canvasId];
        for (uint256 i = 0; i < canvas.cells.length; i++) {
            canvas.cells[i] = FHE.allow(canvas.cells[i], viewer);
        }

        emit ViewerGranted(msg.sender, canvasId, viewer);
    }

    /// @notice Returns metadata about a canvas without revealing cell contents.
    function getCanvasMetadata(
        uint256 canvasId
    )
        external
        view
        returns (address owner, string memory label, uint256 createdAt, uint256 updatedAt, bool finalized, uint256 cellCount)
    {
        Canvas storage canvas = _canvases[canvasId];
        require(canvas.owner != address(0), "Canvas not found");

        owner = canvas.owner;
        label = canvas.label;
        createdAt = canvas.createdAt;
        updatedAt = canvas.updatedAt;
        finalized = canvas.finalized;
        cellCount = canvas.cells.length;
    }

    /// @notice Get encrypted cell ids for a canvas.
    /// @param canvasId The canvas id.
    /// @return Encrypted cell ids in the order they were stored.
    function getCanvasCells(uint256 canvasId) external view returns (euint32[] memory) {
        Canvas storage canvas = _canvases[canvasId];
        require(canvas.owner != address(0), "Canvas not found");

        euint32[] memory cells = new euint32[](canvas.cells.length);
        for (uint256 i = 0; i < canvas.cells.length; i++) {
            cells[i] = canvas.cells[i];
        }
        return cells;
    }

    /// @notice List canvas ids created by a user.
    /// @param user Address to inspect.
    /// @return Array of canvas ids created by the user.
    function getCanvasIds(address user) external view returns (uint256[] memory) {
        return _ownerToCanvasIds[user];
    }

    /// @notice Total number of canvases created.
    function canvasCount() external view returns (uint256) {
        return _canvasCounter;
    }
}
