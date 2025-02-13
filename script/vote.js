const { network, ethers } = require("hardhat");
const { developmentChains, VOTING_PERIOD, proposalsFile } = require("../utils/helper-hardhat-config");
const fs = require("fs");
const { moveBlocks } = require("../utils/move-blocks.js");


const main = async () => {
  const proposals = JSON.parse(fs.readFileSync(proposalsFile, "utf8"));
  // Get the last proposal for the network. You could also change it for your index
  const networkDetails = await ethers.provider.getNetwork();
  const chainId = networkDetails.chainId;
  const proposalId = proposals[chainId].at(-1);
  // 0 = Against, 1 = For, 2 = Abstain for this example
  const voteWay = 1;
  const reason = "Testing: To increase the collateral ratio";
  await vote(proposalId, voteWay, reason);
}

// 0 = Against, 1 = For, 2 = Abstain for this example
const vote = async(proposalId, voteWay, reason) => {
  console.log("Voting...");
  const sdusdao = await ethers.getContract("SDUSDAO");
  const accounts = await ethers.getSigners();
  const adam = accounts[1];

  const sdusdaoFromAdam = await ethers.getContract("SDUSDAO", adam.address);


  const voteTx = await sdusdaoFromAdam.castVoteWithReason(proposalId, voteWay, reason);
  const voteTxReceipt = await voteTx.wait(1);
  console.log(voteTxReceipt.events[0].args.reason);
  const proposalState = await sdusdao.state(proposalId);
  console.log(`Current Proposal State: ${proposalState}`);
  if (developmentChains.includes(network.name)) {
    await moveBlocks(VOTING_PERIOD + 1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })