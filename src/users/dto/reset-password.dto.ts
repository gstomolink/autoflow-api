import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, Length } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  userId!: number;

  @ApiProperty({ example: 'OldPass123!' })
  @IsString()
  currentPassword!: string;

  @ApiProperty({ example: 'NewSecurePass456!' })
  @IsString()
  @Length(8, 128)
  newPassword!: string;
}
