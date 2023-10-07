pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/IERC721Metadata.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/IERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/IERC721Receiver.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract SDUSD_NFT is IERC1155, Ownable { // may need certain ERC1155 contract extensions
  using Counters for Counters.Counter;
  Counters.Counter private _tokenIdCounter;
  Counters.Counter private _specialTokenIdCounter; // should start at 10 (or however many tiers there are, since these will be listed after the tiers)

  struct Tier {
    string metadataURI;
  }
  
  uint256[] public tiers; // index numbers ending for each tier, something like [99, 499, 999, 4999, 9999, 49999, ...]
  uint256 currentNftPrice = 1; // in ETH, declines by 0.1 at every tier increase

  mapping(uint256 => address) private tokenApprovals;
  mapping(address => mapping(address => bool)) private operatorApprovals;


  constructor(string[] memory _metadataURIs) {
    for (uint256 i = 0; i < _metadataURIs.length; i++) {
        tiers.push(Tier({ metadataURI: _metadataURIs[i] }));
    }
  }

  function buyNFTAndContributeETH(uint256 tokenId, bool tryForSpecialNft) external payable {
    // Check if user wants to try for special NFT using LINK
    if (tryForSpecialNft) {
      require(LINK.balanceOf(address(this)) >= fee, "Not enough LINK tokens");
      require(LINK.approve(VRF_COORDINATOR, fee), "Link approval failed");

      bytes32 requestId = requestRandomness(keyHash, fee);
    }

    else {
      mintRegularNft();
    }

    // Emit event
    emit NftBought(msg.sender, tokenId);
  }


  function fulfillRandomness(bytes32 requestId, uint256 randomness) internal override {
    randomResult = randomness;
    if (randomResult % 1000 < 1) {
      // 1 in 1000 chance of fulfilling randomness (getting special NFT)
      mintSpecialNft();
    }
    else {
      mintRegularNft();
    }
  }
  

  function mintRegularNft() internal {
    uint tier = 0;

    // determine NFT tier
    for (uint256 i = 0; i < tiers.length; i++) {
      if (_tokenIdCounter < tiers[i]) {
        i = tiers.length; // break the loop
      }
      else {
        tier++; // final tier will be infinite
      }
    }

    _tokenIdCounter++;

    _mint(msg.sender, tier, 1, "");

    // add to voting power

    // mint soulbound token

  }

  function mintSpecialNft() internal {
    uint256 tokenNumber = _specialTokenIdCounter;
    _specialTokenIdCounter++;
    _mint(msg.sender, tokenNumber, 1, "");

    // add to voting power
    
    // mint soulbound token
  }




  function tokenURI(uint256 tokenId) external view returns (string memory) {
    require(tokenId < tiers.length, "Invalid token ID");
    Tier memory tier = tiers[tokenId];
    return tier.metadataURI;
  }

  function getOwnedNFTs(uint256 tierIndex) external view returns (uint256) {
    require(tierIndex < tiers.length, "Invalid tier index");
    Tier storage tier = tiers[tierIndex];
    return tier.ownedNFTs[msg.sender];
  }


  // ERC721 functions
    function approve(address to, uint256 tokenId) external override {
        require(_isApprovedOrOwner(msg.sender, tokenId), "Not approved or owner");
        tokenApprovals[tokenId] = to;
        emit Approval(ownerOf(tokenId), to, tokenId);
    }

    function getApproved(uint256 tokenId) public view override returns (address) {
        return tokenApprovals[tokenId];
    }

    function isApprovedForAll(address owner, address operator) public view override returns (bool) {
        return operatorApprovals[owner][operator];
    }

    function setApprovalForAll(address operator, bool approved) external override {
        operatorApprovals[msg.sender][operator] = approved;
        emit ApprovalForAll(msg.sender, operator, approved);
    }

    function transferFrom(address from, address to, uint256 tokenId) external override {
        require(_isApprovedOrOwner(msg.sender, tokenId), "Not approved or owner");
        require(from == ownerOf(tokenId), "Not the owner");
        require(to != address(0), "Invalid recipient");

        _transfer(from, to, tokenId);
    }

    function safeTransferFrom(address from, address to, uint256 tokenId) external override {
        safeTransferFrom(from, to, tokenId, "");
    }

    function safeTransferFrom(address from, address to, uint256 tokenId, bytes memory _data) public override {
        transferFrom(from, to, tokenId);
        require(_checkOnERC721Received(from, to, tokenId, _data), "Transfer to non-ERC721Receiver implementer");
    }

    // IERC721Enumerable functions
    function totalSupply() external view override returns (uint256) {
        return tiers.length;
    }

    function tokenByIndex(uint256 index) external view override returns (uint256) {
        require(index < tiers.length, "Index out of bounds");
        return index;
    }

    // IERC721Metadata functions
    function tokenURI(uint256 tokenId) external view override returns (string memory) {
        require(tokenId < tiers.length, "Invalid token ID");
        Tier memory tier = tiers[tokenId];
        return tier.metadataURI;
    }

    // Internal functions
    function _isApprovedOrOwner(address spender, uint256 tokenId) internal view returns (bool) {
        address owner = ownerOf(tokenId);
        return (spender == owner || getApproved(tokenId) == spender || isApprovedForAll(owner, spender));
    }

    function _transfer(address from, address to, uint256 tokenId) internal {
        Tier storage tier = tiers[tokenId];
        tier.ownedNFTs[from]--;
        tier.ownedNFTs[to]++;

        // Clear approval if any
        if (tokenApprovals[tokenId] != address(0)) {
            delete tokenApprovals[tokenId];
        }

        emit Transfer(from, to, tokenId);
    }

    function _checkOnERC721Received(address from, address to, uint256 tokenId, bytes memory _data) internal returns (bool) {
        if (to.isContract()) {
            try IERC721Receiver(to).onERC721Received(msg.sender, from, tokenId, _data) returns (bytes4 retval) {
                return retval == IERC721Receiver(to).onERC721Received.selector;
            } catch (bytes memory reason) {
                if (reason.length == 0) {
                    revert("Transfer to non-ERC721Receiver contract");
                } else {
                    assembly {
                        revert(add(32, reason), mload(reason))
                    }
                }
            }
        } else {
            return true;
        }
    }


  // Transfer/Approval functions
  function approveTransfer(uint256 tokenId, address approved) external {
    require(_isApprovedOrOwner(msg.sender, tokenId), "Not approved or owner");
    tokenApprovals[tokenId] = approved;
  }

  function transferFrom(address from, address to, uint256 tokenId) external {
    require(_isApprovedOrOwner(msg.sender, tokenId), "Not approved or owner");
    require(from == ownerOf(tokenId), "Not the owner");
    require(to != address(0), "Invalid recipient");

    _transfer(from, to, tokenId);
  }

  function _isApprovedOrOwner(address spender, uint256 tokenId) internal view returns (bool) {
    address owner = ownerOf(tokenId);
    return (spender == owner || getApproved(tokenId) == spender || isApprovedForAll(owner, spender));
  }

  function _transfer(address from, address to, uint256 tokenId) internal {
    // Update ownership mapping
    Tier storage tier = tiers[tokenId];
    tier.ownedNFTs[from]--;
    tier.ownedNFTs[to]++;

    // Clear approval if any
    if (tokenApprovals[tokenId] != address(0)) {
        delete tokenApprovals[tokenId];
    }

    // Emit transfer event
    emit Transfer(from, to, tokenId);
  }
}
