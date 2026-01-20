import { IsInt, IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class CreateSuiteDto {
  @IsNotEmpty()
  @IsString()
  id!: string;
  @IsInt()
  floor!: number;
  @IsString()
  type!: string;
  @IsNumber()
  size!: number;
  @IsString()
  view!: string;
  @IsInt()
  totalPrice!: number;
}

export class UpdateSuiteDto {
  @IsInt()
  floor?: number;
  @IsString()
  type?: string;
  @IsNumber()
  size?: number;
  @IsString()
  view?: string;
  @IsInt()
  totalPrice?: number;
}

