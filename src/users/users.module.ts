import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { ShopEntity } from '../inventory/entities/shop.entity';
import { UserEntity } from './entities/user.entity';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [TypeOrmModule.forFeature([UserEntity, ShopEntity]), AuthModule],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
