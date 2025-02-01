/**
 * 
 * 1. Delete the testGetVotes function for production (only using it for testing)
 * 
 */



const { network, deployments, ethers } = require("hardhat");
const { assert, expect } = require("chai");
const {
  FUNC,
  PROPOSAL_DESCRIPTION,
  NEW_STORE_VALUE,
  VOTING_DELAY,
  VOTING_PERIOD,
  MIN_DELAY,
} = require("../../utils/helper-hardhat-config.js");
// import { moveBlocks } from "../../utils/move-blocks";
// import { moveTime } from "../../utils/move-time";



describe("SDUSDAO Contract", function () {
  let timelockFromDeployer, sdusdaoFromDeployer;
  let sdusdFromDeployer, sdnftFromDeployer, timelock, dao, daoFromDeployer;
  let deployer, adam, bob, cathy, dana, eric;
  let sdusdFromAdam, sdusdFromBob, sdusdFromCathy, sdusdFromDana;
  let sdnftFromAdam, sdnftFromBob, sdnftFromCathy, sdnftFromDana;

  const nftValue = "100000000000000000"; // 0.1 ETH
  const nftVotes = "10000"; // 10,000
  const oneEth = "1000000000000000000"; // 1 ETH
  const oneEthVotes = "2000"; // $2,000 per ETH, so for each ETH you get 2,000 SDUSD and therefore 2,000 votes

  beforeEach(async function () {
    // Get accounts
    const accounts = await ethers.getSigners()
    deployer = (await getNamedAccounts()).deployer;
    adam = accounts[1];
    bob = accounts[2];
    cathy = accounts[3];
    dana = accounts[4];
    eric = accounts[5];

    await deployments.fixture(["all"]);

    sdusdFromDeployer = await ethers.getContract("SDUSD", deployer);
    sdusdFromAdam = await ethers.getContract("SDUSD", adam.address);
    sdusdFromBob = await ethers.getContract("SDUSD", bob.address);
    sdusdFromCathy = await ethers.getContract("SDUSD", cathy.address);
    sdusdFromDana = await ethers.getContract("SDUSD", dana.address);
    sdnftFromDeployer = await ethers.getContract("SDNFT", deployer);
    sdnftFromAdam = await ethers.getContract("SDNFT", adam.address);
    sdnftFromBob = await ethers.getContract("SDNFT", bob.address);
    sdnftFromCathy = await ethers.getContract("SDNFT", cathy.address);
    sdnftFromDana = await ethers.getContract("SDNFT", dana.address);
    daoFromDeployer = await ethers.getContract("SDUSDAO", deployer);

  });

  it("Should calculate combined voting power correctly", async function () {
    
    // Mint some NFTs
    const adamNftTx = await sdnftFromAdam.buyNft({ value: nftValue });
    await adamNftTx.wait(1);
    const bobNftTx = await sdnftFromBob.buyNft({ value: nftValue });
    await bobNftTx.wait(1);
    const bobNftTx2 = await sdnftFromBob.buyNft({ value: nftValue });
    await bobNftTx2.wait(1);

    // Mint some SDUSD tokens
    const transactionHash = await adam.sendTransaction({
      to: sdusdFromDeployer.address,
      value: ethers.BigNumber.from(oneEth).mul(10) // 10 ETH
    });
    await transactionHash.wait(1);
    const adamMintTx = await sdusdFromAdam.mintSDUSD({ value: oneEth }); // 1 ETH (2,000 SDUSD)
    await adamMintTx.wait(1);
    const bobMintTx = await sdusdFromBob.mintSDUSD({ value: ethers.BigNumber.from(oneEth).add(oneEth) }); // 2 ETH (4,000 SDUSD)
    await bobMintTx.wait(1);

    await ethers.provider.send("evm_mine", []); // Mine one block to ensure snapshots are recorded.

    // Delegate votes for SDUSD and NFT
    await sdusdFromAdam.delegate(adam.address);
    await sdusdFromBob.delegate(bob.address);
    await sdnftFromAdam.delegate(adam.address);
    await sdnftFromBob.delegate(bob.address);

    await ethers.provider.send("evm_mine", []); // Mine one block to ensure snapshots are recorded.
    await ethers.provider.send("evm_mine", []); // Mine one block to ensure snapshots are recorded.
    
    const blockNumber = await ethers.provider.getBlockNumber() - 1;


    // Get voting power
    const adamVotes = await daoFromDeployer.testGetVotes(adam.address, blockNumber);
    const bobVotes = await daoFromDeployer.testGetVotes(bob.address, blockNumber);

    // adam: 1000 SDUSD + 1 NFT (10,000 votes)
    expect(adamVotes.toString()).to.equal(ethers.BigNumber.from(nftVotes).add(oneEthVotes));

    // bob: 500 SDUSD + 2 NFTs (10,000 votes)
    expect(bobVotes.toString()).to.equal(ethers.BigNumber.from(nftVotes).add(nftVotes).add(oneEthVotes).add(oneEthVotes));
  });

  it("Should calculate combined voting power correctly after transferring SDUSD", async function () {
    
    // Mint some NFTs
    const adamNftTx = await sdnftFromAdam.buyNft({ value: nftValue });
    await adamNftTx.wait(1);
    const bobNftTx = await sdnftFromBob.buyNft({ value: nftValue });
    await bobNftTx.wait(1);
    const bobNftTx2 = await sdnftFromBob.buyNft({ value: nftValue });
    await bobNftTx2.wait(1);

    // Mint some SDUSD tokens
    const transactionHash = await adam.sendTransaction({
      to: sdusdFromDeployer.address,
      value: ethers.BigNumber.from(oneEth).mul(10) // 10 ETH
    });
    await transactionHash.wait(1);
    const adamMintTx = await sdusdFromAdam.mintSDUSD({ value: oneEth }); // 1 ETH (2,000 SDUSD)
    await adamMintTx.wait(1);
    const bobMintTx = await sdusdFromBob.mintSDUSD({ value: ethers.BigNumber.from(oneEth).add(oneEth) }); // 2 ETH (4,000 SDUSD)
    await bobMintTx.wait(1);

    await ethers.provider.send("evm_mine", []); // Mine one block to ensure snapshots are recorded.

    // Delegate votes for SDUSD and NFT
    await sdusdFromAdam.delegate(adam.address);
    await sdusdFromBob.delegate(bob.address);
    await sdnftFromAdam.delegate(adam.address);
    await sdnftFromBob.delegate(bob.address);

    await ethers.provider.send("evm_mine", []); // Mine one block to ensure snapshots are recorded
    await ethers.provider.send("evm_mine", []); // Mine one block to ensure snapshots are recorded


    // Transfer the tokens
    await sdusdFromAdam.transfer(cathy.address, ethers.BigNumber.from(oneEth).mul("2000")); // 2,000 SDUSD
    await sdusdFromBob.transfer(dana.address, ethers.BigNumber.from(oneEth).mul("4000")); // 4,000 SDUSD

    await ethers.provider.send("evm_mine", []); // Mine one block to ensure snapshots are recorded
    await ethers.provider.send("evm_mine", []); // Mine one block to ensure snapshots are recorded

    // Re-delegate votes for SDUSD
    await sdusdFromCathy.delegate(cathy.address);
    await sdusdFromDana.delegate(dana.address);

    await ethers.provider.send("evm_mine", []); // Mine one block to ensure snapshots are recorded
    await ethers.provider.send("evm_mine", []); // Mine one block to ensure snapshots are recorded
    
    const blockNumber = await ethers.provider.getBlockNumber() - 1;


    // Get voting power
    const adamVotes = await daoFromDeployer.testGetVotes(adam.address, blockNumber);
    const bobVotes = await daoFromDeployer.testGetVotes(bob.address, blockNumber);
    const cathyVotes = await daoFromDeployer.testGetVotes(cathy.address, blockNumber);
    const danaVotes = await daoFromDeployer.testGetVotes(dana.address, blockNumber);

    // adam: 1 NFT (10,000 votes)
    expect(adamVotes.toString()).to.equal(ethers.BigNumber.from(nftVotes));

    // bob: 2 NFTs (20,000 votes)
    expect(bobVotes.toString()).to.equal(ethers.BigNumber.from(nftVotes).mul("2"));

    // cathy: 2000 SDUSD
    expect(cathyVotes.toString()).to.equal(ethers.BigNumber.from(oneEthVotes));

    // dana: 4000 SDUSD
    expect(danaVotes.toString()).to.equal(ethers.BigNumber.from(oneEthVotes).mul("2"));

  });

  it("Should calculate combined voting power correctly after transferring SDNFTs", async function () {
    
    // Mint some NFTs
    const adamNftTx = await sdnftFromAdam.buyNft({ value: nftValue });
    const adamReceipt = await adamNftTx.wait(1);

    const bobNftTx = await sdnftFromBob.buyNft({ value: nftValue });
    const bobReceipt1 = await bobNftTx.wait(1);
    const bobNftTx2 = await sdnftFromBob.buyNft({ value: nftValue });
    const bobReceipt2 = await bobNftTx2.wait(1);


    // Extract the token IDs from the events
    const adamNftTokenId = adamReceipt.events.find((e) => e.event === "Transfer").args.tokenId;
    const bobNftTokenId1 = bobReceipt1.events.find((e) => e.event === "Transfer").args.tokenId;
    const bobNftTokenId2 = bobReceipt2.events.find((e) => e.event === "Transfer").args.tokenId;

    // Check initial ownership
    expect(await sdnftFromAdam.ownerOf(adamNftTokenId)).to.equal(adam.address);
    expect(await sdnftFromBob.ownerOf(bobNftTokenId1)).to.equal(bob.address);
    expect(await sdnftFromBob.ownerOf(bobNftTokenId2)).to.equal(bob.address);


    // Mint some SDUSD tokens
    const transactionHash = await adam.sendTransaction({
      to: sdusdFromDeployer.address,
      value: ethers.BigNumber.from(oneEth).mul(10) // 10 ETH
    });
    await transactionHash.wait(1);
    const adamMintTx = await sdusdFromAdam.mintSDUSD({ value: oneEth }); // 1 ETH (2,000 SDUSD)
    await adamMintTx.wait(1);
    const bobMintTx = await sdusdFromBob.mintSDUSD({ value: ethers.BigNumber.from(oneEth).add(oneEth) }); // 2 ETH (4,000 SDUSD)
    await bobMintTx.wait(1);

    await ethers.provider.send("evm_mine", []); // Mine one block to ensure snapshots are recorded.

    // Delegate votes for SDUSD and NFT
    await sdusdFromAdam.delegate(adam.address);
    await sdusdFromBob.delegate(bob.address);
    await sdnftFromAdam.delegate(adam.address);
    await sdnftFromBob.delegate(bob.address);

    await ethers.provider.send("evm_mine", []); // Mine one block to ensure snapshots are recorded
    await ethers.provider.send("evm_mine", []); // Mine one block to ensure snapshots are recorded


    // Transfer the NFTs to cathy and dana
    await sdnftFromAdam.transferFrom(adam.address, cathy.address, adamNftTokenId);
    await sdnftFromBob.transferFrom(bob.address, dana.address, bobNftTokenId1);
    await sdnftFromBob.transferFrom(bob.address, dana.address, bobNftTokenId2);

    await ethers.provider.send("evm_mine", []); // Mine one block to ensure snapshots are recorded
    await ethers.provider.send("evm_mine", []); // Mine one block to ensure snapshots are recorded

    // Re-delegate votes for SDNFT
    await sdnftFromCathy.delegate(cathy.address);
    await sdnftFromDana.delegate(dana.address);

    await ethers.provider.send("evm_mine", []); // Mine one block to ensure snapshots are recorded
    await ethers.provider.send("evm_mine", []); // Mine one block to ensure snapshots are recorded
    
    const blockNumber = await ethers.provider.getBlockNumber() - 1;


    // Get voting power
    const adamVotes = await daoFromDeployer.testGetVotes(adam.address, blockNumber);
    const bobVotes = await daoFromDeployer.testGetVotes(bob.address, blockNumber);
    const cathyVotes = await daoFromDeployer.testGetVotes(cathy.address, blockNumber);
    const danaVotes = await daoFromDeployer.testGetVotes(dana.address, blockNumber);

    // adam: 2,000 SDUSD (2,000 votes)
    expect(adamVotes.toString()).to.equal(ethers.BigNumber.from(oneEthVotes));

    // bob: 4,000 SDUSD (4,000 votes)
    expect(bobVotes.toString()).to.equal(ethers.BigNumber.from(oneEthVotes).mul("2"));

    // cathy: 1 NFT (10,000 votes)
    expect(cathyVotes.toString()).to.equal(ethers.BigNumber.from(nftVotes));

    // dana: 2 NFTs (20,000 votes)
    expect(danaVotes.toString()).to.equal(ethers.BigNumber.from(nftVotes).mul("2"));

  });

  it.only("Should allow a proposal to be created", async function () {
    const description = "Proposal: Change minting threshold";

    // Create a proposal
    const tx = await dao.propose(
      [owner.address],
      [0],
      ["0x"],
      description
    );
    const receipt = await tx.wait(1);

    // Check proposal id
    const proposalId = receipt.events[0].args.proposalId;
    expect(proposalId).to.exist;
  });

  it("Should restrict proposals in the first year", async function () {
    const currentTime = (await ethers.provider.getBlock("latest")).timestamp;

    // Simulate time to 1 year later
    await ethers.provider.send("evm_increaseTime", [365 * 24 * 60 * 60]);
    await ethers.provider.send("evm_mine");

    // Check that proposal can now be made
    const description = "Proposal: Allow minting threshold adjustment";

    await expect(
      dao.propose([owner.address], [0], ["0x"], description)
    ).not.to.be.reverted;
  });
});









