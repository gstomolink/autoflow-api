import { createHash } from 'crypto';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { STORE_STAFF_TYPES, USER_ROLES } from '../constants/roles.constant';
import { CreateUserDto } from './dto/create-user.dto';
import {
  roleCreationRules,
  UserEntity,
  validStoreStaffTypes,
} from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>,
  ) {}

  async findAll(): Promise<UserEntity[]> {
    return this.usersRepository.find({
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        staffType: true,
        createdByStoreAdminId: true,
      },
      order: { fullName: 'ASC' },
    });
  }

  async create(createUserDto: CreateUserDto, actorRole: number, actorId?: string) {
    const allowedRoles = roleCreationRules[actorRole as 1 | 2 | 3] ?? [];
    if (!allowedRoles.includes(createUserDto.role as 1 | 2 | 3)) {
      throw new BadRequestException('this role cannot create target role');
    }

    const existing = await this.usersRepository.findOne({
      where: { email: createUserDto.email.toLowerCase() },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException('email already exists');
    }

    const normalizedStaffType = createUserDto.staffType?.toLowerCase();
    if (createUserDto.role === USER_ROLES.STORE_STAFF) {
      if (
        !normalizedStaffType ||
        !validStoreStaffTypes.includes(
          normalizedStaffType as (typeof validStoreStaffTypes)[number],
        )
      ) {
        throw new BadRequestException('store staff must be cashier or inventory_staff');
      }
    }

    let createdByStoreAdminId: string | null = null;
    if (actorRole === USER_ROLES.STORE_ADMIN) {
      createdByStoreAdminId = actorId ?? null;
      if (!createdByStoreAdminId) {
        throw new BadRequestException('store admin creator id is required');
      }
      const creator = await this.usersRepository.findOne({
        where: { id: createdByStoreAdminId, role: USER_ROLES.STORE_ADMIN },
        select: { id: true },
      });
      if (!creator) {
        throw new NotFoundException('store admin creator not found');
      }
    } else if (createUserDto.createdByStoreAdminId) {
      createdByStoreAdminId = createUserDto.createdByStoreAdminId;
    }

    const passwordHash = createHash('sha256')
      .update(createUserDto.password)
      .digest('hex');

    const saved = await this.usersRepository.save(
      this.usersRepository.create({
        fullName: createUserDto.fullName,
        email: createUserDto.email.toLowerCase(),
        passwordHash,
        role: createUserDto.role as 1 | 2 | 3,
        staffType:
          createUserDto.role === USER_ROLES.STORE_STAFF
            ? (normalizedStaffType as
                | typeof STORE_STAFF_TYPES.CASHIER
                | typeof STORE_STAFF_TYPES.INVENTORY_STAFF)
            : null,
        createdByStoreAdminId,
      }),
    );

    // keep response safe by omitting password hash
    return this.usersRepository.findOneOrFail({
      where: { id: saved.id },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        staffType: true,
        createdByStoreAdminId: true,
      },
    });
  }
}
