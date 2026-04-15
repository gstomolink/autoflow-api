import { hash } from 'bcryptjs';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { STORE_STAFF_TYPES, USER_ROLES } from '../constants/roles.constant';
import type { JwtPayload } from '../auth/jwt-payload';
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
        userId: true,
        email: true,
        phone: true,
        role: true,
        shopId: true,
        staffType: true,
        createdByStoreAdminId: true,
      },
      order: { fullName: 'ASC' },
    });
  }

  async findAllForActor(
    actor: JwtPayload,
    queryShopId?: string,
  ): Promise<UserEntity[]> {
    if (actor.role === USER_ROLES.STORE_STAFF) {
      throw new ForbiddenException();
    }
    const qb = this.usersRepository
      .createQueryBuilder('u')
      .select([
        'u.id',
        'u.fullName',
        'u.userId',
        'u.email',
        'u.phone',
        'u.role',
        'u.shopId',
        'u.staffType',
        'u.createdByStoreAdminId',
      ])
      .orderBy('u.fullName', 'ASC');
    if (actor.role === USER_ROLES.SUPER_ADMIN) {
      const sid = queryShopId?.trim();
      if (!sid) {
        throw new BadRequestException('shop id is required');
      }
      qb.andWhere('u.shopId = :sid', { sid });
      return qb.getMany();
    }
    if (actor.role === USER_ROLES.STORE_ADMIN && actor.shopId) {
      qb.andWhere('u.shopId = :sid', { sid: actor.shopId });
      return qb.getMany();
    }
    throw new ForbiddenException();
  }

  async create(createUserDto: CreateUserDto, actorRole: number, actorId?: number) {
    const allowedRoles = roleCreationRules[actorRole as 1 | 2 | 3] ?? [];
    if (!allowedRoles.includes(createUserDto.role as 1 | 2 | 3)) {
      throw new BadRequestException('this role cannot create target role');
    }

    const normalizedUserId = createUserDto.userId.trim().toLowerCase();
    const normalizedShopId = createUserDto.shopId?.trim() || null;
    const normalizedEmail = createUserDto.email?.toLowerCase() ?? null;

    if (createUserDto.role === USER_ROLES.SUPER_ADMIN && normalizedShopId) {
      throw new BadRequestException('super admin must not have shop id');
    }

    if (createUserDto.role !== USER_ROLES.SUPER_ADMIN && !normalizedShopId) {
      throw new BadRequestException('shop id is required for store users');
    }

    if (createUserDto.role === USER_ROLES.SUPER_ADMIN) {
      const superAdminUserIdExists = await this.usersRepository.findOne({
        where: {
          userId: normalizedUserId,
          role: USER_ROLES.SUPER_ADMIN,
          shopId: IsNull(),
        },
        select: { id: true },
      });
      if (superAdminUserIdExists) {
        throw new ConflictException('super admin user id already exists');
      }
    } else {
      const shopScopedUserIdExists = await this.usersRepository.findOne({
        where: normalizedShopId
          ? {
              userId: normalizedUserId,
              shopId: normalizedShopId,
            }
          : {
              userId: normalizedUserId,
              shopId: IsNull(),
            },
        select: { id: true },
      });
      if (shopScopedUserIdExists) {
        throw new ConflictException('user id already exists for this shop');
      }
    }

    if (normalizedEmail) {
      const existingEmail = await this.usersRepository.findOne({
        where: { email: normalizedEmail },
        select: { id: true },
      });
      if (existingEmail) {
        throw new ConflictException('email already exists');
      }
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

    let createdByStoreAdminId: number | null = null;
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

    const passwordHash = await hash(createUserDto.password, 12);

    const normalizedPhone = createUserDto.phone?.trim() || null;

    const saved = await this.usersRepository.save(
      this.usersRepository.create({
        fullName: createUserDto.fullName,
        userId: normalizedUserId,
        email: normalizedEmail,
        phone: normalizedPhone,
        passwordHash,
        role: createUserDto.role as 1 | 2 | 3,
        shopId: normalizedShopId,
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
        userId: true,
        email: true,
        phone: true,
        role: true,
        shopId: true,
        staffType: true,
        createdByStoreAdminId: true,
      },
    });
  }

  async seedInitialSuperAdmin(): Promise<void> {
    const seedUserId = 'admin';
    const seedPassword = 'admin';

    const superAdmin = await this.usersRepository.findOne({
      where: {
        role: USER_ROLES.SUPER_ADMIN,
        userId: seedUserId,
        shopId: IsNull(),
      },
      select: { id: true },
    });
    if (superAdmin) {
      return;
    }

    const passwordHash = await hash(seedPassword, 12);
    await this.usersRepository.save(
      this.usersRepository.create({
        fullName: 'System Super Admin',
        userId: seedUserId,
        email: null,
        passwordHash,
        role: USER_ROLES.SUPER_ADMIN,
        shopId: null,
        staffType: null,
        createdByStoreAdminId: null,
      }),
    );
  }
}
