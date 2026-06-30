import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Attendance, AttendanceStatus } from '../entities/attendance.entity';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';
import type { PaginatedResponse } from '../common/interfaces/paginated-response.interface';
import { buildPaginatedResponse } from '../common/interfaces/paginated-response.interface';
import { getPaginationParams } from '../common/dto/pagination-query.dto';

function normalizeUtcDateOnly(value: string | Date): Date {
  const iso = typeof value === 'string' ? value : value.toISOString();
  const dateOnly = iso.split('T')[0];
  return new Date(`${dateOnly}T00:00:00.000Z`);
}

@Injectable()
export class AttendancesService {
  constructor(
    @InjectRepository(Attendance)
    private attendanceRepository: Repository<Attendance>,
  ) {}

  async create(createAttendanceDto: CreateAttendanceDto): Promise<Attendance> {
    // Check if attendance already exists for this employee on this date
    const dateObj = normalizeUtcDateOnly(createAttendanceDto.date);
    const existing = await this.attendanceRepository.findOne({
      where: {
        employeeId: createAttendanceDto.employeeId,
        date: dateObj,
      },
    });

    if (existing) {
      throw new ConflictException('Attendance already recorded for this employee on this date');
    }

    const attendance = this.attendanceRepository.create({
      ...createAttendanceDto,
      date: dateObj,
    });
    return await this.attendanceRepository.save(attendance);
  }

  async findAll(
    employeeId?: number,
    date?: string,
    page?: number,
    limit?: number,
  ): Promise<PaginatedResponse<Attendance>> {
    const where: Record<string, unknown> = {};
    if (employeeId !== undefined) {
      where.employeeId = employeeId;
    }
    if (date) {
      where.date = normalizeUtcDateOnly(date);
    }
    const { take, skip, page: p, limit: l } = getPaginationParams(page, limit);
    const [data, total] = await this.attendanceRepository.findAndCount({
      where,
      relations: ['employee'],
      order: { date: 'DESC' },
      take,
      skip,
    });
    return buildPaginatedResponse(data, total, p, l);
  }

  async findOne(id: number): Promise<Attendance> {
    const attendance = await this.attendanceRepository.findOne({
      where: { id },
      relations: ['employee'],
    });
    if (!attendance) {
      throw new NotFoundException(`Attendance with ID ${id} not found`);
    }
    return attendance;
  }

  async update(id: number, updateAttendanceDto: UpdateAttendanceDto): Promise<Attendance> {
    const attendance = await this.findOne(id);
    Object.assign(attendance, updateAttendanceDto);
    return await this.attendanceRepository.save(attendance);
  }

  async remove(id: number): Promise<void> {
    await this.findOne(id);
    await this.attendanceRepository.delete(id);
  }
}
