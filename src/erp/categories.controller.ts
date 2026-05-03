import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { USER_ROLES } from '../constants/roles.constant';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { resolveShopId } from '../common/shop-scope';
import type { JwtPayload } from '../auth/jwt-payload';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { ShopsService } from './shops.service';

@ApiTags('categories')
@ApiBearerAuth()
@Controller('categories')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(USER_ROLES.SUPER_ADMIN, USER_ROLES.STORE_ADMIN, USER_ROLES.STORE_STAFF)
export class CategoriesController {
  constructor(
    private readonly categoriesService: CategoriesService,
    private readonly shopsService: ShopsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List categories (paginated)' })
  async findAll(
    @CurrentUser() user: JwtPayload,
    @Query('shopId') shopId: string | undefined,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const resolvedShopId = resolveShopId(user, shopId);
    const parentShopId = await this.shopsService.resolveParentShopId(resolvedShopId);
    return this.categoriesService.findAll(
      parentShopId,
      search,
      page !== undefined ? Number(page) : undefined,
      limit !== undefined ? Number(limit) : undefined,
    );
  }

  @Post()
  @Roles(USER_ROLES.SUPER_ADMIN, USER_ROLES.STORE_ADMIN)
  async create(
    @CurrentUser() user: JwtPayload,
    @Query('shopId') shopId: string | undefined,
    @Body() dto: CreateCategoryDto,
  ) {
    const resolvedShopId = resolveShopId(user, shopId);
    const parentShopId = await this.shopsService.resolveParentShopId(resolvedShopId);
    return this.categoriesService.create(parentShopId, dto);
  }

  @Post('bulk-upload')
  @Roles(USER_ROLES.SUPER_ADMIN, USER_ROLES.STORE_ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  async bulkCreate(
    @CurrentUser() user: JwtPayload,
    @Query('shopId') shopId: string | undefined,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const resolvedShopId = resolveShopId(user, shopId);
    const parentShopId = await this.shopsService.resolveParentShopId(resolvedShopId);
    return this.categoriesService.bulkCreate(parentShopId, file);
  }

  @Patch(':id')
  @Roles(USER_ROLES.SUPER_ADMIN, USER_ROLES.STORE_ADMIN)
  async update(
    @CurrentUser() user: JwtPayload,
    @Query('shopId') shopId: string | undefined,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCategoryDto,
  ) {
    const resolvedShopId = resolveShopId(user, shopId);
    const parentShopId = await this.shopsService.resolveParentShopId(resolvedShopId);
    return this.categoriesService.update(parentShopId, id, dto);
  }

  @Delete(':id')
  @Roles(USER_ROLES.SUPER_ADMIN, USER_ROLES.STORE_ADMIN)
  async remove(
    @CurrentUser() user: JwtPayload,
    @Query('shopId') shopId: string | undefined,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const resolvedShopId = resolveShopId(user, shopId);
    const parentShopId = await this.shopsService.resolveParentShopId(resolvedShopId);
    return this.categoriesService.remove(parentShopId, id);
  }
}
