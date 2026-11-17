import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class ReportResourceDto {
  @ApiProperty({ example: 'Contenu inapproprié' })
  @IsString()
  @MinLength(3)
  @MaxLength(300)
  reason!: string;
}