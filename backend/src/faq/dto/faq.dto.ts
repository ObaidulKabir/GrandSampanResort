import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateFaqDto {
  @IsString()
  @MinLength(5)
  @MaxLength(300)
  question!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(20000)
  answer!: string;
}

export class UpdateFaqDto {
  @IsOptional()
  @IsString()
  @MinLength(5)
  @MaxLength(300)
  question?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(20000)
  answer?: string;
}

export class MoveFaqDto {
  @IsIn(['up', 'down'])
  direction!: 'up' | 'down';
}
