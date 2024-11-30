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

module.exports = {
  calculateRedemption
}