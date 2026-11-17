import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class RateResourceDto {
  @ApiProperty({ example: 4, minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  value!: number;

  @ApiPropertyOptional({ example: 'Très clair, merci !' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  comment?: string;
}