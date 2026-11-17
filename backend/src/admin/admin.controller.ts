import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { PrismaService } from '../prisma/prisma.service';
import { ResolveReportDto } from './dto/resolve-report.dto';
import { UpdateStatusDto } from './dto/update-status.dto';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin')
export class AdminController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('stats')
  async stats() {
    const [users, subjects, chapters, suspended, resources, reports] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.subject.count(),
      this.prisma.chapter.count(),
      this.prisma.user.count({ where: { status: 'SUSPENDED' } }),
      this.prisma.resource.count({ where: { isPublic: true, status: 'APPROVED' } }),
      this.prisma.report.count({ where: { resolved: false } }),
    ]);
    return { users, subjects, chapters, suspended, resources, reports };
  }

  @Get('users')
  users() {
    return this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        status: true,
        program: true,
        level: true,
        createdAt: true,
      },
    });
  }

  @Patch('users/:id/status')
  async updateStatus(
    @CurrentUser() current: { id: string },
    @Param('id') id: string,
    @Body() dto: UpdateStatusDto,
  ) {
    if (id === current.id) {
      throw new BadRequestException('Tu ne peux pas modifier ton propre compte');
    }
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Utilisateur introuvable');

    return this.prisma.user.update({
      where: { id },
      data: { status: dto.status },
      select: { id: true, fullName: true, email: true, role: true, status: true },
    });
  }

  @Get('reports')
  reports() {
    return this.prisma.report.findMany({
      where: { resolved: false },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        reason: true,
        createdAt: true,
        user: { select: { id: true, fullName: true } },
        resource: {
          select: {
            id: true,
            title: true,
            subjectName: true,
            fileName: true,
            status: true,
            author: { select: { id: true, fullName: true } },
          },
        },
      },
    });
  }

  @Patch('reports/:id')
  async resolveReport(@Param('id') id: string, @Body() dto: ResolveReportDto) {
    const report = await this.prisma.report.findUnique({ where: { id } });
    if (!report) throw new NotFoundException('Signalement introuvable');

    if (dto.action === 'REMOVE') {
      await this.prisma.$transaction([
        this.prisma.resource.update({
          where: { id: report.resourceId },
          data: { status: 'REJECTED' },
        }),
        this.prisma.report.updateMany({
          where: { resourceId: report.resourceId },
          data: { resolved: true },
        }),
      ]);
    } else {
      await this.prisma.report.update({ where: { id }, data: { resolved: true } });
    }
    return { resolved: true, action: dto.action };
  }
}