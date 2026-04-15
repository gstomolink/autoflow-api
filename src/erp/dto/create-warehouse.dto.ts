import { IsString, Length } from 'class-validator';

export class CreateWarehouseDto {
  @IsString()
  @Length(1, 255)
  name!: string;

  @IsString()
  @Length(1, 64)
  code!: string;

  @IsString()
  address!: string;

  @IsString()
  managerName!: string;

  @IsString()
  contactPhone!: string;
}
