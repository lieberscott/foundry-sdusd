const { network, ethers } = require("hardhat");
const { FUNC, NEW_COLLATERAL_RATIO, PROPOSAL_DESCRIPTION, MIN_DELAY, developmentChains, proposalsFile } = require("../utils/helper-hardhat-config");
const fs = require("fs");
const { moveBlocks } = require("../utils/move-blocks.js");
const { moveTime } = require("../utils/move-time.js");


const queueAndExecute = async () => {
  const args = [NEW_COLLATERAL_RATIO];
  const functionToCall = FUNC;
  const sdusd = await ethers.getContract("SDUSD");
  const encodedFunctionCall = sdusd.interface.encodeFunctionData(functionToCall, args);
  const descriptionHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(PROPOSAL_DESCRIPTION));
  // could also use ethers.utils.id(PROPOSAL_DESCRIPTION)

  const sdusdao = await ethers.getContract("SDUSDAO")
  console.log("Queueing...")
  const queueTx = await sdusdao.queue([sdusd.address], [0], [encodedFunctionCall], descriptionHash)
  await queueTx.wait(1);

  if (developmentChains.includes(network.name)) {
    await moveTime(MIN_DELAY + 1)
    await moveBlocks(1)
  }

  console.log("Executing...")
  // this will fail on a testnet because you need to wait for the MIN_DELAY!
  const executeTx = await sdusdao.execute(
    [sdusd.address],
    [0],
    [encodedFunctionCall],
    descriptionHash
  )
  await executeTx.wait(1)
  console.log(`New collateral ratio value: ${await sdusd.getEthCollateralRatio()}`)
}

queueAndExecute()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })