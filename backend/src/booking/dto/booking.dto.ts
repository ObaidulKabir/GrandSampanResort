import { Type } from 'class-transformer';
import { IsDateString, IsEmail, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, ValidateIf, ValidateNested } from 'class-validator';

export class AvailabilityQueryDto {
  @IsNotEmpty()
  @IsString()
  suiteId!: string;
  @IsDateString()
  start!: string;
  @IsDateString()
  end!: string;
}

/** Per-booking KYC for the person the investment is purchased for. */
export class BookingKycDto {
  @IsNotEmpty()
  @IsString()
  name!: string;
  @IsNotEmpty()
  @IsString()
  fatherName!: string;
  @IsNotEmpty()
  @IsString()
  nid!: string;
  @IsNotEmpty()
  @IsString()
  dob!: string;
  @IsNotEmpty()
  @IsString()
  address!: string;
  @IsNotEmpty()
  @IsString()
  permanentAddress!: string;
  @IsNotEmpty()
  @IsString()
  contact!: string;
  @IsEmail()
  email!: string;
  @IsNotEmpty()
  @IsString()
  picUrl!: string;
  @IsNotEmpty()
  @IsString()
  profession!: string;
  @IsNotEmpty()
  @IsString()
  city!: string;
  @IsNotEmpty()
  @IsString()
  nomineeName!: string;
  @IsNotEmpty()
  @IsString()
  nomineeNid!: string;
  @IsNotEmpty()
  @IsString()
  nomineePicUrl!: string;
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
  /** After booking + downpayment, remaining balance is paid over the chosen tenor. */
  @IsOptional()
  @IsIn(['monthly', 'quarterly'])
  cadence?: 'monthly' | 'quarterly';
  @IsOptional()
  @IsString()
  paymentTierId?: string;
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  installmentMonths?: number;
  /** Required for investment purchases (when planId is set). */
  @IsOptional()
  @ValidateNested()
  @Type(() => BookingKycDto)
  kyc?: BookingKycDto;
  /** Required for investment purchases. */
  @IsOptional()
  @IsIn(['cheque', 'cash_payorder', 'online_transfer'])
  depositMethod?: 'cheque' | 'cash_payorder' | 'online_transfer';
  @IsOptional()
  @IsString()
  depositReference?: string;
  @IsOptional()
  @IsString()
  depositProofUrl?: string;
  @IsOptional()
  @IsString()
  depositNote?: string;
  /** Optional referrer code (from ?ref= or manual entry). */
  @IsOptional()
  @IsString()
  referralCode?: string;
  @IsOptional()
  @IsString()
  quoteToken?: string;
}

/** Partial KYC update after booking (admin: all fields; owner: public catalog fields). */
export class UpdateBookingKycDto {
  @IsOptional()
  @IsString()
  name?: string;
  @IsOptional()
  @IsString()
  fatherName?: string;
  @IsOptional()
  @IsString()
  nid?: string;
  @IsOptional()
  @IsString()
  dob?: string;
  @IsOptional()
  @IsString()
  address?: string;
  @IsOptional()
  @IsString()
  permanentAddress?: string;
  @IsOptional()
  @IsString()
  contact?: string;
  @IsOptional()
  @ValidateIf((_, v) => String(v || '').trim().length > 0)
  @IsEmail()
  email?: string;
  @IsOptional()
  @IsString()
  picUrl?: string;
  @IsOptional()
  @IsString()
  profession?: string;
  @IsOptional()
  @IsString()
  city?: string;
  @IsOptional()
  @IsString()
  nomineeName?: string;
  @IsOptional()
  @IsString()
  nomineeNid?: string;
  @IsOptional()
  @IsString()
  nomineePicUrl?: string;
}
