// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Votes.sol";

contract SDNFT is ERC721, EIP712, ERC721Votes { // may need certain ERC1155 contract extensions

  string public baseTokenURI;
  uint256 private price = 100000000000000000; // 0.1 ETH
  uint256 public counter = 0; // NFTs 10000+

  address sdusdTokenAddress;

  constructor(
    string memory _baseTokenURI,
    address _sdusdTokenAddress,
    string memory _nftName,
    string memory _nftSymbol
  )
    ERC721(_nftName, _nftSymbol)
    EIP712(_nftName, "1")
  {
    baseTokenURI = _baseTokenURI;
    sdusdTokenAddress = _sdusdTokenAddress;
  }


  function buyRegularNft() external payable {
    require(msg.value >= price, "Not enough ETH");
    require(counter < 10000, "Sold out");
    
    uint256 newItemId = counter;
    _safeMint(msg.sender, newItemId);
    counter++;

    // add to voting power

    // mint soulbound token
  }


  function getPrice() external view returns (uint256) {
    return price;
  }

  function getIndex() external view returns (uint256) {
    return counter;
  }

  function _baseURI() internal view override returns (string memory) {
    return baseTokenURI;
  }


  receive() external payable {
    (bool success, ) = address(sdusdTokenAddress).call{value: msg.value}("");
    require(success, "Failed to forward ETH to SDUSD contract");
  }

  function forwardETHToSDUSD() internal {
    // If for some reason there is ETH that isn't transferred to SDUSD contract,
    // this contract allows anyone to transfer the ETH Balance of this contract to the SDUSD contract
    (bool success, ) = address(sdusdTokenAddress).call{value: address(this).balance}("");
    require(success, "Failed to forward ETH to SDUSD contract");
  }


  // Override transfer functions to restrict NON_TRANSFERABLE_NFT_ID
  // function safeTransferFrom(
  //     address from,
  //     address to,
  //     uint256 id,
  //     uint256 amount,
  //     bytes memory data
  // ) public override {
  //     require(id != NON_TRANSFERABLE_NFT_ID, "Non-transferable NFT cannot be transferred");
  //     super.safeTransferFrom(from, to, id, amount, data);
  // }


  // The following functions are overrides required by Solidity.

    function _update(address to, uint256 tokenId, address auth)
        internal
        override(ERC721, ERC721Votes)
        returns (address)
    {
        return super._update(to, tokenId, auth);
    }

    function _increaseBalance(address account, uint128 value)
        internal
        override(ERC721, ERC721Votes)
    {
        super._increaseBalance(account, value);
    }

}
