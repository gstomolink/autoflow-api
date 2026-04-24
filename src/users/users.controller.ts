import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { USER_ROLES } from '../constants/roles.constant';
import type { JwtPayload } from '../auth/jwt-payload';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateUserDto } from './dto/create-user.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { UsersService } from './users.service';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(USER_ROLES.SUPER_ADMIN, USER_ROLES.STORE_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List users (super admin or store admin)' })
  @ApiOkResponse({ type: UserResponseDto, isArray: true })
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query('shopId') shopId?: string,
  ) {
    return this.usersService.findAllForActor(user, shopId);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(USER_ROLES.SUPER_ADMIN, USER_ROLES.STORE_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create user with role hierarchy' })
  @ApiBody({ type: CreateUserDto })
  @ApiCreatedResponse({ type: UserResponseDto })
  create(@CurrentUser() user: JwtPayload, @Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto, user.role, user.sub);
  }

  @Post('reset-password')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(USER_ROLES.SUPER_ADMIN, USER_ROLES.STORE_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reset user password' })
  @ApiBody({ type: ResetPasswordDto })
  @ApiOkResponse({ description: 'Password reset successful' })
  resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.usersService.resetPassword(resetPasswordDto);
  }
}
