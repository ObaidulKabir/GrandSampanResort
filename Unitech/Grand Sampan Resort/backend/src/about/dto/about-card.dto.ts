import { ArrayNotEmpty, ArrayUnique, IsArray, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { ABOUT_SECTION_VALUES, type AboutSectionValue } from '../about.types';

export class CreateAboutCardDto {
  @IsIn(ABOUT_SECTION_VALUES)
  section!: AboutSectionValue;

  @IsString()
  @MinLength(3)
  @MaxLength(120)
  title!: string;

  @IsString()
  @MinLength(20)
  @MaxLength(5000)
  bodyHtml!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  imageUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(140)
  imageAlt?: string;
}

export class UpdateAboutCardDto {
  @IsOptional()
  @IsIn(ABOUT_SECTION_VALUES)
  section?: AboutSectionValue;

  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(20)
  @MaxLength(5000)
  bodyHtml?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  imageUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(140)
  imageAlt?: string;
}

export class ReorderAboutCardsDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsString({ each: true })
  orderedIds!: string[];
}
