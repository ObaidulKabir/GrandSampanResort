import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength
} from 'class-validator';

export const PROMOTION_SCOPES = ['all', 'category', 'plans'] as const;

export class CreatePromotionDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @IsInt()
  @Min(1)
  @Max(50)
  discountPct!: number;

  @IsIn(PROMOTION_SCOPES as unknown as string[])
  scope!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  suiteTypes?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  planIds?: string[];

  @IsDateString()
  startsAt!: string;

  @IsDateString()
  endsAt!: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class UpdatePromotionDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  discountPct?: number;

  @IsOptional()
  @IsIn(PROMOTION_SCOPES as unknown as string[])
  scope?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  suiteTypes?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  planIds?: string[];

  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @IsOptional()
  @IsDateString()
  endsAt?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
