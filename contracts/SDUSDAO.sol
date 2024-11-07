// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.0.0


/** OPEN ZEPPELIN CODE */


/** Will also want to add that no proposals can be made for the first year of the contract being deployed. Because then one person can buy an NFT and change everything himself */


pragma solidity ^0.8.22;

import "@openzeppelin/contracts/governance/Governor.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorSettings.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorCountingSimple.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorVotes.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorVotesQuorumFraction.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorTimelockControl.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import { SDUSD } from "./SDUSD.sol";


contract SDUSDAO is Governor, GovernorSettings, GovernorCountingSimple, GovernorVotes, GovernorVotesQuorumFraction, GovernorTimelockControl, Ownable {
	
	uint256 public mintingThreshold = 4; // ethInUsd:SDUSD ratio threshold above which SDUSD still can be minted
	uint256 public degredationThreshold = 2; // ethInUsd:SDUSD ratio threshold below which SDUSD redemptions are reduced below 1:1
	uint256 public passingPercentage = 67;
	uint256 public votingDelayBlocks = 720; // blocks (~1 day)
	uint256 public votingPeriodBlocks = 5400; // blocks (~1 week)
	uint256 public quorumPercentage = 50;
	uint256 public votingPowerThreshold = 10000; // votes needed to be eligible to submit a proposal

	address public governanceNFTAddress;

	// Events
  event MintingThresholdChanged(uint256 newValue);
	event DegredationThresholdChanged(uint256 newValue);
	
	
	constructor(IVotes _token, TimelockController _timelock, uint256 _quorumPercentage, uint256 _votingPowerThreshold, address _governanceNFTAddress)
		Governor("SDUSDAO")
		GovernorSettings(7200 /* 7200 blocks = 1 day */, 5400 /* 5400 blocks = ~1 week */, _votingPowerThreshold /* 0 */)
		GovernorVotes(_token)
		GovernorVotesQuorumFraction(_quorumPercentage /* 15 */)
		GovernorTimelockControl(_timelock)
		Ownable(msg.sender)
	{
		governanceNFTAddress = _governanceNFTAddress;
	}



	// The following functions change the variables

  // Changes the mintingThreshold
	// Can only be called by owner (which will be the Timelock contract)
  function changeMintingThreshold(uint256 newValue) public onlyOwner {
    mintingThreshold = newValue;
    emit MintingThresholdChanged(newValue);
  }


	// Changes degredationThreshold
  function changeDegeadationThreshold(uint256 newValue) public onlyOwner {
    degredationThreshold = newValue;
    emit DegredationThresholdChanged(newValue);
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

//   function _ownsNFT(address _owner) internal view returns (bool) {
//       GovernanceNFT governanceNFT = GovernanceNFT(governanceNFTAddress);
//       return governanceNFT.balanceOf(_owner) > 0;
//   }

}
