// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import { AggregatorV3Interface } from "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "@chainlink/contracts/src/v0.8/VRFConsumerBase.sol";

// import sister contracts
import { SDUSD_DAO } from "./DAO.sol";
import { SDUSD_NFT } from "./NFTs.sol";

error NotOwner();
error InvalidEthPrice();
error ExceedsMaxAmountMintable();
error WithdrawalAmountLargerThanSdusdSupply();
error RedemptionRateCalculationFailed();

contract SDUSD is ERC1155, VRFConsumerBase {

  // ERC-20 variables
  address public immutable i_owner;
  uint256 public ethCollateralRatio; // if 4, then if there's $4,000 worth of ETH, then 1,000 SDUSD can be minted
  uint256 public degredationThreshold; // collateralRatio at which redemptions begin to degrade (1.5)
  uint256 public sdusdMinted;

  // Chainlink variables
  // LINK Token address on the Ethereum mainnet
  address private LINK_TOKEN_ADDRESS = 0x514910771AF9Ca656af840dff83E8264EcF986CA;    
  // Chainlink VRF Coordinator on the Ethereum mainnet
  address private VRF_COORDINATOR = 0xcdd39647D717da55d0d7c77fe466f051156fd0a1;
  address private VRF_COORDINATOR = 0xcdd39647D717da55d0d7c77fe466f051156fd0a1;
  bytes32 internal keyHash;
  uint256 internal fee;
  AggregatorV3Interface internal ethPriceFeed;

  // NFT contract
  IERC721 public nftContract;
  uint256[] tiers; // index numbers ending for each tier, something like [99, 499, 999, 4999, 9999, 49999, ...]

  // NFT variables
  uint256 public nftIndex;
  
  // DAO Voting
  uint256 public totalVotingShares;
  mapping(address => uint256) public votingShares; // untransferrable voting shares for people who buy an NFT

  constructor(address _ethPriceOracle, uint256 _ethCollateralRatio) ERC1155("Simple Decentralized USD", "SDUSD") VRFConsumerBase (VRF_COORDINATOR, LINK_TOKEN_ADDRESS) {
    i_owner = msg.sender;
    ethCollateralRatio = _ethCollateralRatio;
    ethPriceFeed = AggregatorV3Interface(_ethPriceOracle);
    keyHash = 0x...; // Replace with the appropriate key hash
    fee = 0.1 * 10**18; // 0.1 LINK (10^18 Wei)
  }

  modifier onlyOwner() {
    if (msg.sender != i_owner) {
      revert NotOwner();
    }
    _;
  }

  function mintSDUSD() external { // msg.value

    // Get the latest ETH price from the Chainlink oracle
    int256 ethPrice = getPrice();
    if (ethPrice <= 0) {
      revert InvalidEthPrice();
    }

    uint256 amount = msg.value * ethPrice;

    // Calculate the maximum amount of SDUSD that can be minted based on the collateral ratio
    if (calculateMaxMintable(ethPrice, msg.value) < amount) {
      revert ExceedsMaxAmountMintable();
    }

    sdusdMinted += amount;
    _mint(msg.sender, amount);

  }

  /**
  * @notice this function calculates the maximum amount of SDUSD currently mintable
  * @dev Does the msg.value get added to address(this).balance BEFORE this funtion is called? I am assuming in my equation below that it does not
  * @dev this is the following equation reworked to equal newAmt:
  * (ethPrice * (address(this).balance + msg.value)) / (sdusdMinted + maxNewAmount) = ethCollateralRatio
  * Imagine the following numbers to see why this works
  * (4000 * (0 + 1)) / (0 + maxNewAmount) = 4
  * maxNewAmount is 1,000
  * @param ethPrice currentEthPrice, from Chainlink
  * @param msgValue amount of ETH being added to contract by this minting
  * @return maxMintable 
  */
  function calculateMaxMintable(uint256 _ethPrice, uint256 _msgValue) internal returns (int256) {
    return ((_ethPrice * (address(this).balance + _msgValue)) / ethCollateralRatio) - sdusdMinted;
  }



  /**
  * @notice this function calculates the maximum amount of SDUSD mintable (including a new deposit)
  * @dev essentially this works in the following way
  * You take the current balance in USD and add the additional max amount a user would add in USD, we'll call this X: (address(this).balance * ethPrice) + maxAmountInUSD
  * Then you take the current amount of SDUSD minted and add the max amount a user would add in USD, we'll call this Y: sdusdMinted + maxAmountInUSD
  * Then you have X / Y = ethCollateralRatio. This is the maximum amount of ETH a user can exchange for SDUSD at current prices
  * When reconfigured to solve for maxAmountInUSD, the equation is below. Then divide the entire thing by the ETH price to get the max amount of ETH that can currently be exchanged for SDUSD
  * @dev consider the following values, plug them into the formula and see what you get:
  * ethCollateralRatio: 4
  * ethPrice: $1,000
  * balance: 1 ETH
  * sdusdMinted: 150
  * The answer should be 0.13333 ETH or $133.33. Consider: $1,133.33 / ($133.33 + $150) = 4
  * @return maxMintable maximum amount mintable in ETH including a new deposit
  */
  function viewMaxMintable() public view returns (int256) {
    // Get the latest ETH price from the Chainlink oracle
    int256 ethPrice = getPrice();

    return ((ethCollateralRatio * sdusdMinted) - (address(this).balance * ethPrice)) / (1 - ethCollateralRatio) / ethPrice;

  }


  /**
   * @param _amount amount of SDUSD being redeemed
   */
  function redeemSDUSDForEth(uint256 _amount) external {
    if (sdusdMinted < _amount) {
      revert WithdrawalAmountLargerThanSdusdSupply();
    }

    // Calculate the redemption ratio
    uint256 redemption = calculateRedemption(_amount);

    if (redemption > address(this).balance) {
      revert WithdrawalAmountLargerThanSdusdSupply();
    }

    // Update balances and transfer ETH
    sdusdMinted -= _amount;
    _burn(msg.sender, _amount);
    payable(msg.sender).transfer(redemption);
  }


  /**
   * @dev ethPrice has 8 decimal places, so we add 10 zeros to it to allow it to match msg.value, which is expressed in wei
   */
  function getPrice() internal returns (uint256) {
    (, int256 ethPrice, , , ) = ethPriceFeed.latestRoundData();
    return uint256(ethPrice * 1e10);
  }


  // returns amountUserGetsInWei
  // _amount is amount of sdusd
  function calculateRedemption(uint256 _amount) internal returns (uint256) {

    // Check that current collateralization rate is above degredationThreshold

    // Get current ETH price
    int256 ethPrice = getPrice();

    // person has all sdusdMinted, so give them back all the ETH (this should rarely happen, but have to check this first because in this case it will result in division by 0 in an equation below, so we avoid that here)
    if (_amount - sdusdMinted == 0) {
      return _amount * 1e18 / ethPrice; // <- should equal address(this).balance in wei
    }

    // If collateral ratio is above the degredation threshold, there is no amount that can make the ending collateral ratio dip below the degredation threshold (see attached documents for proof)
    // Therefore, it can always be redeemed 1:1
    // However, instead of doing the simpler: (uint256(ethPrice) * address(this).balance) / sdusdMinted <- startingCollateralRatio
    // We do the slightly more complex endingCollateralRatio, because if the startingCollateralRatio  < degredationThreshold, so we can use this number without having to do almost the exact same calculation
    // This is a design choice but in the long run would result in lower gas if the collateral ratio falls below the degredation threshold
    uint256 endingCollateralRatio = ((uint256(ethPrice) * address(this).balance) - _amount) / (sdusdMinted - _amount);

    // if collateralRatio is above degredationThreshold, redemption can be 1:1
    if (endingCollateralRatio >= degredationThreshold) {
      return _amount * 1e18 / ethPrice; // should be wei amount
    }

    // We are using the following variables:
    // a - _amount (this is the input to this equation)
    // c - endingCollateralRatio (we just calculated this above)
    // d - degredationThreshold (this is a global variable)
    // u - sdusdMinted (this is a global variable)

    // We are using the quadratic equation: redemptionRate = (-B ± sqrt(B^2 - 4AC)) / 2A
    // Here are the following variables and how they correspond to the variables listed above (see docs for full explanation):
    // A: a
    // B: c
    // C: (u - a) * d

    // We'll define C separately, since it is more complex
    uint256 quadraticC = (sdusdMinted - _amount) * degredationThreshold;

    // We'll define the B^2 - 4AC value separately, since the number needs to be input into a separate sqrt function
    uint256 quadraticSqrtValueBefore = (endingCollateralRatio * endingCollateralRatio) - (4 * _amount * quadraticC);
    uint256 quadraticSqrtValueAfter = sqrt(quadraticSqrtValueBefore);

    
    // The quadratic equation uses ±, so we calculate the equation twice, once using the + and once using the -
    // NOTE: It is possible that the + version will always be positive and the - version will always be negative, making the two caluclations redundant
    // Nevertheless, we will do the two calculations and take the larger of the two numbers between 0 and 1
    int256 redemptionRatePlus = (-endingCollateralRatio + quadraticSqrtValueAfter) / (2 * _amount);
    int256 redemptionRateMinus = (-endingCollateralRatio - quadraticSqrtValueAfter) / (2 * _amount);

    // calculate redemption rate, should be between 0 and 1
    uint256 redemptionRate = redemptionRatePlus > redemptionRateMinus && redemptionRatePlus > 0 && redemptionRatePlus <= 1 ? redemptionRatePlus : redemptionRateMinus > 0 && redemptionRateMinus <= 1 ? redemptionRateMinus : -1;
    
    // Sanity check. This should never fire.
    if (redemptionRate == -1) {
      revert RedemptionRateCalculationFailed();
    }

    return _amount * 1e18 * uint256(redemptionRate) / ethPrice; // should be wei amount
  }

  // can only be changed by a DAO vote
  function setEthCollateralRatio(uint256 _updatedNumber) internal {}


  // calculate the sqrt for the calculateRedemption function
  // taken from Uniswap v2 code base: https://github.com/Uniswap/v2-core/blob/master/contracts/libraries/Math.sol
  function sqrt(uint y) internal pure returns (uint z) {
    if (y > 3) {
      z = y;
      uint x = y / 2 + 1;
      while (x < z) {
        z = x;
        x = (y / x + x) / 2;
      }
    } else if (y != 0) {
      z = 1;
    }
  }


//   // Function to buy NFTs and contribute ETH to the collateral
//   function buyNFTAndContributeETH(uint256 tokenId) external payable {
//     require(nftContract.ownerOf(tokenId) != address(0), "Invalid NFT");
//     require(msg.value > 0, "Must send ETH");

//     // Transfer NFT to the buyer
//     nftContract.transferFrom(owner(), msg.sender, tokenId);
//   }

//   function redeemSDUSD(uint256 amount) external onlyOwner {
//     require(amount <= sdusdMinted, "Not enough SDUSD minted");

//     sdusdMinted -= amount;
//     _burn(msg.sender, amount);

//     // Get the latest ETH price from the Chainlink oracle
//     (, int256 ethPrice, , , ) = ethPriceFeed.latestRoundData();
//     require(ethPrice > 0, "Invalid ETH price");

//     // Update SDUSD price based on new ETH price
//     uint256 sdusdPrice = uint256(ethPrice); // You can use a more sophisticated calculation here
//     _setSDUSDPrice(sdusdPrice);
//   }

//   function setEthCollateral(uint256 amount) external onlyOwner {
//     ethCollateralRatio = amount;
//   }

//   function exchangeSDUSDForETH(uint256 sdusdAmount) external {
//     require(sdusdAmount > 0, "Amount must be greater than 0");

//     // Calculate the equivalent amount of ETH based on the collateral ratio
//     uint256 ethEquivalent = sdusdAmount * 100 / ethCollateralRatio;

//     require(ethEquivalent <= ethCollateralRatio, "Not enough collateral");

//     // Update balances and transfer ETH
//     sdusdMinted -= sdusdAmount;
//     _burn(msg.sender, sdusdAmount);
//     payable(msg.sender).transfer(ethEquivalent);
//   }

//   function redeemETH(uint256 ethAmount) external {
//     // ...

//     // Get the latest ETH price from the Chainlink oracle
//     (, int256 ethPrice, , , ) = ethPriceFeed.latestRoundData();
//     require(ethPrice > 0, "Invalid ETH price");

//     // Update SDUSD price based on new ETH price
//     uint256 sdusdPrice = uint256(ethPrice); // You can use a more sophisticated calculation here
//     _setSDUSDPrice(sdusdPrice);

//     // ...
//   }

//   function _setSDUSDPrice(uint256 price) internal {
//     // Set the new SDUSD price
//     // You can use a mapping or storage variable to store the price
//     // sdusdPrice = price;
//   }
}
