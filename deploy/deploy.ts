import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const deployedPrivatePixels = await deploy("PrivatePixels", {
    from: deployer,
    log: true,
  });

  console.log(`PrivatePixels contract: `, deployedPrivatePixels.address);
};
export default func;
func.id = "deploy_privatePixels"; // id required to prevent reexecution
func.tags = ["PrivatePixels"];
