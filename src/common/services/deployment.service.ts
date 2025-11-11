import { Injectable } from "@nestjs/common";
import deploymentInfoRaw from "@/abi/deployment-info.json";

interface DeploymentInfo {
  network: string;
  chainId: number;
  deployer: string;
  timestamp: string;
  contracts: {
    NFTMarketplace: string;
    SampleCollection?: string;
  };
}

@Injectable()
export class DeploymentService {
  private readonly deploymentInfo: DeploymentInfo;

  constructor() {
    // TypeScript compiles JSON imports as default exports
    // Handle both cases: direct object or wrapped in default
    let deploymentInfo: any = deploymentInfoRaw;

    // If it's wrapped in a default export (CommonJS compilation)
    if (
      deploymentInfo &&
      typeof deploymentInfo === "object" &&
      "default" in deploymentInfo
    ) {
      deploymentInfo = deploymentInfo.default;
    }

    // Validate deployment info on initialization
    if (!deploymentInfo || typeof deploymentInfo !== "object") {
      throw new Error(
        `Invalid deployment-info.json: import failed or returned invalid type. Got: ${typeof deploymentInfo}`
      );
    }

    if (!deploymentInfo.chainId || !deploymentInfo.contracts?.NFTMarketplace) {
      throw new Error(
        `Invalid deployment-info.json: missing required fields. chainId: ${deploymentInfo.chainId}, NFTMarketplace: ${deploymentInfo.contracts?.NFTMarketplace}, full object keys: ${Object.keys(deploymentInfo).join(", ")}`
      );
    }
    this.deploymentInfo = deploymentInfo as DeploymentInfo;
  }

  /**
   * Get deployment info
   * @returns DeploymentInfo object
   */
  getDeploymentInfo(): DeploymentInfo {
    return this.deploymentInfo;
  }

  /**
   * Get marketplace contract address
   */
  getMarketplaceAddress(): string {
    const info = this.getDeploymentInfo();
    const address = info.contracts.NFTMarketplace;
    if (!address) {
      throw new Error("Marketplace address not found in deployment-info.json");
    }
    return address;
  }

  /**
   * Get expected chain ID
   */
  getChainId(): number {
    return this.getDeploymentInfo().chainId;
  }
}
