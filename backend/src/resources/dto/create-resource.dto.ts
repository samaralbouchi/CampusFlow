import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateResourceDto {
  @ApiProperty({ example: 'Résumé du chapitre 2' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  title!: string;

  @ApiPropertyOptional({ example: 'Résumé complet avec exemples' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ description: 'Nom de la matière (texte libre)', example: 'Réseaux' })
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  subjectName!: string;

  @ApiPropertyOptional({ description: 'Partager dans l\'espace commun', default: false })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  isPublic?: boolean;
}