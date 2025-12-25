import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers, fhevm } from "hardhat";
import { FhevmType } from "@fhevm/hardhat-plugin";
import { PrivatePixels, PrivatePixels__factory } from "../types";

type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = (await ethers.getContractFactory("PrivatePixels")) as PrivatePixels__factory;
  const contract = (await factory.deploy()) as PrivatePixels;
  const address = await contract.getAddress();

  return { contract, address };
}

describe("PrivatePixels", function () {
  let signers: Signers;
  let contract: PrivatePixels;
  let contractAddress: string;

  before(async function () {
    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { deployer: ethSigners[0], alice: ethSigners[1], bob: ethSigners[2] };
  });

  beforeEach(async function () {
    if (!fhevm.isMock) {
      console.warn("This hardhat test suite cannot run on Sepolia Testnet");
      this.skip();
    }

    ({ contract, address: contractAddress } = await deployFixture());
  });

  it("creates canvases with metadata", async function () {
    const tx = await contract.connect(signers.alice).createCanvas("first");
    await tx.wait();

    const ids = await contract.getCanvasIds(signers.alice.address);
    expect(ids.length).to.eq(1);

    const metadata = await contract.getCanvasMetadata(ids[0]);
    expect(metadata.owner).to.eq(signers.alice.address);
    expect(metadata.label).to.eq("first");
    expect(metadata.finalized).to.eq(false);
    expect(metadata.cellCount).to.eq(0);
  });

  it("stores encrypted cells and lets the owner decrypt", async function () {
    const createTx = await contract.connect(signers.alice).createCanvas("grid");
    await createTx.wait();

    const canvasId = (await contract.getCanvasIds(signers.alice.address))[0];

    const cells = [1, 10, 42, 77];
    const encryptedInput = await cells
      .reduce((buffer, value) => buffer.add32(value), fhevm.createEncryptedInput(contractAddress, signers.alice.address))
      .encrypt();

    const tx = await contract
      .connect(signers.alice)
      .saveEncryptedCells(canvasId, encryptedInput.handles, encryptedInput.inputProof);
    await tx.wait();

    const storedCells = await contract.getCanvasCells(canvasId);
    expect(storedCells.length).to.eq(cells.length);

    const decrypted = [];
    for (const value of storedCells) {
      const plain = await fhevm.userDecryptEuint(FhevmType.euint32, value, contractAddress, signers.alice);
      decrypted.push(plain);
    }

    expect(decrypted).to.deep.eq(cells);
  });

  it("allows the owner to share viewing permissions", async function () {
    const createTx = await contract.connect(signers.alice).createCanvas("share");
    await createTx.wait();
    const canvasId = (await contract.getCanvasIds(signers.alice.address))[0];

    const cells = [5, 6, 7];
    const encryptedInput = await cells
      .reduce((buffer, value) => buffer.add32(value), fhevm.createEncryptedInput(contractAddress, signers.alice.address))
      .encrypt();

    await (
      await contract
        .connect(signers.alice)
        .saveEncryptedCells(canvasId, encryptedInput.handles, encryptedInput.inputProof)
    ).wait();

    await (await contract.connect(signers.alice).allowViewer(canvasId, signers.bob.address)).wait();

    const storedCells = await contract.getCanvasCells(canvasId);
    const decryptedByBob = [];
    for (const value of storedCells) {
      const plain = await fhevm.userDecryptEuint(FhevmType.euint32, value, contractAddress, signers.bob);
      decryptedByBob.push(plain);
    }

    expect(decryptedByBob).to.deep.eq(cells);
  });

  it("finalizes a canvas after cells are saved", async function () {
    await (await contract.connect(signers.alice).createCanvas("final")).wait();
    const canvasId = (await contract.getCanvasIds(signers.alice.address))[0];

    const encryptedInput = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add32(3)
      .encrypt();

    await (
      await contract
        .connect(signers.alice)
        .saveEncryptedCells(canvasId, encryptedInput.handles, encryptedInput.inputProof)
    ).wait();

    await (await contract.connect(signers.alice).finalizeCanvas(canvasId)).wait();

    const metadata = await contract.getCanvasMetadata(canvasId);
    expect(metadata.finalized).to.eq(true);
  });
});
