import { Injectable } from "@nestjs/common";
import { ethers } from "ethers";

const ERC721_TRANSFER_TOPIC = ethers.utils.id(
  "Transfer(address,address,uint256)"
);

@Injectable()
export class BlockchainService {
  private provider: ethers.providers.JsonRpcProvider;

  constructor() {
    const rpcUrl =
      process.env.BSC_TESTNET_RPC_URL ||
      "https://data-seed-prebsc-1-s1.binance.org:8545/";
    this.provider = new ethers.providers.JsonRpcProvider(rpcUrl, 97);
  }

  async getReceipt(txHash: string) {
    return this.provider.getTransactionReceipt(txHash);
  }

  async getBlockTimestamp(blockNumber: number): Promise<Date> {
    const block = await this.provider.getBlock(blockNumber);
    return new Date(block.timestamp * 1000);
  }

  // Parse ERC721 Transfer logs, optionally filter by contract
  parseErc721Transfers(
    receipt: ethers.providers.TransactionReceipt,
    contract?: string
  ) {
    const logs = (receipt.logs || []).filter(
      (l) =>
        (!contract || l.address.toLowerCase() === contract.toLowerCase()) &&
        l.topics?.[0] === ERC721_TRANSFER_TOPIC
    );

    return logs.map((log) => {
      const from = ethers.utils.getAddress("0x" + log.topics[1].slice(26));
      const to = ethers.utils.getAddress("0x" + log.topics[2].slice(26));
      const tokenId = ethers.BigNumber.from(log.topics[3]).toString();
      return { address: log.address, from, to, tokenId };
    });
  }

  // Parse NFTListed event from marketplace
  parseNFTListedEvent(
    receipt: ethers.providers.TransactionReceipt,
    marketplaceAddress: string
  ) {
    const marketplaceInterface = new ethers.utils.Interface([
      "event NFTListed(address indexed seller, address indexed nft, uint256 indexed tokenId, uint256 price)",
    ]);
    const NFTListedTopic = marketplaceInterface.getEventTopic("NFTListed");

    const log = receipt.logs.find(
      (l) =>
        l.address.toLowerCase() === marketplaceAddress.toLowerCase() &&
        l.topics?.[0] === NFTListedTopic
    );

    if (!log) return null;

    const decoded = marketplaceInterface.decodeEventLog(
      "NFTListed",
      log.data,
      log.topics
    );
    return {
      seller: decoded.seller,
      nft: decoded.nft,
      tokenId: decoded.tokenId.toString(),
      price: decoded.price.toString(),
    };
  }

  // Parse NFTUnlisted event from marketplace
  parseNFTUnlistedEvent(
    receipt: ethers.providers.TransactionReceipt,
    marketplaceAddress: string
  ) {
    const marketplaceInterface = new ethers.utils.Interface([
      "event NFTUnlisted(address indexed seller, address indexed nft, uint256 indexed tokenId)",
    ]);
    const NFTUnlistedTopic = marketplaceInterface.getEventTopic("NFTUnlisted");

    const log = receipt.logs.find(
      (l) =>
        l.address.toLowerCase() === marketplaceAddress.toLowerCase() &&
        l.topics?.[0] === NFTUnlistedTopic
    );

    if (!log) return null;

    const decoded = marketplaceInterface.decodeEventLog(
      "NFTUnlisted",
      log.data,
      log.topics
    );
    return {
      seller: decoded.seller,
      nft: decoded.nft,
      tokenId: decoded.tokenId.toString(),
    };
  }

  // Parse NFTPurchased event from marketplace
  parseNFTPurchasedEvent(
    receipt: ethers.providers.TransactionReceipt,
    marketplaceAddress: string
  ) {
    const marketplaceInterface = new ethers.utils.Interface([
      "event NFTPurchased(address indexed buyer, address indexed seller, address indexed nft, uint256 tokenId, uint256 price, address royaltyReceiver, uint256 royaltyAmount, uint256 platformFee)",
    ]);
    const NFTPurchasedTopic =
      marketplaceInterface.getEventTopic("NFTPurchased");

    const log = receipt.logs.find(
      (l) =>
        l.address.toLowerCase() === marketplaceAddress.toLowerCase() &&
        l.topics?.[0] === NFTPurchasedTopic
    );

    if (!log) return null;

    const decoded = marketplaceInterface.decodeEventLog(
      "NFTPurchased",
      log.data,
      log.topics
    );
    return {
      buyer: decoded.buyer,
      seller: decoded.seller,
      nft: decoded.nft,
      tokenId: decoded.tokenId.toString(),
      price: decoded.price.toString(),
      royaltyReceiver: decoded.royaltyReceiver,
      royaltyAmount: decoded.royaltyAmount.toString(),
      platformFee: decoded.platformFee.toString(),
    };
  }

  /**
   * Get listing info directly from marketplace contract
   */
  async getListingFromContract(
    marketplaceAddress: string,
    nftAddress: string,
    tokenId: string
  ): Promise<{ seller: string; price: string; isActive: boolean } | null> {
    try {
      const marketplaceInterface = new ethers.utils.Interface([
        "function getListing(address nft, uint256 tokenId) external view returns (tuple(address seller, uint256 price, bool isActive))",
      ]);

      const contract = new ethers.Contract(
        marketplaceAddress,
        marketplaceInterface,
        this.provider
      );

      const listing = await contract.getListing(nftAddress, tokenId);
      return {
        seller: listing.seller,
        price: listing.price.toString(),
        isActive: listing.isActive,
      };
    } catch (error) {
      console.error("Failed to get listing from contract:", error);
      return null;
    }
  }
}
