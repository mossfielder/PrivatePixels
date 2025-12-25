import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers, deployments, fhevm } from "hardhat";
import { FhevmType } from "@fhevm/hardhat-plugin";
import { PrivatePixels } from "../types";

type Signers = {
  alice: HardhatEthersSigner;
};

describe("PrivatePixelsSepolia", function () {
  let signers: Signers;
  let contract: PrivatePixels;
  let contractAddress: string;
  let step: number;
  let steps: number;

  function progress(message: string) {
    console.log(`${++step}/${steps} ${message}`);
  }

  before(async function () {
    if (fhevm.isMock) {
      console.warn("This hardhat test suite can only run on Sepolia Testnet");
      this.skip();
    }

    try {
      const deployment = await deployments.get("PrivatePixels");
      contractAddress = deployment.address;
      contract = await ethers.getContractAt("PrivatePixels", deployment.address);
    } catch (e) {
      (e as Error).message += ". Call 'npx hardhat deploy --network sepolia'";
      throw e;
    }

    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { alice: ethSigners[0] };
  });

  beforeEach(async () => {
    step = 0;
    steps = 0;
  });

  it("saves and decrypts canvas cells on sepolia", async function () {
    steps = 8;
    this.timeout(4 * 40000);

    progress("Creating canvas...");
    await (await contract.connect(signers.alice).createCanvas("sepolia")).wait();
    const canvasId = (await contract.getCanvasIds(signers.alice.address))[0];

    progress("Encrypting cells...");
    const encryptedInput = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add32(9)
      .add32(18)
      .encrypt();

    progress("Saving encrypted cells...");
    await (
      await contract
        .connect(signers.alice)
        .saveEncryptedCells(canvasId, encryptedInput.handles, encryptedInput.inputProof)
    ).wait();

    progress("Fetching encrypted cells...");
    const stored = await contract.getCanvasCells(canvasId);
    expect(stored.length).to.eq(2);

    progress("Decrypting cells...");
    const decryptedFirst = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      stored[0],
      contractAddress,
      signers.alice,
    );
    const decryptedSecond = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      stored[1],
      contractAddress,
      signers.alice,
    );

    progress("Asserting decrypted values...");
    expect(decryptedFirst).to.eq(9);
    expect(decryptedSecond).to.eq(18);
  });
});
