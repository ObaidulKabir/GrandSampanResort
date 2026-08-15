import { IsIn, IsOptional, IsString, MaxLength, MinLength, ValidateIf } from 'class-validator';

export class CreateFaqDto {
  @IsString()
  @MinLength(5)
  @MaxLength(300)
  question!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(20000)
  answer!: string;

  @IsOptional()
  @ValidateIf((_, v) => v != null && String(v).trim() !== '')
  @IsString()
  @MinLength(5)
  @MaxLength(300)
  questionBn?: string | null;

  @IsOptional()
  @ValidateIf((_, v) => v != null && String(v).trim() !== '')
  @IsString()
  @MinLength(1)
  @MaxLength(20000)
  answerBn?: string | null;
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

  @IsOptional()
  @ValidateIf((_, v) => v != null && String(v).trim() !== '')
  @IsString()
  @MinLength(5)
  @MaxLength(300)
  questionBn?: string | null;

  @IsOptional()
  @ValidateIf((_, v) => v != null && String(v).trim() !== '')
  @IsString()
  @MinLength(1)
  @MaxLength(20000)
  answerBn?: string | null;
}

export class MoveFaqDto {
  @IsIn(['up', 'down'])
  direction!: 'up' | 'down';
}
