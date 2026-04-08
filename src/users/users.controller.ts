import {
  Body,
  BadRequestException,
  Controller,
  Get,
  Headers,
  Post,
} from '@nestjs/common';
import {
  ApiBody,
  ApiCreatedResponse,
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CreateUserDto } from './dto/create-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { UsersService } from './users.service';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'List users' })
  @ApiOkResponse({ type: UserResponseDto, isArray: true })
  findAll() {
    return this.usersService.findAll();
  }

  @Post()
  @ApiOperation({ summary: 'Create user with role hierarchy checks' })
  @ApiHeader({
    name: 'x-actor-role',
    description: 'creator role id (1=super admin, 2=store admin)',
    required: true,
  })
  @ApiHeader({
    name: 'x-actor-id',
    description: 'required for store admin creator',
    required: false,
  })
  @ApiBody({ type: CreateUserDto })
  @ApiCreatedResponse({ type: UserResponseDto })
  create(
    @Body() createUserDto: CreateUserDto,
    @Headers('x-actor-role') actorRoleHeader: string,
    @Headers('x-actor-id') actorId?: string,
  ) {
    const actorRole = Number(actorRoleHeader);
    if (!Number.isInteger(actorRole)) {
      throw new BadRequestException('x-actor-role must be a number');
    }

    return this.usersService.create(createUserDto, actorRole, actorId);
  }
}
