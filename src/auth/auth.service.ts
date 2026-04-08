import { compare } from 'bcryptjs';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { USER_ROLES } from '../constants/roles.constant';
import { UserEntity } from '../users/entities/user.entity';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>,
    private readonly jwtService: JwtService,
  ) {}

  async login(loginDto: LoginDto) {
    const normalizedUserId = loginDto.userId.trim().toLowerCase();
    const normalizedShopId = loginDto.shopId?.trim() || null;

    const user = normalizedShopId
      ? await this.usersRepository.findOne({
          where: {
            userId: normalizedUserId,
            shopId: normalizedShopId,
          },
        })
      : await this.usersRepository.findOne({
          where: {
            userId: normalizedUserId,
            role: USER_ROLES.SUPER_ADMIN,
            shopId: IsNull(),
          },
        });

    if (!user) {
      throw new UnauthorizedException('invalid user id or password');
    }

    const isPasswordValid = await compare(loginDto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('invalid user id or password');
    }

    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      userId: user.userId,
      role: user.role,
      shopId: user.shopId,
    });

    return {
      accessToken,
      user: {
        id: user.id,
        fullName: user.fullName,
        userId: user.userId,
        email: user.email,
        role: user.role,
        shopId: user.shopId,
        staffType: user.staffType,
      },
    };
  }
}
