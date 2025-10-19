import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
  ParseIntPipe,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { CollectionService } from "./collection.service";
import { CreateCollectionDto } from "./dto/create-collection.dto";
import { UpdateCollectionDto } from "./dto/update-collection.dto";
import { ConfirmTxDto } from "../nft/dto/confirm-tx.dto";
import { Collection } from "../common/entities";
import {
  PaginationDto,
  PaginatedResponseDto,
} from "../common/dto/pagination.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

@ApiTags("Collections")
@Controller("collections")
export class CollectionController {
  constructor(private readonly collectionService: CollectionService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Create a new collection" })
  @ApiResponse({
    status: 201,
    description: "Collection created successfully",
    type: Collection,
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async create(
    @Body() createCollectionDto: CreateCollectionDto,
    @Request() req
  ): Promise<Collection> {
    return this.collectionService.create(createCollectionDto, req.user.id);
  }

  @Get()
  @ApiOperation({ summary: "Get all collections with pagination" })
  @ApiResponse({
    status: 200,
    description: "List of collections with pagination",
    type: PaginatedResponseDto<Collection>,
  })
  async findAll(
    @Query() paginationDto: PaginationDto
  ): Promise<PaginatedResponseDto<Collection>> {
    return this.collectionService.findAll(paginationDto);
  }

  @Get("my-collections")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get current user's collections" })
  @ApiResponse({
    status: 200,
    description: "List of user's collections",
    type: [Collection],
  })
  async findMyCollections(@Request() req): Promise<Collection[]> {
    return this.collectionService.findByCreator(req.user.id);
  }

  @Get("my-collections-for-nft")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get collections where user can add NFTs" })
  @ApiResponse({
    status: 200,
    description: "List of collections where user can add NFTs",
    type: [Collection],
  })
  async findMyCollectionsForNFT(@Request() req): Promise<Collection[]> {
    return this.collectionService.findMyCollectionsForNFT(req.user.id);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get collection by ID" })
  @ApiResponse({
    status: 200,
    description: "Collection found",
    type: Collection,
  })
  @ApiResponse({ status: 404, description: "Collection not found" })
  async findOne(@Param("id", ParseIntPipe) id: number): Promise<Collection> {
    return this.collectionService.findOne(id);
  }

  @Patch(":id")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update collection by ID" })
  @ApiResponse({
    status: 200,
    description: "Collection updated successfully",
    type: Collection,
  })
  @ApiResponse({ status: 404, description: "Collection not found" })
  @ApiResponse({ status: 403, description: "Forbidden - not creator" })
  async update(
    @Param("id", ParseIntPipe) id: number,
    @Body() updateCollectionDto: UpdateCollectionDto,
    @Request() req
  ): Promise<Collection> {
    return this.collectionService.update(id, updateCollectionDto, req.user.id);
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Delete collection by ID" })
  @ApiResponse({ status: 200, description: "Collection deleted successfully" })
  @ApiResponse({ status: 404, description: "Collection not found" })
  @ApiResponse({ status: 403, description: "Forbidden - not creator" })
  async remove(
    @Param("id", ParseIntPipe) id: number,
    @Request() req
  ): Promise<{ message: string }> {
    await this.collectionService.remove(id, req.user.id);
    return { message: "Collection deleted successfully" };
  }

  @Post(":id/confirm-deploy")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Confirm on-chain collection deploy and sync contract address",
  })
  @ApiResponse({ status: 200, description: "Collection deployment confirmed" })
  async confirmDeploy(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: ConfirmTxDto,
    @Request() req
  ) {
    await this.collectionService.confirmDeploy(id, req.user.id, body.txHash);
    return { message: "Collection deployment confirmed" };
  }
}
