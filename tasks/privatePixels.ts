import { FhevmType } from "@fhevm/hardhat-plugin";
import { task } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";

task("task:address", "Prints the PrivatePixels address").setAction(async function (_taskArguments: TaskArguments, hre) {
  const { deployments } = hre;

  const privatePixels = await deployments.get("PrivatePixels");

  console.log("PrivatePixels address is " + privatePixels.address);
});

task("task:create-canvas", "Create a new encrypted canvas")
  .addOptionalParam("label", "Optional label for the canvas")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments } = hre;
    const { address } = await deployments.get("PrivatePixels");
    const contract = await ethers.getContractAt("PrivatePixels", address);
    const signer = (await ethers.getSigners())[0];

    const tx = await contract.connect(signer).createCanvas(taskArguments.label ?? "");
    console.log(`Waiting for tx ${tx.hash}...`);
    await tx.wait();
    const canvasId = await contract.canvasCount();
    console.log(`Canvas created on tx ${tx.hash} with id ${canvasId}`);
  });

task("task:save-cells", "Encrypt and save cell ids to a canvas")
  .addParam("canvas", "Canvas id to update")
  .addParam("cells", "Comma separated list of cell ids (1-100)")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments, fhevm } = hre;
    await fhevm.initializeCLIApi();

    const canvasId = parseInt(taskArguments.canvas);
    const cellList = String(taskArguments.cells)
      .split(",")
      .map((value) => parseInt(value.trim()))
      .filter((value) => !Number.isNaN(value));

    if (cellList.length === 0) {
      throw new Error("No cell ids provided");
    }
    if (cellList.length > 100) {
      throw new Error("Only 100 cells fit a canvas");
    }

    const { address } = await deployments.get("PrivatePixels");
    const signer = (await ethers.getSigners())[0];
    const contract = await ethers.getContractAt("PrivatePixels", address);

    const encryptedInput = await cellList.reduce((buffer, value) => buffer.add32(value), fhevm.createEncryptedInput(address, signer.address)).encrypt();

    const tx = await contract
      .connect(signer)
      .saveEncryptedCells(canvasId, encryptedInput.handles, encryptedInput.inputProof);

    console.log(`Waiting for tx ${tx.hash}...`);
    await tx.wait();
    console.log(`Saved ${cellList.length} cells to canvas ${canvasId}`);
  });

task("task:decrypt-canvas", "Decrypt stored cells for a canvas")
  .addParam("canvas", "Canvas id to decrypt")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments, fhevm } = hre;
    await fhevm.initializeCLIApi();

    const canvasId = parseInt(taskArguments.canvas);
    if (Number.isNaN(canvasId)) {
      throw new Error("Canvas id must be a number");
    }

    const { address } = await deployments.get("PrivatePixels");
    const signer = (await ethers.getSigners())[0];
    const contract = await ethers.getContractAt("PrivatePixels", address);

    const encryptedCells = await contract.getCanvasCells(canvasId);
    if (!encryptedCells.length) {
      console.log(`Canvas ${canvasId} has no cells yet`);
      return;
    }

    const decrypted = [];
    for (const cell of encryptedCells) {
      const value = await fhevm.userDecryptEuint(FhevmType.euint32, cell, address, signer);
      decrypted.push(value);
    }

    console.log(`Canvas ${canvasId} cells: ${decrypted.join(", ")}`);
  });