// describe("Governor Flow", async () => {
//   let governor;
//   let governanceToken;
//   let timeLock;
//   let nftContract;
//   const voteWay = 1; // for
//   const reason = "I lika do da cha cha";
//   beforeEach(async () => {
//     await deployments.fixture(["all"]);
//     governor = await ethers.getContract("SDUSDAO");
//     timeLock = await ethers.getContract("TimeLock");
//     governanceToken = await ethers.getContract("SDUSD");
//     nftContract = await ethers.getContract("SDNFT");
//   })

//   it("can only be changed through governance", async () => {
//     await expect(box.store(55)).to.be.revertedWith("Ownable: caller is not the owner")
//   })

//   it("proposes, votes, waits, queues, and then executes", async () => {
//     // propose
//     const encodedFunctionCall = box.interface.encodeFunctionData(FUNC, [NEW_STORE_VALUE])
//     const proposeTx = await governor.propose(
//       [box.address],
//       [0],
//       [encodedFunctionCall],
//       PROPOSAL_DESCRIPTION
//     )

//     const proposeReceipt = await proposeTx.wait(1);
//     const proposalId = proposeReceipt.events[0].args.proposalId;
//     let proposalState = await governor.state(proposalId);
//     console.log(`Current Proposal State: ${proposalState}`);

//     await moveBlocks(VOTING_DELAY + 1)
//     // vote
//     const voteTx = await governor.castVoteWithReason(proposalId, voteWay, reason)
//     await voteTx.wait(1)
//     proposalState = await governor.state(proposalId)
//     assert.equal(proposalState.toString(), "1")
//     console.log(`Current Proposal State: ${proposalState}`)
//     await moveBlocks(VOTING_PERIOD + 1)

//     // queue & execute
//     // const descriptionHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(PROPOSAL_DESCRIPTION))
//     const descriptionHash = ethers.utils.id(PROPOSAL_DESCRIPTION)
//     const queueTx = await governor.queue([box.address], [0], [encodedFunctionCall], descriptionHash)
//     await queueTx.wait(1)
//     await moveTime(MIN_DELAY + 1)
//     await moveBlocks(1)

//     proposalState = await governor.state(proposalId)
//     console.log(`Current Proposal State: ${proposalState}`)

//     console.log("Executing...")
//     console.log
//     const exTx = await governor.execute([box.address], [0], [encodedFunctionCall], descriptionHash)
//     await exTx.wait(1)
//     console.log((await box.retrieve()).toString())
//   })
// })