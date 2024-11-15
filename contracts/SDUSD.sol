// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import { AggregatorV3Interface } from "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";


// import sister contracts
// import { SDUSD_NFT } from "./NFTs.sol";

error SDUSD__InvalidEthPrice();
error SDUSD__ExceedsMaxAmountMintable();
error SDUSD__WithdrawalAmountLargerThanSdusdSupply();
error SDUSD__RedemptionRateCalculationFailed();
error SDUSD__NoSolutionForR();

contract SDUSD is ERC20, ERC20Permit, ERC20Votes, ReentrancyGuard, Ownable {

  // ERC-20 variables
  uint256 private s_ethCollateralRatio; // if 4, then if there's $4,000 worth of ETH, then 1,000 SDUSD can be minted
  uint256 private s_degredationThreshold; // collateralRatio at which redemptions begin to degrade (1.5)
  uint256 private s_sdusdMinted = 0;
  uint256 private constant DECIMALS = 18; // sdusd has 18 decimals

  // Chainlink variables
  AggregatorV3Interface internal immutable i_ethPriceFeed;

  // Events
  event sdusdMinted(address indexed _minter, uint256 indexed _amount);
  event MintingThresholdChanged(uint256 newValue);
	event DegredationThresholdChanged(uint256 newValue);

  constructor(
    address _ethPriceFeed,
    uint256 _ethCollateralRatio,
    uint256 _degredationThreshold
  )
  ERC20("Simple Decentralized USD", "SDUSD")
  ERC20Permit("Simple Decentralized USD")
  Ownable(msg.sender) {    
    i_ethPriceFeed = AggregatorV3Interface(_ethPriceFeed);
    s_degredationThreshold = _degredationThreshold;
    s_ethCollateralRatio = _ethCollateralRatio;
  }

  function mintSDUSD() external payable nonReentrant { // msg.value

    // Calculate the maximum amount of SDUSD that can be minted based on the collateral ratio
    (int256 maxMintable, uint256 ethPrice) = calculateMaxMintable();
    if (uint256(maxMintable) < msg.value) {
      revert SDUSD__ExceedsMaxAmountMintable();
    }

    uint256 amount = ethPrice * msg.value / 1e18;

    s_sdusdMinted += amount;
    _mint(msg.sender, amount);
    emit sdusdMinted(msg.sender, amount);
  }


  /**
   * @param _amount amount of SDUSD being redeemed
   */
  function redeemSDUSDForEth(uint256 _amount) external {
    if (s_sdusdMinted < _amount) {
      revert SDUSD__WithdrawalAmountLargerThanSdusdSupply();
    }

    // Calculate the redemption ratio
    uint256 redemption = calculateRedemption(_amount);

    if (redemption > address(this).balance) {
      revert SDUSD__WithdrawalAmountLargerThanSdusdSupply();
    }

    // Update balances and transfer ETH
    s_sdusdMinted -= _amount;
    _burn(msg.sender, _amount);
    payable(msg.sender).transfer(redemption);
  }


  // returns amountUserGetsInWei
  // _amount is amount of sdusd being redeemed
  function calculateRedemption(uint256 _amount) internal view returns (uint256) {

    // Check that current collateralization rate is above degredationThreshold

    // Get current ETH price
    uint256 ethPrice = getPrice();

    // person has all s_sdusdMinted, so give them back all the ETH (this should rarely or maybe never happen, but have to check this first because in this case it will result in division by 0 in an equation below, so we avoid that here)
    if (_amount - s_sdusdMinted == 0) {
      return _amount * 1e18 / ethPrice; // <- should equal address(this).balance in wei
    }

    // If collateral ratio is above the degredation threshold, there is no amount that can make the ending collateral ratio dip below the degredation threshold (see attached documents for proof)
    // Therefore, it can always be redeemed 1:1
    // However, instead of doing the simpler: (uint256(ethPrice) * address(this).balance) / s_sdusdMinted <- startingCollateralRatio
    // We do the slightly more complex endingCollateralRatio, because if the startingCollateralRatio  < degredationThreshold, so we can use this number without having to do almost the exact same calculation
    // This is a design choice but in the long run would result in lower gas if the collateral ratio falls below the degredation threshold
    uint256 endingCollateralRatio = ((uint256(ethPrice) * address(this).balance) - _amount) / (s_sdusdMinted - _amount);

    // if collateralRatio is above degredationThreshold, redemption can be 1:1
    if (endingCollateralRatio >= s_degredationThreshold) {
      return _amount * 1e18 / ethPrice; // should be wei amount
    }

    // We are using the following variables:
    // a - _amount (this is the input to this equation)
    // c - endingCollateralRatio (we just calculated this above)
    // d - degredationThreshold (this is a global variable)
    // u - s_sdusdMinted (this is a global variable)

    // We are using the quadratic equation: redemptionRate = (-B ± sqrt(B^2 - 4AC)) / 2A
    // Here are the following variables and how they correspond to the variables listed above (see docs for full explanation):
    // A: a
    // B: c
    // C: (u - a) * d

    // We'll define C separately, since it is more complex
    uint256 quadraticC = (s_sdusdMinted - _amount) * s_degredationThreshold;

    // We'll define the B^2 - 4AC value separately, since the number needs to be input into a separate sqrt function
    int256 quadraticSqrtValueBefore = int256((endingCollateralRatio * endingCollateralRatio) - (4 * _amount * quadraticC));

    // Sanity check: sqrt value is negative, meaning it has no real solution. This should never fire.
    if (quadraticSqrtValueBefore < 0) {
      revert SDUSD__NoSolutionForR();
    }
    
    
    uint256 quadraticSqrtValueAfter = sqrt(uint256(quadraticSqrtValueBefore));

    
    // The quadratic equation uses ±, so we calculate the equation twice, once using the + and once using the -
    // NOTE: It is possible that the + version will always be positive and the - version will always be negative, making the two caluclations redundant
    // Nevertheless, we will do the two calculations and take the larger of the two numbers between 0 and 1
    // We also have to cast everything to an int256 in case we deal with negative numbers
    int256 redemptionRatePlus = (int256(endingCollateralRatio) + int256(quadraticSqrtValueAfter)) / (2 * int256(_amount));
    int256 redemptionRateMinus = (int256(endingCollateralRatio) - int256(quadraticSqrtValueAfter)) / (2 * int256(_amount));

    // calculate redemption rate, should be between 0 and 1
    int256 redemptionRate = redemptionRatePlus > redemptionRateMinus && redemptionRatePlus > 0 && redemptionRatePlus <= 1 ? redemptionRatePlus : redemptionRateMinus > 0 && redemptionRateMinus <= 1 ? redemptionRateMinus : -1;
    
    // Sanity check. This should never fire.
    if (redemptionRate == -1) {
      revert SDUSD__RedemptionRateCalculationFailed();
    }

    return _amount * 1e18 * uint256(redemptionRate) / ethPrice; // should be wei amount
  }



  /** Utility functions */

  function getConversionRate(uint256 _ethAmount) internal view returns (uint256) {
    uint256 ethPrice = getPrice();
    uint256 ethAmountInUsd = (ethPrice * _ethAmount) / 1e18;
    return ethAmountInUsd;
  }


  /**
  * @notice this function calculates the maximum amount of SDUSD mintable (including a new deposit)
  * @dev essentially this works in the following way
  * 
  * Use the following variables:
  * b: address(this).balance
  * p: ethPrice * 1e10
  * m: maxMintable (in ETH)
  * u: sdusdMinted
  * r: ethCollateralRatio
  * 
  * You take the current balance in USD (b * p) and add the additional max amount a user would add in USD (m * p)
  * We'll factor out the `p`, divide by 1e18 and call this X: (p * (b + m)) / 1e18
  * Then you take the current amount of SDUSD minted (u) and add the max amount a user would add in USD (m * p) / 1e18
  * We'll call this Y: u + ((m * p) / 1e18)
  * Then you have X / Y = ethCollateralRatio (r)
  * When reconfigured to solve for maxAmountInUSD (m), the equation is below
  * @dev  A simple equation for plugging in values is as follows: (p * (b + m)) / (u + (m * p)) = r
  * Consider the following values, plug them into the formula and see what you get:
  * ethCollateralRatio (r): 4
  * ethPrice (p): $2,000
  * balance (b): 4 ETH
  * s_sdusdMinted (u): 0
  * The answer should be 1.3333 ETH. Consider: ($2,000 * (4 + 1.33333)) / (0 + (1.33333 * $2,000)) = 4
  * @return maxMintable maximum amount mintable in ETH including a new deposit
  * @return ethPrice ethPrice with 8 decimal places (as implemented by Chainlink)
  */
  function calculateMaxMintable() public view returns (int256, uint256) {
    // Get the latest ETH price from the Chainlink oracle
    uint256 ethPrice = getPrice();

    int256 maxAmountInEth = (int256(s_ethCollateralRatio * s_sdusdMinted * 1e18) - int256(ethPrice * address(this).balance)) / (int256(ethPrice) - int256(ethPrice * s_ethCollateralRatio));

    return (maxAmountInEth, ethPrice);

  }


  /**
   * @dev ethPrice has 8 decimal places, so we add 10 zeros to it to allow it to match msg.value, which is expressed in wei
   */
  function getPrice() internal view returns (uint256) {
    (, int256 ethPrice, , , ) = i_ethPriceFeed.latestRoundData();

    if (ethPrice <= 0) {
      revert SDUSD__InvalidEthPrice();
    }

    return uint256(ethPrice * 1e10);
  }


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


  /** The following functions can change the value of the formulas
  * Can only be done by a vote of the DAO
  */

  // Owner will be the Timelock contract
  function changeMintingThreshold(uint256 newValue) public onlyOwner {
    s_ethCollateralRatio = newValue;
    emit MintingThresholdChanged(newValue);
  }


	// Changes degredationThreshold
  function changeDegeadationThreshold(uint256 newValue) public onlyOwner {
    s_degredationThreshold = newValue;
    emit DegredationThresholdChanged(newValue);
  }


  /** Getter functions */

  function getPriceFeed() external view returns (AggregatorV3Interface) {
    return i_ethPriceFeed;
  }

  function getEthCollateralRatio() external view returns (uint256) {
    return s_ethCollateralRatio;
  }

  function getDegredationThreshold() external view returns (uint256) {
    return s_degredationThreshold;
  }

  function getSdusdMinted() external view returns (uint256) {
    return s_sdusdMinted;
  }


  fallback() external {}

  receive() external payable {}

  // The following functions are overrides required by Solidity.

    function _update(address from, address to, uint256 value)
        internal
        override(ERC20, ERC20Votes)
    {
        super._update(from, to, value);
    }

    function nonces(address owner)
        public
        view
        override(ERC20Permit, Nonces)
        returns (uint256)
    {
        return super.nonces(owner);
    }
}