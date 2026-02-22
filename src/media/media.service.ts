import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Media } from '../entities/media.entity';
import type { PaginatedResponse } from '../common/interfaces/paginated-response.interface';
import { buildPaginatedResponse } from '../common/interfaces/paginated-response.interface';
import { getPaginationParams } from '../common/dto/pagination-query.dto';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class MediaService {
  private readonly uploadDir = path.join(process.cwd(), 'uploads');

  constructor(
    @InjectRepository(Media)
    private mediaRepository: Repository<Media>,
  ) {
    // Ensure upload directory exists
    this.ensureUploadDirectory();
  }

  private ensureUploadDirectory() {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async uploadFile(
    file: Express.Multer.File,
    metadata?: Record<string, any>,
  ): Promise<Media> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Generate unique filename (sanitize originalname to prevent path traversal)
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const safeBasename = path.basename(file.originalname || 'file').replace(/\.\./g, '');
    const fileExtension = path.extname(safeBasename) || '';
    const fileName = `${timestamp}-${randomString}${fileExtension}`;
    const filePath = path.join(this.uploadDir, fileName);

    // Save file to disk
    fs.writeFileSync(filePath, file.buffer);

    // Create relative URL for API access
    const url = `/uploads/${fileName}`;

    // Prepare metadata
    const metaJson = {
      originalName: file.originalname,
      size: file.size,
      ...metadata,
    };

    // Save media record to database
    const media = this.mediaRepository.create({
      url,
      mimeType: file.mimetype,
      metaJson,
    });

    return await this.mediaRepository.save(media);
  }

  async uploadMultipleFiles(
    files: Express.Multer.File[],
    metadata?: Record<string, any>,
  ): Promise<Media[]> {
    const mediaFiles: Media[] = [];

    for (const file of files) {
      const media = await this.uploadFile(file, metadata);
      mediaFiles.push(media);
    }

    return mediaFiles;
  }

  async findAll(page?: number, limit?: number): Promise<PaginatedResponse<Media>> {
    const { take, skip, page: p, limit: l } = getPaginationParams(page, limit);
    const [data, total] = await this.mediaRepository.findAndCount({
      where: { deletedAt: IsNull() },
      order: { createdAt: 'DESC' },
      take,
      skip,
    });
    return buildPaginatedResponse(data, total, p, l);
  }

  async findOne(id: number): Promise<Media> {
    const media = await this.mediaRepository.findOne({
      where: { id, deletedAt: IsNull() },
    });
    if (!media) {
      throw new NotFoundException(`Media with ID ${id} not found`);
    }
    return media;
  }

  async remove(id: number): Promise<void> {
    const media = await this.findOne(id);

    // Delete physical file
    const fileName = path.basename(media.url);
    const filePath = path.join(this.uploadDir, fileName);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Soft delete from database
    await this.mediaRepository.softDelete(id);
  }

  async updateMetadata(
    id: number,
    metadata: Record<string, any>,
  ): Promise<Media> {
    const media = await this.findOne(id);
    media.metaJson = { ...media.metaJson, ...metadata };
    return await this.mediaRepository.save(media);
  }

  getFilePath(url: string): string {
    const fileName = path.basename(url);
    return path.join(this.uploadDir, fileName);
  }
}


