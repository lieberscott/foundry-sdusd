const { network, ethers } = require("hardhat");
const { developmentChains, VOTING_DELAY, proposalsFile, FUNC, PROPOSAL_DESCRIPTION, NEW_COLLATERAL_RATIO } = require("../utils/helper-hardhat-config");
const fs = require("fs");
const { moveBlocks } = require("../utils/move-blocks.js");


const propose = async (args, functionToCall, proposalDescription) => {
  const sdusdao = await ethers.getContract("SDUSDAO");
  const sdusd = await ethers.getContract("SDUSD");

  const accounts = await ethers.getSigners();
  const adam = accounts[1];

  const sdnftFromAdam = await ethers.getContract("SDNFT", adam.address);
  const sdusdaoFromAdam = await ethers.getContract("SDUSDAO", adam.address);

  const adamNftTx = await sdnftFromAdam.buyNft({ value: "100000000000000000" });
  const adamReceipt = await adamNftTx.wait(1);
  await sdnftFromAdam.delegate(adam.address);
  await ethers.provider.send("evm_mine", []); // Mine one block to ensure snapshots are recorded
  await ethers.provider.send("evm_mine", []); // Mine one block to ensure snapshots are recorded


  const encodedFunctionCall = sdusd.interface.encodeFunctionData(functionToCall, args)
  console.log(`Proposing ${functionToCall} on ${sdusd.address} with ${args}`)
  console.log(`Proposal Description:\n  ${proposalDescription}`)
  const proposeTx = await sdusdaoFromAdam.propose(
    [sdusd.address],
    [0],
    [encodedFunctionCall],
    proposalDescription
  )
  // If working on a development chain, we will push forward till we get to the voting period.
  if (developmentChains.includes(network.name)) {
    await moveBlocks(VOTING_DELAY + 1)
  }
  const proposeReceipt = await proposeTx.wait(1);
  const proposalId = proposeReceipt.events[0].args.proposalId;
  console.log(`Proposed with proposal ID:\n  ${proposalId}`);

  const proposalState = await sdusdao.state(proposalId)
  const proposalSnapShot = await sdusdao.proposalSnapshot(proposalId)
  const proposalDeadline = await sdusdao.proposalDeadline(proposalId)
  // save the proposalId
  await storeProposalId(proposalId);

  // the Proposal State is an enum data type, defined in the IGovernor contract.
  // 0:Pending, 1:Active, 2:Canceled, 3:Defeated, 4:Succeeded, 5:Queued, 6:Expired, 7:Executed
  console.log(`Current Proposal State: ${proposalState}`)
  // What block # the proposal was snapshot
  console.log(`Current Proposal Snapshot: ${proposalSnapShot}`)
  // The block number the proposal voting expires
  console.log(`Current Proposal Deadline: ${proposalDeadline}`)
}

async function storeProposalId(proposalId) {
  // console.log("network.config : ", network.config);
  const networkDetails = await ethers.provider.getNetwork();
  const chainId = networkDetails.chainId;
  let proposals;

  if (fs.existsSync(proposalsFile)) {
      proposals = JSON.parse(fs.readFileSync(proposalsFile, "utf8"));
  } else {
      proposals = { };
      proposals[chainId] = [];
  }   
  proposals[chainId].push(proposalId.toString());
  fs.writeFileSync(proposalsFile, JSON.stringify(proposals), "utf8");
}

propose([NEW_COLLATERAL_RATIO], FUNC, PROPOSAL_DESCRIPTION)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })