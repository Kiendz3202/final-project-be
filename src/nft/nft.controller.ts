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
import { ConfirmTxDto } from "./dto/confirm-tx.dto";
import { ListNFTDto } from "./dto/list-nft.dto";
import { ConfirmPurchaseDto } from "./dto/confirm-purchase.dto";
import { NFT, NFTEvent, NFTEventType } from "@/common/entities";
import { GetCollectionEventsDto } from "./dto/get-collection-events.dto";
import { GetNFTEventsDto } from "./dto/get-nft-events.dto";
import {
  PaginationDto,
  PaginatedResponseDto,
} from "@/common/dto/pagination.dto";
import { JwtAuthGuard } from "@/auth/guards/jwt-auth.guard";
import { CollectionService } from "@/collection/collection.service";

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
  @ApiOperation({ summary: "Get all NFTs with pagination and filters" })
  @ApiResponse({
    status: 200,
    description: "List of all NFTs with pagination",
    type: PaginatedResponseDto<NFT>,
  })
  async findAll(
    @Query()
    paginationDto: PaginationDto & {
      isForSale?: boolean;
      ownerId?: number;
      minPrice?: number;
      maxPrice?: number;
      sort?: "priceAsc" | "priceDesc";
    }
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
    @Query()
    paginationDto: PaginationDto & {
      isForSale?: boolean;
      ownerId?: number;
      minPrice?: number;
      maxPrice?: number;
      sort?: "priceAsc" | "priceDesc";
    }
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

  @Get("user/:userId")
  @ApiOperation({ summary: "Get NFTs by user ID (public)" })
  @ApiResponse({
    status: 200,
    description: "List of user's NFTs with pagination",
    type: PaginatedResponseDto<NFT>,
  })
  async findByUser(
    @Param("userId", ParseIntPipe) userId: number,
    @Query() paginationDto: PaginationDto
  ): Promise<PaginatedResponseDto<NFT>> {
    return this.nftService.findByOwnerWithPagination(userId, paginationDto);
  }

  @Get("my-nfts")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get current user's NFTs with pagination" })
  @ApiResponse({
    status: 200,
    description: "List of user's NFTs with pagination",
    type: PaginatedResponseDto<NFT>,
  })
  async findMyNFTs(
    @Request() req,
    @Query() paginationDto: PaginationDto
  ): Promise<PaginatedResponseDto<NFT>> {
    return this.nftService.findByOwnerWithPagination(
      req.user.id,
      paginationDto
    );
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

  @Post(":id/list")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Confirm on-chain listing and sync DB" })
  @ApiResponse({ status: 200, description: "Listing confirmed and synced" })
  async confirmList(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: ListNFTDto & ConfirmTxDto,
    @Request() req
  ) {
    await this.nftService.confirmList(id, req.user.id, body.txHash, body.price);
    return { message: "Listing confirmed" };
  }

  @Post(":id/unlist")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Confirm on-chain unlisting and sync DB" })
  @ApiResponse({ status: 200, description: "Unlisting confirmed and synced" })
  async confirmUnlist(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: ConfirmTxDto,
    @Request() req
  ) {
    await this.nftService.confirmUnlist(id, req.user.id, body.txHash);
    return { message: "Unlisting confirmed" };
  }

  @Post(":id/sync-listing")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Sync listing status from blockchain to database",
    description:
      "Useful when SC and DB are out of sync. Checks SC state and updates DB accordingly.",
  })
  @ApiResponse({
    status: 200,
    description: "Listing status synced successfully",
  })
  async syncListingStatus(
    @Param("id", ParseIntPipe) id: number,
    @Request() req
  ) {
    const result = await this.nftService.syncListingStatus(id, req.user.id);
    return {
      message: "Listing status synced",
      isListed: result.isListed,
      price: result.price,
    };
  }

  @Post(":id/confirm-purchase")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Confirm NFT purchase from on-chain transaction",
    description: "Updates NFT owner and marks NFT as unlisted after purchase.",
  })
  @ApiResponse({
    status: 200,
    description: "Purchase confirmed successfully",
  })
  @ApiResponse({
    status: 400,
    description: "Invalid transaction or NFT not minted",
  })
  @ApiResponse({
    status: 403,
    description: "Transaction receipt does not match expected purchase",
  })
  async confirmPurchase(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: ConfirmPurchaseDto,
    @Request() req
  ) {
    await this.nftService.confirmPurchase(id, req.user.id, body.txHash);
    return { message: "Purchase confirmed successfully" };
  }

  @Get(":id/events")
  @ApiOperation({ summary: "Get NFT events by NFT ID" })
  @ApiResponse({
    status: 200,
    description: "List of NFT events with pagination",
    type: PaginatedResponseDto<NFTEvent>,
  })
  @ApiResponse({ status: 404, description: "NFT not found" })
  async getNFTEvents(
    @Param("id", ParseIntPipe) id: number,
    @Query() query: GetNFTEventsDto
  ): Promise<PaginatedResponseDto<NFTEvent>> {
    // Verify NFT exists
    await this.nftService.findOne(id);
    const { eventType, ...pagination } = query;
    return this.nftService.getNFTEvents(id, {
      pagination: pagination as PaginationDto,
      eventType,
    }) as Promise<PaginatedResponseDto<NFTEvent>>;
  }

  @Get("events/address/:address")
  @ApiOperation({ summary: "Get NFT events by wallet address (public)" })
  @ApiResponse({
    status: 200,
    description: "List of NFT events for the address with pagination",
    type: PaginatedResponseDto<NFTEvent>,
  })
  async getEventsByAddress(
    @Param("address") address: string,
    @Query() paginationDto: PaginationDto
  ): Promise<PaginatedResponseDto<NFTEvent>> {
    return this.nftService.getEventsByAddress(
      address,
      paginationDto
    ) as Promise<PaginatedResponseDto<NFTEvent>>;
  }

  @Get("events/type/:eventType")
  @ApiOperation({ summary: "Get NFT events by event type (public)" })
  @ApiResponse({
    status: 200,
    description: "List of NFT events by type with pagination",
    type: PaginatedResponseDto<NFTEvent>,
  })
  async getEventsByType(
    @Param("eventType") eventType: NFTEventType,
    @Query() paginationDto: PaginationDto
  ): Promise<PaginatedResponseDto<NFTEvent>> {
    return this.nftService.getEventsByType(eventType, paginationDto) as Promise<
      PaginatedResponseDto<NFTEvent>
    >;
  }

  @Get("events/collection/:collectionId")
  @ApiOperation({
    summary: "Get NFT events by collection ID (public, supports types filter)",
  })
  @ApiResponse({
    status: 200,
    description:
      "List of NFT events for all NFTs in the collection with pagination",
    type: PaginatedResponseDto<NFTEvent>,
  })
  async getEventsByCollection(
    @Param("collectionId", ParseIntPipe) collectionId: number,
    @Query() query: GetCollectionEventsDto
  ): Promise<PaginatedResponseDto<NFTEvent>> {
    const allowedTypes = Object.values(NFTEventType);
    const typeList = (query.types || "")
      .split(",")
      .map((t) => t.trim().toUpperCase())
      .filter((t): t is NFTEventType =>
        allowedTypes.includes(t as NFTEventType)
      );
    return this.nftService.getEventsByCollection(collectionId, {
      pagination: query,
      types: typeList.length ? typeList : undefined,
    }) as unknown as Promise<PaginatedResponseDto<NFTEvent>>;
  }

  @Get(":id/price-history")
  @ApiOperation({
    summary: "Get NFT price history for chart (TRANSFER events only - sales)",
  })
  @ApiResponse({
    status: 200,
    description: "Price history data from TRANSFER events (sales only)",
    schema: {
      type: "array",
      items: {
        type: "object",
        properties: {
          timestamp: { type: "string", format: "date-time" },
          priceBNB: { type: "number" },
          priceWei: { type: "string" },
          eventType: { type: "string", enum: ["TRANSFER"] },
          txHash: { type: "string" },
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: "NFT not found" })
  async getPriceHistory(
    @Param("id", ParseIntPipe) id: number,
    @Query("range") range?: string
  ) {
    await this.nftService.findOne(id); // Verify NFT exists

    return this.nftService.getPriceHistory(id, range);
  }
}
