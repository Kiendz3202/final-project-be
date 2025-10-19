import { Injectable } from "@nestjs/common";
import { ethers } from "ethers";

const ERC721_TRANSFER_TOPIC = ethers.utils.id("Transfer(address,address,uint256)");

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

  // Parse ERC721 Transfer logs, optionally filter by contract
  parseErc721Transfers(receipt: ethers.providers.TransactionReceipt, contract?: string) {
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
}
