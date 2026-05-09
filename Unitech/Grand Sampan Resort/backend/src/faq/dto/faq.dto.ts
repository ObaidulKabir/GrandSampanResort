import { ArrayNotEmpty, ArrayUnique, IsArray, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateFaqEntryDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  category?: string;

  @IsString()
  @MinLength(5)
  @MaxLength(200)
  question!: string;

  @IsString()
  @MinLength(20)
  @MaxLength(8000)
  answerHtml!: string;
}

export class UpdateFaqEntryDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  category?: string;

  @IsOptional()
  @IsString()
  @MinLength(5)
  @MaxLength(200)
  question?: string;

  @IsOptional()
  @IsString()
  @MinLength(20)
  @MaxLength(8000)
  answerHtml?: string;
}

export class ReorderFaqEntriesDto {
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  category!: string;

  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsString({ each: true })
  orderedIds!: string[];
}

export class CreateFaqCategoryDto {
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  name!: string;
}

export class UpdateFaqCategoryDto {
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  name!: string;
}

export class ReorderFaqCategoriesDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsString({ each: true })
  orderedIds!: string[];
}
