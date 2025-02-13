const { network } = require("hardhat");
const { developmentChains, networkConfigInfo, SDNFT_NAME, SDNFT_SYMBOL } = require("../utils/helper-hardhat-config");
const { verify } = require("../utils/verify");
const { getContractAt } = require("ethers");

module.exports = async ({ getNamedAccounts, deployments }) => {

  const { deploy, log, get } = deployments;
  const { deployer } = await getNamedAccounts();
  const chainId = network.config.chainId;

  const baseTokenURI = networkConfigInfo[chainId].baseTokenURI;
  const sdusdContract = await get("SDUSD");
  const sdusdContractAddress = sdusdContract.address;

  log("----------------------------------------------------");
  log("Deploying SDNFT and waiting for confirmations...");

  const arguments = [/* baseTokenURI, */sdusdContractAddress, SDNFT_NAME, SDNFT_SYMBOL];

  // if (!baseTokenURI) {
  //   log("You have not added the baseTokenURI for your NFTs!!!! Add this before deploying to mainnet!!!")
  // }

  // else {
    const sdnftDeployment = await deploy("SDNFT", {
      from: deployer,
      args: arguments,
      log: true,
      // we need to wait if on a live network so we can verify properly
      waitConfirmations: networkConfigInfo[chainId].blockConfirmations || 1,
    });
  
    log(`SDNFT at ${sdnftDeployment.address}`);
    if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
      await verify(sdnftDeployment.address, arguments);
    }
  // }
}

module.exports.tags = ["all", "mocks", "main"];