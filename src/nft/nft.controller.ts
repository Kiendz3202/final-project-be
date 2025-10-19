import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ParseIntPipe,
  Request,
  Query,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { NFTService } from "./nft.service";
import { CreateNFTDto } from "./dto/create-nft.dto";
import { UpdateNFTDto } from "./dto/update-nft.dto";
import { TransferNFTDto } from "./dto/transfer-nft.dto";
import { ConfirmTxDto } from "./dto/confirm-tx.dto";
import { NFT } from "../common/entities";
import {
  PaginationDto,
  PaginatedResponseDto,
} from "../common/dto/pagination.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CollectionService } from "../collection/collection.service";

@ApiTags("NFTs")
@Controller("nft")
export class NFTController {
  constructor(
    private readonly nftService: NFTService,
    private readonly collectionService: CollectionService
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Create a new NFT" })
  @ApiResponse({
    status: 201,
    description: "NFT created successfully",
    type: NFT,
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 400, description: "Invalid image URL" })
  async create(
    @Body() createNFTDto: CreateNFTDto,
    @Request() req
  ): Promise<NFT> {
    return this.nftService.create(createNFTDto, req.user.id);
  }

  @Get()
  @ApiOperation({ summary: "Get all NFTs with pagination" })
  @ApiResponse({
    status: 200,
    description: "List of all NFTs with pagination",
    type: PaginatedResponseDto<NFT>,
  })
  async findAll(
    @Query() paginationDto: PaginationDto
  ): Promise<PaginatedResponseDto<NFT>> {
    return this.nftService.findAll(paginationDto);
  }

  @Get("collection/:collectionId")
  @ApiOperation({ summary: "Get NFTs by collection ID with pagination" })
  @ApiResponse({
    status: 200,
    description: "List of NFTs in collection with pagination",
    type: PaginatedResponseDto<NFT>,
  })
  async findByCollection(
    @Param("collectionId", ParseIntPipe) collectionId: number,
    @Query() paginationDto: PaginationDto
  ): Promise<PaginatedResponseDto<NFT>> {
    return this.nftService.findByCollection(collectionId, paginationDto);
  }

  @Get("for-sale")
  @ApiOperation({ summary: "Get NFTs for sale" })
  @ApiResponse({
    status: 200,
    description: "List of NFTs for sale",
    type: [NFT],
  })
  async findForSale(): Promise<NFT[]> {
    return this.nftService.findForSale();
  }

  @Get("my-nfts")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get current user's NFTs" })
  @ApiResponse({ status: 200, description: "List of user's NFTs", type: [NFT] })
  async findMyNFTs(@Request() req): Promise<NFT[]> {
    return this.nftService.findByOwner(req.user.id);
  }

  @Get("history/sales")
  @ApiOperation({ summary: "Get all sale transactions" })
  @ApiResponse({ status: 200, description: "List of all sale transactions" })
  async getSaleHistory() {
    return this.nftService.getSaleHistory();
  }

  @Get("my-history")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get current user's transaction history" })
  @ApiResponse({ status: 200, description: "User's transaction history" })
  async getUserHistory(@Request() req) {
    return this.nftService.getUserTransactionHistory(req.user.id);
  }

  @Get("collections-for-creation")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get collections where user can add NFTs" })
  @ApiResponse({
    status: 200,
    description: "List of collections where user can add NFTs",
  })
  async getCollectionsForCreation(@Request() req) {
    return this.collectionService.findMyCollectionsForNFT(req.user.id);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get NFT by ID" })
  @ApiResponse({ status: 200, description: "NFT found", type: NFT })
  @ApiResponse({ status: 404, description: "NFT not found" })
  async findOne(@Param("id", ParseIntPipe) id: number): Promise<NFT> {
    return this.nftService.findOne(id);
  }

  @Patch(":id")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update NFT by ID" })
  @ApiResponse({
    status: 200,
    description: "NFT updated successfully",
    type: NFT,
  })
  @ApiResponse({ status: 404, description: "NFT not found" })
  @ApiResponse({ status: 403, description: "Forbidden - not owner" })
  async update(
    @Param("id", ParseIntPipe) id: number,
    @Body() updateNFTDto: UpdateNFTDto,
    @Request() req
  ): Promise<NFT> {
    return this.nftService.update(id, updateNFTDto, req.user.id);
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Delete NFT by ID" })
  @ApiResponse({ status: 200, description: "NFT deleted successfully" })
  @ApiResponse({ status: 404, description: "NFT not found" })
  @ApiResponse({ status: 403, description: "Forbidden - not owner" })
  async remove(
    @Param("id", ParseIntPipe) id: number,
    @Request() req
  ): Promise<{ message: string }> {
    await this.nftService.remove(id, req.user.id);
    return { message: "NFT deleted successfully" };
  }

  @Get(":id/history")
  @ApiOperation({ summary: "Get NFT transaction history" })
  @ApiResponse({ status: 200, description: "NFT transaction history" })
  @ApiResponse({ status: 404, description: "NFT not found" })
  async getNFTHistory(@Param("id", ParseIntPipe) id: number) {
    return this.nftService.getNFTHistory(id);
  }

  @Post(":id/transfer")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Buy/Transfer NFT from another user" })
  @ApiResponse({ status: 200, description: "NFT purchased successfully" })
  @ApiResponse({
    status: 403,
    description: "Forbidden - not owner or NFT not for sale",
  })
  @ApiResponse({ status: 404, description: "NFT or user not found" })
  async transferNFT(
    @Param("id", ParseIntPipe) id: number,
    @Body() transferData: TransferNFTDto,
    @Request() req
  ) {
    await this.nftService.transferNFT(
      id,
      req.user.id,
      transferData.toUserId,
      transferData.transactionHash
    );
    return { message: "NFT purchased successfully" };
  }

  @Post(":id/confirm-transfer")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Confirm on-chain transfer and sync DB" })
  @ApiResponse({ status: 200, description: "Transfer confirmed and synced" })
  async confirmTransfer(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: ConfirmTxDto,
    @Request() req
  ) {
    await this.nftService.confirmTransfer(id, req.user.id, body.txHash);
    return { message: "Transfer confirmed" };
  }

  @Post(":id/confirm-mint")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Confirm on-chain mint and sync DB" })
  @ApiResponse({ status: 200, description: "Mint confirmed and synced" })
  async confirmMint(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: ConfirmTxDto,
    @Request() req
  ) {
    await this.nftService.confirmMint(id, req.user.id, body.txHash);
    return { message: "Mint confirmed" };
  }
}
