// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Algo {
    // Emoji range [U+1F300..U+1F5FF]
    uint32 constant EMOJI_START = 0x1F300;
    uint32 constant EMOJI_END   = 0x1F5FF;
    uint32 constant EMOJI_SIZE  = EMOJI_END - EMOJI_START + 1;

    // Width for the ASCII text portion
    uint256 constant ASCII_WIDTH = 16;

    /**
     * @dev Generate 3 lines:
     * 
     *   1) [emojiLeft] SDNFT [emojiRight]
     *   2) [emojiLeft] No. XXXXX [emojiRight]
     *   3) [emojiLeft] 10,000 Votes [emojiRight]
     *
     * Where each ASCII text is centered within ASCII_WIDTH,
     * and emojis simply wrap around (no truncation on the final line).
     */
    function generateArt(uint256 tokenId) public pure returns (string memory) {
        // Pseudorandom seed
        uint256 rand = uint256(keccak256(abi.encodePacked("MySalt", tokenId)));

        // We’ll build the final string line by line
        bytes memory output;

        // LINE 1: "SDNFT"
        {
            // 1. Pick 2 random emojis
            (bytes memory left, uint256 rand2) = pickEmoji(rand);
            (bytes memory right, uint256 rand3) = pickEmoji(rand2);
            rand = rand3;

            // 2. Center the ASCII portion
            string memory asciiText = centerASCII("SDNFT", ASCII_WIDTH);

            // 3. Combine: leftEmoji + asciiText + rightEmoji + newline
            bytes memory line = abi.encodePacked(left, asciiText, right, "\n");
            output = abi.encodePacked(output, line);
        }

        // LINE 2: "No. XXXXX"
        {
            (bytes memory left, uint256 rand2) = pickEmoji(rand);
            (bytes memory right, uint256 rand3) = pickEmoji(rand2);
            rand = rand3;

            // ASCII text includes the tokenId
            string memory asciiText = string(
                abi.encodePacked("No. ", toString(tokenId))
            );
            asciiText = centerASCII(asciiText, ASCII_WIDTH);

            bytes memory line = abi.encodePacked(left, asciiText, right, "\n");
            output = abi.encodePacked(output, line);
        }

        // LINE 3: "10,000 Votes"
        {
            (bytes memory left, uint256 rand2) = pickEmoji(rand);
            (bytes memory right, uint256 rand3) = pickEmoji(rand2);
            rand = rand3;

            string memory asciiText = centerASCII("10,000 Votes", ASCII_WIDTH);

            bytes memory line = abi.encodePacked(left, asciiText, right, "\n");
            output = abi.encodePacked(output, line);
        }

        // Convert the final buffer to a string
        return string(output);
    }

    /**
     * @dev pickEmoji: returns a random emoji (in UTF-8 bytes) plus updated rand.
     */
    function pickEmoji(uint256 rand)
        internal
        pure
        returns (bytes memory emojiBytes, uint256 newRand)
    {
        uint256 idx = rand % EMOJI_SIZE;
        uint32 codePoint = EMOJI_START + uint32(idx);

        // Shift bits for the next call
        newRand = rand >> 16;

        // Encode to UTF-8
        emojiBytes = utf8Encode(codePoint);
    }

    /**
     * @dev centerASCII: center an ASCII string in `width`, by adding spaces on both sides.
     *      If the string is longer than `width`, we can truncate *only* ASCII text.
     *      This avoids slicing multi-byte emojis, since emojis aren’t included here.
     */
    function centerASCII(string memory text, uint256 width) internal pure returns (string memory) {
        bytes memory raw = bytes(text);
        if (raw.length >= width) {
            // If it's too long, truncate at width (safe for ASCII)
            bytes memory truncated = new bytes(width);
            for (uint256 i = 0; i < width; i++) {
                truncated[i] = raw[i];
            }
            return string(truncated);
        }

        // Otherwise, left-pad and right-pad with spaces
        uint256 totalSpaces = width - raw.length;
        uint256 leftSpaces = totalSpaces / 2;
        uint256 rightSpaces = totalSpaces - leftSpaces;

        return string(abi.encodePacked(
            repeatSpace(leftSpaces),
            text,
            repeatSpace(rightSpaces)
        ));
    }

    // Repeat N spaces
    function repeatSpace(uint256 count) internal pure returns (string memory) {
        bytes memory buffer = new bytes(count);
        for (uint256 i = 0; i < count; i++) {
            buffer[i] = 0x20; // space
        }
        return string(buffer);
    }

    /**
     * @dev UTF-8 encode a single code point (e.g., emoji).
     */
    function utf8Encode(uint32 cp) internal pure returns (bytes memory) {
        require(cp <= 0x10FFFF && (cp < 0xD800 || cp > 0xDFFF), "Invalid codepoint");

        if (cp <= 0x7F) {
            bytes memory b = new bytes(1);
            b[0] = bytes1(uint8(cp));
            return b;
        } else if (cp <= 0x7FF) {
            bytes memory b = new bytes(2);
            b[0] = bytes1(uint8(0xC0 | (cp >> 6)));
            b[1] = bytes1(uint8(0x80 | (cp & 0x3F)));
            return b;
        } else if (cp <= 0xFFFF) {
            bytes memory b = new bytes(3);
            b[0] = bytes1(uint8(0xE0 | (cp >> 12)));
            b[1] = bytes1(uint8(0x80 | ((cp >> 6) & 0x3F)));
            b[2] = bytes1(uint8(0x80 | (cp & 0x3F)));
            return b;
        } else {
            bytes memory b = new bytes(4);
            b[0] = bytes1(uint8(0xF0 | (cp >> 18)));
            b[1] = bytes1(uint8(0x80 | ((cp >> 12) & 0x3F)));
            b[2] = bytes1(uint8(0x80 | ((cp >> 6) & 0x3F)));
            b[3] = bytes1(uint8(0x80 | (cp & 0x3F)));
            return b;
        }
    }

    // Convert uint to string (decimal); use OZ Strings for production
    function toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) {
            return "0";
        }
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + (value % 10)));
            value /= 10;
        }
        return string(buffer);
    }
}
