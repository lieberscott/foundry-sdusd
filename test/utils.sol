// Old redemption formula from SDUSD.sol

/** Utility functions */

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
     * Finally, we divide the denomenator by 1e20 (instead of 1e18) because it will make the denomenator have 2 fewer digits, which in turn enables s_degredationThreshold to have 3 digits instead of 1
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
    // B: a
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

    // return quadraticSqrtValueAfter;
    
    // The quadratic equation uses ±, so we could calculate the equation twice, once using the + and once using the -
    // NOTE: However, the + version will always be positive and the - version will always be negative, making the two caluclations redundant
    // Therefore, we will do only the + calculation
    // Finally, we want the redemption rate to go to the ten-thousandth of a percent. Therefore we multiply the denominator not by 1e18, but by 1e14, so that we get a four-digit number and therefore four decimal points
    int256 redemptionRate = (-amount + quadraticSqrtValueAfter) / (2 * quadraticA * 1e14);

    // Sanity check. This should never fire.
    if (redemptionRate <= 0) {
      revert SDUSD__RedemptionRateCalculationFailed();
    }

    return (amount * redemptionRate * 1e14) / ethPrice; // should be wei amount
  }