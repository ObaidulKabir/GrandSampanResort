import { IsDateString, IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

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
  @IsOptional()
  @IsString()
  planId?: string;
  @IsDateString()
  start!: string;
  @IsDateString()
  end!: string;
  @IsOptional()
  @IsString()
  investorId?: string;
  /** After booking + downpayment, remaining balance is paid over 24 months. */
  @IsOptional()
  @IsIn(['monthly', 'quarterly'])
  cadence?: 'monthly' | 'quarterly';
}
