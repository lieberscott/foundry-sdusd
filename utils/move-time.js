import { network } from "hardhat"

const moveTime = async(amount) => {
  console.log("Moving blocks...")
  await network.provider.send("evm_increaseTime", [amount])

  console.log(`Moved forward in time ${amount} seconds`)
}

module.exports = { moveTime };