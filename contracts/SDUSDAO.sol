// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.0.0


/** OPEN ZEPPELIN CODE */


/** Will also want to add that no proposals can be made for the first year of the contract being deployed. Because then one person can buy an NFT and change everything himself
 * And make sure that the quorum must include both the number of tokenholders and NFT holders
 * 
*/


pragma solidity ^0.8.22;

import "@openzeppelin/contracts/governance/Governor.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorSettings.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorCountingSimple.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorVotes.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorVotesQuorumFraction.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorTimelockControl.sol";
import "./SDUSD.sol";
import "./SDNFT.sol";


contract SDUSDAO is Governor, GovernorSettings, GovernorCountingSimple, GovernorVotes, GovernorVotesQuorumFraction, GovernorTimelockControl {
	
	uint256 public mintingThreshold = 4; // ethInUsd:SDUSD ratio threshold above which SDUSD still can be minted
	uint256 public degredationThreshold = 2; // ethInUsd:SDUSD ratio threshold below which SDUSD redemptions are reduced below 1:1	

	SDUSD public sdusd;
  SDNFT public votingNFT;


	constructor(
    IVotes _token,
    TimelockController _timelock,
    uint256 _quorumPercentage,
    uint256 _votingPowerThreshold,
    SDUSD _sdusd,
    SDNFT _votingNFT
  )
		Governor("SDUSDAO")
		GovernorSettings(7200, 5400, _votingPowerThreshold)
		GovernorVotes(_token)
		GovernorVotesQuorumFraction(_quorumPercentage)
		GovernorTimelockControl(_timelock)
	{
    sdusd = _sdusd;
    votingNFT = _votingNFT;
  }



  // The following functions are overrides required by Solidity.

  function votingDelay()
      public
      view
      override(Governor, GovernorSettings)
      returns (uint256)
  {
      return super.votingDelay();
  }

  function votingPeriod()
      public
      view
      override(Governor, GovernorSettings)
      returns (uint256)
  {
      return super.votingPeriod();
  }

  function quorum(uint256 blockNumber)
      public
      view
      override(Governor, GovernorVotesQuorumFraction)
      returns (uint256)
  {
      return super.quorum(blockNumber);
  }

  function state(uint256 proposalId)
      public
      view
      override(Governor, GovernorTimelockControl)
      returns (ProposalState)
  {
      return super.state(proposalId);
  }

  function proposalNeedsQueuing(uint256 proposalId)
      public
      view
      override(Governor, GovernorTimelockControl)
      returns (bool)
  {
      return super.proposalNeedsQueuing(proposalId);
  }

  function proposalThreshold()
      public
      view
      override(Governor, GovernorSettings)
      returns (uint256)
  {
      return super.proposalThreshold();
  }

  function _queueOperations(uint256 proposalId, address[] memory targets, uint256[] memory values, bytes[] memory calldatas, bytes32 descriptionHash)
      internal
      override(Governor, GovernorTimelockControl)
      returns (uint48)
  {
      return super._queueOperations(proposalId, targets, values, calldatas, descriptionHash);
  }

  function _executeOperations(uint256 proposalId, address[] memory targets, uint256[] memory values, bytes[] memory calldatas, bytes32 descriptionHash)
      internal
      override(Governor, GovernorTimelockControl)
  {
      super._executeOperations(proposalId, targets, values, calldatas, descriptionHash);
  }

  function _cancel(address[] memory targets, uint256[] memory values, bytes[] memory calldatas, bytes32 descriptionHash)
      internal
      override(Governor, GovernorTimelockControl)
      returns (uint256)
  {
      return super._cancel(targets, values, calldatas, descriptionHash);
  }

  function _executor()
      internal
      view
      override(Governor, GovernorTimelockControl)
      returns (address)
  {
      return super._executor();
  }


  /** CHAT-GPT CODE */

// Override voting power calculation to combine ERC20 and ERC721 votes
  function _getVotes(
    address account,
    uint256 blockNumber,
    bytes memory /*params*/
  ) internal view override(Governor, GovernorVotes) returns (uint256) {
    uint256 sdusdVotes = sdusd.getPastVotes(account, blockNumber) / 1e18;
    uint256 nftVotes = votingNFT.getPastVotes(account, blockNumber) * 10000; // 10,000 votes per NFT
    return sdusdVotes + nftVotes;
  }

  /* DELETE THIS FOR PRODUCTION */
  function testGetVotes(
    address account,
    uint256 blockNumber
  ) external view returns (uint256) {
      return _getVotes(account, blockNumber, "");
  }


}
