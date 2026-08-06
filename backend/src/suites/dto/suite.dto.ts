import { IsInt, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

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
  @IsOptional()
  @IsInt()
  floor?: number;
  @IsOptional()
  @IsString()
  type?: string;
  @IsOptional()
  @IsNumber()
  size?: number;
  @IsOptional()
  @IsString()
  view?: string;
  @IsOptional()
  @IsInt()
  totalPrice?: number;
}
