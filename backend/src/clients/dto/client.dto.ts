import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateClientDto {
  @IsNotEmpty()
  @IsString()
  id!: string;
  @IsNotEmpty()
  @IsString()
  name!: string;
  @IsString()
  fatherName!: string;
  @IsString()
  nid!: string;
  @IsString()
  dob!: string;
  @IsString()
  address!: string;
  @IsString()
  permanentAddress!: string;
  @IsString()
  contact!: string;
  @IsEmail()
  email!: string;
  @IsString()
  picUrl!: string;
  @IsString()
  nomineeName!: string;
  @IsString()
  nomineeNid!: string;
  @IsString()
  nomineePicUrl!: string;
}

export class UpdateClientDto {
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
  @IsEmail()
  email?: string;
  @IsOptional()
  @IsString()
  picUrl?: string;
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
