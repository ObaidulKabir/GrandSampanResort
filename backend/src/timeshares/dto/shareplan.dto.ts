import { IsInt, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateSharePlanDto {
  @IsNotEmpty()
  @IsString()
  id!: string;
  @IsString()
  name!: string;
  @IsInt()
  daysPerMonth!: number;
  @IsInt()
  lockIn!: number;
  @IsInt()
  price!: number;
  @IsOptional()
  @IsString()
  currency?: string;
  @IsOptional()
  @IsString()
  suiteId?: string;
  @IsOptional()
  @IsString()
  planStatus?: string;
  @IsOptional()
  @IsString()
  planType?: 'FULL' | 'DPM';
  @IsOptional()
  @IsNumber()
  timeFraction?: number;
}

export class UpdateSharePlanDto {
  @IsOptional()
  @IsString()
  name?: string;
  @IsOptional()
  @IsInt()
  daysPerMonth?: number;
  @IsOptional()
  @IsInt()
  lockIn?: number;
  @IsOptional()
  @IsInt()
  price?: number;
  @IsOptional()
  @IsString()
  currency?: string;
  @IsOptional()
  @IsString()
  suiteId?: string;
  @IsOptional()
  @IsString()
  planStatus?: string;
  @IsOptional()
  @IsString()
  planType?: 'FULL' | 'DPM';
  @IsOptional()
  @IsNumber()
  timeFraction?: number;
}

