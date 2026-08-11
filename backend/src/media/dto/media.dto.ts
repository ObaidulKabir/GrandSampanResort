import { IsIn, IsOptional, IsString } from 'class-validator';

export const MEDIA_CATEGORIES = [
  'hero',
  'resort',
  'suites',
  'suite_plan',
  'suite_keymap',
  'about_project',
  'design_layout'
] as const;

// Categories that belong to one specific suite rather than a general site section.
export const SUITE_SCOPED_CATEGORIES = ['suite_plan', 'suite_keymap'] as const;

export class UploadMediaDto {
  @IsIn(MEDIA_CATEGORIES as unknown as string[])
  category!: string;
  @IsOptional()
  @IsString()
  label?: string;
  @IsOptional()
  @IsString()
  alt?: string;
  @IsOptional()
  @IsString()
  suiteId?: string;
}

export class MoveMediaDto {
  @IsIn(['up', 'down'])
  direction!: 'up' | 'down';
}

export class UpdateMediaDto {
  @IsOptional()
  @IsString()
  label?: string;
  @IsOptional()
  @IsString()
  alt?: string;
}
