import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

export class ResolveReportDto {
  @ApiProperty({ enum: ['REMOVE', 'IGNORE'], example: 'REMOVE' })
  @IsIn(['REMOVE', 'IGNORE'])
  action!: 'REMOVE' | 'IGNORE';
}