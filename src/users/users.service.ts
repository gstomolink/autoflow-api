import { compare, hash } from 'bcryptjs';
import { Readable } from 'stream';
import csvParser from 'csv-parser';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  normalizePagination,
  toPaginated,
  type PaginatedResult,
} from '../common/pagination';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { STORE_STAFF_TYPES, USER_ROLES } from '../constants/roles.constant';
import type { JwtPayload } from '../auth/jwt-payload';
import { CreateUserDto } from './dto/create-user.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
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
    page?: number,
    limit?: number,
  ): Promise<PaginatedResult<UserEntity>> {
    if (actor.role === USER_ROLES.STORE_STAFF) {
      throw new ForbiddenException();
    }
    const { page: p, limit: l, skip } = normalizePagination(page, limit);
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
      const total = await qb.getCount();
      const items = await qb.skip(skip).take(l).getMany();
      return toPaginated(items, total, p, l);
    }
    if (actor.role === USER_ROLES.STORE_ADMIN && actor.shopId) {
      qb.andWhere('u.shopId = :sid', { sid: actor.shopId });
      const total = await qb.getCount();
      const items = await qb.skip(skip).take(l).getMany();
      return toPaginated(items, total, p, l);
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

  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    const user = await this.usersRepository.findOne({
      where: { id: dto.userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isMatch = await compare(dto.currentPassword, user.passwordHash);
    if (!isMatch) {
      throw new BadRequestException('Current password is incorrect');
    }

    user.passwordHash = await hash(dto.newPassword, 12);
    await this.usersRepository.save(user);

    return { message: 'Password updated successfully' };
  }

  async bulkCreate(
    file: Express.Multer.File,
    actorRole: number,
    actorId?: number,
  ) {
    const results: any[] = [];
    return new Promise((resolve, reject) => {
      Readable.from(file.buffer)
        .pipe(csvParser())
        .on('data', (data) => results.push(data))
        .on('end', async () => {
          let successCount = 0;
          for (const row of results) {
            // Frontend sample headers: "fullName", "userId", "email", "phone", "password", "role", "shopId", "staffType"
            const fullName = row.fullName || row.FullName;
            const userId = row.userId || row.UserId || row.userid;
            const password = row.password || row.Password;
            const role = parseInt(row.role || row.Role, 10);
            const shopId = row.shopId || row.ShopId;

            if (!fullName || !userId || !password || isNaN(role)) {
              continue;
            }

            const dto: CreateUserDto = {
              fullName,
              userId,
              password,
              role,
              shopId: shopId || undefined,
              email: row.email || row.Email || undefined,
              phone: row.phone || row.Phone || undefined,
              staffType: row.staffType || row.StaffType || undefined,
            };

            try {
              await this.create(dto, actorRole, actorId);
              successCount++;
            } catch (err) {
              console.error('Failed to import user row', row.userId, err);
            }
          }
          resolve({ successCount });
        })
        .on('error', (error) => reject(error));
    });
  }
}
