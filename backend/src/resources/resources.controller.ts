import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Put,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { randomUUID } from 'crypto';
import type { Response } from 'express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { CreateResourceDto } from './dto/create-resource.dto';
import { RateResourceDto } from './dto/rate-resource.dto';
import { ReportResourceDto } from './dto/report-resource.dto';

const UPLOAD_DIR = join(process.cwd(), 'uploads');
const ALLOWED = ['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.txt', '.png', '.jpg', '.jpeg'];

type Me = { id: string; role: string };

@ApiTags('resources')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('resources')
export class ResourcesController {
  constructor(private readonly prisma: PrismaService) {}

  private listSelect(userId: string) {
    return {
      id: true,
      title: true,
      description: true,
      subjectName: true,
      fileName: true,
      mimeType: true,
      status: true,
      isPublic: true,
      downloads: true,
      createdAt: true,
      author: { select: { id: true, fullName: true } },
      ratings: { select: { value: true, userId: true } },
      favorites: { where: { userId }, select: { userId: true } },
    } as const;
  }

  private present<
    T extends { ratings: { value: number; userId: string }[]; favorites: unknown[] },
  >(r: T, userId: string) {
    const { ratings, favorites, ...rest } = r;
    const count = ratings.length;
    const avg = count
      ? Math.round((ratings.reduce((s, x) => s + x.value, 0) / count) * 10) / 10
      : 0;
    return {
      ...rest,
      ratingAvg: avg,
      ratingCount: count,
      myRating: ratings.find((x) => x.userId === userId)?.value ?? null,
      isFavorite: favorites.length > 0,
    };
  }

  /** Une ressource est visible si elle est publique et approuvée, ou si on en est l'auteur. */
  private async getVisible(id: string, user: Me) {
    const resource = await this.prisma.resource.findUnique({ where: { id } });
    const visible =
      resource &&
      ((resource.status === 'APPROVED' && resource.isPublic) ||
        resource.authorId === user.id ||
        user.role === 'ADMIN');
    if (!resource || !visible) throw new NotFoundException('Ressource introuvable');
    return resource;
  }

  @Get()
  async findAll(
    @CurrentUser() current: Me,
    @Query('subject') subject?: string,
    @Query('mine') mine?: string,
  ) {
    const where =
      mine === 'true'
        ? { authorId: current.id }
        : {
            status: 'APPROVED' as const,
            isPublic: true,
            ...(subject ? { subjectName: { equals: subject, mode: 'insensitive' as const } } : {}),
          };

    const items = await this.prisma.resource.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: this.listSelect(current.id),
    });
    return items.map((r) => this.present(r, current.id));
  }

  @Get('favorites')
  async favorites(@CurrentUser() current: Me) {
    const items = await this.prisma.resource.findMany({
      where: {
        favorites: { some: { userId: current.id } },
        status: 'APPROVED',
        OR: [{ isPublic: true }, { authorId: current.id }],
      },
      orderBy: { createdAt: 'desc' },
      select: this.listSelect(current.id),
    });
    return items.map((r) => this.present(r, current.id));
  }

  @Post()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: UPLOAD_DIR,
        filename: (_req, file, cb) =>
          cb(null, `${randomUUID()}${extname(file.originalname).toLowerCase()}`),
      }),
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        const ok = ALLOWED.includes(extname(file.originalname).toLowerCase());
        cb(ok ? null : new BadRequestException('Type de fichier non autorisé'), ok);
      },
    }),
  )
  async create(
    @CurrentUser() current: Me,
    @Body() dto: CreateResourceDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Fichier manquant');

    return this.prisma.resource.create({
      data: {
        title: dto.title.trim(),
        description: dto.description?.trim(),
        subjectName: dto.subjectName.trim(),
        fileUrl: file.filename,
        fileName: file.originalname,
        mimeType: file.mimetype,
        isPublic: dto.isPublic ?? false,
        authorId: current.id,
      },
      select: { id: true, title: true, status: true, isPublic: true },
    });
  }

  @Get(':id/download')
  async download(@CurrentUser() current: Me, @Param('id') id: string, @Res() res: Response) {
    const resource = await this.getVisible(id, current);
    await this.prisma.resource.update({
      where: { id },
      data: { downloads: { increment: 1 } },
    });
    return res.download(join(UPLOAD_DIR, resource.fileUrl), resource.fileName);
  }

  @Put(':id/rating')
  async rate(@CurrentUser() current: Me, @Param('id') id: string, @Body() dto: RateResourceDto) {
    const resource = await this.getVisible(id, current);
    if (resource.authorId === current.id) {
      throw new BadRequestException('Tu ne peux pas noter ta propre ressource');
    }
    if (!resource.isPublic) {
      throw new BadRequestException('Seules les ressources partagées peuvent être notées');
    }
    return this.prisma.rating.upsert({
      where: { userId_resourceId: { userId: current.id, resourceId: id } },
      update: { value: dto.value, comment: dto.comment },
      create: { userId: current.id, resourceId: id, value: dto.value, comment: dto.comment },
      select: { value: true, comment: true },
    });
  }

  @Post(':id/favorite')
  async toggleFavorite(@CurrentUser() current: Me, @Param('id') id: string) {
    await this.getVisible(id, current);
    const key = { userId_resourceId: { userId: current.id, resourceId: id } };
    const existing = await this.prisma.favorite.findUnique({ where: key });
    if (existing) {
      await this.prisma.favorite.delete({ where: key });
      return { favorite: false };
    }
    await this.prisma.favorite.create({ data: { userId: current.id, resourceId: id } });
    return { favorite: true };
  }

  @Post(':id/report')
  async report(@CurrentUser() current: Me, @Param('id') id: string, @Body() dto: ReportResourceDto) {
    const resource = await this.getVisible(id, current);
    if (resource.authorId === current.id) {
      throw new BadRequestException('Tu ne peux pas signaler ta propre ressource');
    }
    const already = await this.prisma.report.findFirst({
      where: { userId: current.id, resourceId: id, resolved: false },
    });
    if (already) throw new BadRequestException('Tu as déjà signalé cette ressource');

    await this.prisma.report.create({
      data: { userId: current.id, resourceId: id, reason: dto.reason.trim() },
    });
    return { reported: true };
  }
}