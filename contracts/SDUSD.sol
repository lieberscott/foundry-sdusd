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
error SDUSD__WithdrawalAmountLargerThanUserBalance();
error SDUSD__RedemptionRateCalculationFailed();
error SDUSD__NoSolutionForR();
error SDUSD__OutOfRange();

contract SDUSD is ERC20, ERC20Permit, ERC20Votes, ReentrancyGuard, Ownable {

  // ERC-20 variables
  uint256 private s_ethCollateralRatio; // if 4, then if there's $4,000 worth of ETH, then 1,000 SDUSD can be minted
  uint256 private s_degredationThreshold; // collateralRatio at which redemptions begin to degrade (1.5)

  // Chainlink variables
  AggregatorV3Interface internal immutable i_ethPriceFeed;

  // Events
  event sdusdMinted(address indexed _minter, uint256 indexed _amount);
  event MintingThresholdChanged(uint256 newValue);
	event DegredationThresholdChanged(uint256 newValue);
  // event DebugValues(
  //   uint256 maxAmountInEth,
  //   uint256 msgValue,
  //   uint256 ethBalance
  // );

  constructor(
    address _ethPriceFeed,
    uint256 _ethCollateralRatio,
    uint256 _degredationThreshold,
    string memory _sdusdName,
    string memory _sdusdSymbol
  )
  ERC20(_sdusdName, _sdusdSymbol)
  ERC20Permit(_sdusdName)
  Ownable(msg.sender) {    
    i_ethPriceFeed = AggregatorV3Interface(_ethPriceFeed);
    s_degredationThreshold = _degredationThreshold;
    s_ethCollateralRatio = _ethCollateralRatio;
  }

  function mintSDUSD() external payable nonReentrant () { // msg.value

    // Calculate the maximum amount of SDUSD that can be minted based on the collateral ratio
    uint256 adjustedBalance = address(this).balance - msg.value; // Must use adjustedBalance because the calculation needs the ETH balance PRIOR to the just-sent msg.value
    (uint256 maxMintable, uint256 ethPrice) = calculateMaxMintable(adjustedBalance);

    // emit DebugValues(maxMintable, msg.value, adjustedBalance);

    if (maxMintable < msg.value) {
      revert SDUSD__ExceedsMaxAmountMintable();
    }


    uint256 amount = ethPrice * msg.value / 1e18;

    _mint(msg.sender, amount);
    emit sdusdMinted(msg.sender, amount);
  }


  /**
   * @param _amount amount of SDUSD being redeemed
   */
  function redeemSdusdForEth(uint256 _amount) external {

    if (balanceOf(msg.sender) < _amount) {
      revert SDUSD__WithdrawalAmountLargerThanUserBalance();
    }
    if (totalSupply() < _amount) {
      revert SDUSD__WithdrawalAmountLargerThanSdusdSupply();
    }

    // Calculate the redemption ratio
    int256 _redemption = calculateRedemption(_amount);

    uint256 redemption = uint256(_redemption);

    // Update balances and transfer ETH
    _burn(msg.sender, _amount);

    if (redemption > address(this).balance) {
      // ETH price has dropped so much that the redemption is higher than the ETH balance of the contract, so simply return the entire balance
      payable(msg.sender).transfer(address(this).balance);
    }
    else {
      payable(msg.sender).transfer(redemption);
    }
  }


  // returns amountUserGetsInWei
  // _amount is amount of sdusd being redeemed
  function calculateRedemption(uint256 _amount) public view returns (int256) {

    // Get current ETH price
    uint256 _ethPrice = getPrice();

    /**
     * 
     * We're going to use the following scenario to walk through how this formula works
     * The scenario is that the price of ETH has massively dropped from $2,000, when the max acmount of SDUSD was minted out ($2666.66), to $100 per ETH
     * And there is a user redeeming 2,000 SDUSD
     * 
     * So:
     * amount :               2000 * 1e18
     * ethPrice :             100 * 1e18
     * balance :              5.333 * 1e18 (ethBalance in the SDUSD contract)
     * totalSupply :          2666.66 * 1e18
     * degredationThreshold:  150 (1.5 * 1e2)
     * 
     */

    // Cast everything to an int256
    int256 amount = int256(_amount);
    int256 ethPrice = int256(_ethPrice);
    int256 balance = int256(address(this).balance);
    int256 totalSupply = int256(totalSupply());
    int256 degredationThreshold = int256(s_degredationThreshold);


    // person has all sdusdMinted, so give them back all the ETH (this should rarely or maybe never happen, but have to check this first because in this case it will result in division by 0 in an equation below, so we avoid that here)
    if (totalSupply - amount <= 0) {
      // if the max amount of SDUSD has been minted, then this should equal address(this).balance in wei
      // but if the max amount of SDUSD has not been minted, this would be less than address(this).balance
      return amount * 1e18 / ethPrice;
    }

    /**
     * 
     * If startingCollateralRatio is above the degredation threshold, there is no amount that can make the ending collateral ratio dip below the degredation threshold (see attached documents for proof)
     * Therefore, it can always be redeemed 1:1
     * However, instead of doing the simpler: ((ethPrice) * address(this).balance) / totalSupply() <- startingCollateralRatio
     * We do the slightly more complex endingCollateralRatio, because if the startingCollateralRatio < degredationThreshold, we can use this number without having to do almost the exact same calculation
     * This is a design choice but in the long run would result in lower gas if the collateral ratio falls below the degredation threshold
     * Finally, we divide by 1e20 (instead of 1e18) because s_degredationThreshold has 2 decimal points, so we retain those decimal points by dividing by 1e20
     */
    int256 endingCollateralRatio = ((ethPrice * balance / 1e36) - (amount / 1e18)) / ((totalSupply - amount) / 1e20);

    // if collateralRatio is above degredationThreshold, redemption can be 1:1
    if (endingCollateralRatio >= degredationThreshold) {
      return amount * 1e18 / ethPrice; // should be wei amount
    }
    // We are using the following variables:
    // a - amount (amount being redeemed, this is the argument to this function)
    // p - ethPrice
    // b - ethBalance in SDUSD contract
    // d - degredationThreshold (this is a global variable)
    // u - totalSupply

    // We are using the quadratic equation: redemptionRate = (-B ± sqrt(B^2 - 4AC)) / 2A
    // Here are the following variables and how they correspond to the variables listed above (see docs for full explanation):
    // A: d * (u - a)
    // B: u
    // C: (-p * b)

    // We'll define A separately, since it is a little complex
    int256 quadraticA = (degredationThreshold * (totalSupply - amount)) / 1e20;

    // We'll define the B^2 - 4AC value separately, since the number needs to be input into a separate sqrt function
    int256 quadraticSqrtValueBefore = (amount * amount / 1e36) - (4 * quadraticA * ((-ethPrice * balance) / 1e36));
    // 6129868

    // Sanity check: sqrt value is negative, meaning it has no real solution. This should never fire.
    if (quadraticSqrtValueBefore < 0) {
      revert SDUSD__NoSolutionForR();
    }

    uint256 quadraticSqrtValueBefore_new = uint256(quadraticSqrtValueBefore);
    
    uint256 sqrtResponse = sqrt(quadraticSqrtValueBefore_new);

    int256 quadraticSqrtValueAfter = int256(sqrtResponse * 1e18);
    
    // The quadratic equation uses ±, so we could calculate the equation twice, once using the + and once using the -
    // NOTE: However, the + version will always be positive and the - version will always be negative, making the two caluclations redundant
    // Therefore, we will do only the + calculation
    // Finally, we want the redemption rate to go to the ten-thousandth of a percent. Therefore we multiply the denominator not by 1e18, but by 1e14, so that we get a four-digit number and therefore four decimal points
    int256 redemptionRate = (-amount + quadraticSqrtValueAfter) / (2 * quadraticA * 1e14);
    // 2377

    // Sanity check. This should never fire.
    if (redemptionRate <= 0) {
      revert SDUSD__RedemptionRateCalculationFailed();
    }

    return (amount * redemptionRate * 1e14) / ethPrice; // should be wei amount
  }



  /** Utility functions */

  /**
  * @notice this function calculates the maximum amount of SDUSD mintable (including a new deposit)
  * @dev essentially this works in the following way
  * 
  * Use the following variables:
  * b: address(this).balance
  * p: ethPrice * 1e10
  * m: maxMintable (in ETH)
  * u: totalSupply()
  * r: s_ethCollateralRatio
  * 
  * You take the current balance in USD (b * p) and add the additional max amount a user would add in USD (m * p)
  * We'll factor out the `p`, divide by 1e18 and call this X: (p * (b + m)) / 1e18
  * Then you take the current amount of SDUSD minted (u) and add the max amount a user would add in USD (m * p) / 1e18
  * We'll call this Y: u + ((m * p) / 1e18)
  * Then you have X / Y = ethCollateralRatio (r)
  * But r must be divided by 100, because s_ethCollateralRatio is 3 digits long so it can be set to the hundredth decimal (3.33, for example), so if it's 4, then s_ethCollateralRatio is 400
  * When reconfigured to solve for maxAmountInUSD (m), the equation is below
  * @dev  A simple equation for plugging in values is as follows: (p * (b + m)) / (u + (m * p)) = r
  * Consider the following values, plug them into the formula and see what you get:
  * ethCollateralRatio (r): 4
  * ethPrice (p): $2,000
  * balance (b): 4 ETH
  * totalSupply() (u): 0
  * The answer should be 1.3333 ETH. Consider: ($2,000 * (4 + 1.33333)) / (0 + (1.33333 * $2,000)) = 4
  * @return maxMintable maximum amount mintable in ETH including a new deposit
  * @return ethPrice ethPrice with 8 decimal places (as implemented by Chainlink)
  */
  function calculateMaxMintable(uint256 _adjustedBalance) public view returns (uint256, uint256) {
    // Get the latest ETH price from the Chainlink oracle
    uint256 ethPrice = getPrice();

    uint256 maxAmountInEth = ((100 * ethPrice * _adjustedBalance) - (s_ethCollateralRatio * totalSupply())) / (ethPrice * (s_ethCollateralRatio - 100));
    
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
    if (newValue <= 100 || newValue > 999) {
      revert SDUSD__OutOfRange();
    }
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