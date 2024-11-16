const networkConfigInfo = {
  31337: {
    name: "localhost",
    blockConfirmations: 1,
    baseTokenURI: "ipfs://QmeSjSinHpPnmXmspMjwiXyN6zS4E9zccariGR3jxcaWtq/" // Bored Apes URI
  },
  // Price Feed Address, values can be obtained at https://docs.chain.link/data-feeds/price-feeds/addresses
  11155111: {
    name: "sepolia",
    ethUsdPriceFeed: "0x694AA1769357215DE4FAC081bf1f309aDC325306",
    blockConfirmations: 6,
    baseTokenURI: "ipfs://QmeSjSinHpPnmXmspMjwiXyN6zS4E9zccariGR3jxcaWtq/" // Bored Apes URI
  },
  1: {
    name: "mainnet",
    ethUsdPriceFeed: "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419",
    blockConfirmations: 6
  },
  8453: {
    name: "base",
    ethUsdPriceFeed: "0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70",
    blockConfirmations: 6
  }
}



// 00-deploy-mocks.js consts
const DECIMALS = 8;
const INITIAL_PRICE = 200000000000; // $2,000 + eight 0s


// 01-deploy-sdusd.js consts
const COLLATERAL_RATIO = 400; // need it in the 100s because degredation threshold should be specifiable to the 100th
const DEGREDATION_THRESHOLD = 150; // need it in the 100s because degredation threshold should be specifiable to the 0.01 percentage
const SDUSD_NAME = "Simple Decentralized SDUSD";
const SDUSD_SYMBOL = "SDUSD";

// 02-deploy-sdnft.js consts
const SDNFT_NAME = "Simple Decentralized NFT";
const SDNFT_SYMBOL = "SDNFT";

// 03-deploy-timelock.js consts
const MIN_DELAY = 3600; // 1 hour - after a vote passes, you have 1 hour before you can enact

// 04-deploy-sdudsdao.js consts
const VOTING_DELAY = 1; // 1 Block - How many blocks till a proposal vote becomes active
const VOTING_PERIOD = 5; // blocks; 45818 is 1 week - how long the vote lasts.
const VOTING_POWER_THRESHOLD = 1000; // votes needed to submit a proposal
const QUORUM_PERCENTAGE = 4; // Need 4% of voters to pass

// 05-setup-governance-contracts.js
const ADDRESS_ZERO = "0x0000000000000000000000000000000000000000"



const developmentChains = ["hardhat", "localhost"]
const proposalsFile = "proposals.json"

// const VOTING_PERIOD = 45818 // 1 week - how long the vote lasts.

const NEW_STORE_VALUE = 77;
const FUNC = "store";
const PROPOSAL_DESCRIPTION = "Proposal #1 77 in the Box!";

module.exports = {
  networkConfigInfo,
  DECIMALS,
  INITIAL_PRICE,
  COLLATERAL_RATIO,
  DEGREDATION_THRESHOLD,
  SDUSD_NAME,
  SDUSD_SYMBOL,
  SDNFT_NAME,
  SDNFT_SYMBOL,
  developmentChains,
  proposalsFile,
  QUORUM_PERCENTAGE,
  MIN_DELAY,
  VOTING_PERIOD,
  VOTING_DELAY,
  VOTING_POWER_THRESHOLD,
  ADDRESS_ZERO,
  NEW_STORE_VALUE,
  FUNC,
  PROPOSAL_DESCRIPTION
}