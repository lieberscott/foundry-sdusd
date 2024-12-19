/**
 * 
 * Inputs:
 * degredationThreshold: 3 digits; 150 is a 1.50x degredation threshold
 * supplyOfSdusd: 18 digits
 * amountofSdusdBeingRedeemd: 18 digits
 * ethPrice: dollars only; 8000 is $8,000
 * balanceOfEth: 18 digits
 * 
 */


const calculateRedemption = (degredationThreshold, supplyOfSdusd, amountOfSdusdBeingRedeemed, ethPrice, balanceOfEth) => {
  const a = degredationThreshold * (supplyOfSdusd - amountOfSdusdBeingRedeemed);
  const b = supplyOfSdusd;
  const c = -ethPrice * balanceOfEth;

  if (a == 0) {
    return amountOfSdusdBeingRedeemed / ethPrice;
  }

  const redemptionRate = (-b + Math.sqrt((b*b) - 4 * a * c)) / (2 * a);
  return (amountOfSdusdBeingRedeemed * redemptionRate) / ethPrice;
}

const calculateMaxMintable = (ratio, ethBal, sdusdBal, ethPrice) => {

  // r = ((ethBal * price) + (maxNewEth * price)) / (sdusdBal + (maxNewEth * price))

  const maxMintableInEth = ((ethBal * ethPrice) - (ratio * sdusdBal)) / ((ratio * ethPrice) - ethPrice);
  return maxMintableInEth;
}

// maxAmountInEth = ((100 * ethPrice * _adjustedBalance) - (s_ethCollateralRatio * totalSupply())) / (ethPrice * (s_ethCollateralRatio - 100));

module.exports = {
  calculateRedemption,
  calculateMaxMintable
}