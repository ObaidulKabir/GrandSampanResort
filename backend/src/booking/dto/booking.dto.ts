import { IsDateString, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class AvailabilityQueryDto {
  @IsNotEmpty()
  @IsString()
  suiteId!: string;
  @IsDateString()
  start!: string;
  @IsDateString()
  end!: string;
}

export class CreateBookingDto {
  @IsNotEmpty()
  @IsString()
  suiteId!: string;
  @IsNotEmpty()
  @IsString()
  planId!: string;
  @IsDateString()
  start!: string;
  @IsDateString()
  end!: string;
  @IsOptional()
  @IsString()
  investorId?: string;
}

