import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

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
  @IsString()
  name?: string;
  @IsString()
  fatherName?: string;
  @IsString()
  nid?: string;
  @IsString()
  dob?: string;
  @IsString()
  address?: string;
  @IsString()
  permanentAddress?: string;
  @IsString()
  contact?: string;
  @IsEmail()
  email?: string;
  @IsString()
  picUrl?: string;
  @IsString()
  nomineeName?: string;
  @IsString()
  nomineeNid?: string;
  @IsString()
  nomineePicUrl?: string;
}

