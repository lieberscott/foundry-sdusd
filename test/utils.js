/**
 * 
 * @dev only works for redemptions that fall below the degredation threshold
 * @param degredationThreshold 3 digits; 150 is a 1.50x degredation threshold
 * @param supplyOfSdusd
 * @param amountofSdusdBeingRedeemd
 * @param ethPrice dollars only; 8000 is $8,000
 * @param balanceOfEth
 * 
 */
const calculateRedemption = (degredationThreshold, supplyOfSdusd, amountOfSdusdBeingRedeemed, ethPrice, balanceOfEth) => {
  const a = (degredationThreshold / 100) * (supplyOfSdusd - amountOfSdusdBeingRedeemed);
  const b = amountOfSdusdBeingRedeemed;
  const c = -ethPrice * balanceOfEth;

  if (a == 0) {
    return amountOfSdusdBeingRedeemed / ethPrice > balanceOfEth ? balanceOfEth : amountOfSdusdBeingRedeemed / ethPrice;
  }

  // redemption is still above degredation threshold, so redeem 1:1
  if ((ethPrice * balanceOfEth - amountOfSdusdBeingRedeemed) / (supplyOfSdusd - amountOfSdusdBeingRedeemed) > (degredationThreshold / 100)) {
    return amountOfSdusdBeingRedeemed / ethPrice;
  }

  const redemptionRate = (-b + Math.sqrt((b*b) - (4 * a * c))) / (2 * a);
  return (amountOfSdusdBeingRedeemed * redemptionRate) / ethPrice;
}

const calculateMaxMintable = (ratio, ethBal, sdusdBal, ethPrice) => {

  // r = ((ethBal * price) + (maxNewEth * price)) / (sdusdBal + (maxNewEth * price))

  const maxMintableInEth = ((ethBal * ethPrice) - (ratio * sdusdBal)) / ((ratio * ethPrice) - ethPrice);
  return maxMintableInEth;
}

module.exports = {
  calculateRedemption,
  calculateMaxMintable
}