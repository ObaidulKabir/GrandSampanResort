import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateTermsDto {
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  title!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(40000)
  body!: string;
}

export class UpdateTermsDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(40000)
  body?: string;
}

export class MoveTermsDto {
  @IsIn(['up', 'down'])
  direction!: 'up' | 'down';
}
