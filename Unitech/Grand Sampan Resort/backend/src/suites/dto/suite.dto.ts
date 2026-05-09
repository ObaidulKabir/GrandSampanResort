import { IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, IsArray } from 'class-validator';

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
  @IsOptional()
  @IsString()
  planImage?: string;
  @IsOptional()
  @IsString()
  layoutImage?: string;
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  viewImages?: string[];
}

export class UpdateSuiteDto {
  @IsInt()
  @IsOptional()
  floor?: number;
  @IsString()
  @IsOptional()
  type?: string;
  @IsNumber()
  @IsOptional()
  size?: number;
  @IsString()
  @IsOptional()
  view?: string;
  @IsInt()
  @IsOptional()
  totalPrice?: number;
  @IsOptional()
  @IsString()
  planImage?: string;
  @IsOptional()
  @IsString()
  layoutImage?: string;
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  viewImages?: string[];
}

