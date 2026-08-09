import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Employee } from '../entities/employee.entity';
import { Attendance } from '../entities/attendance.entity';
import { EmployeesService } from './employees.service';
import { EmployeesController } from './employees.controller';
import { AttendancesService } from './attendances.service';
import { AttendancesController } from './attendances.controller';
import { GuardsModule } from '../common/guards/guards.module';

@Module({
  imports: [TypeOrmModule.forFeature([Employee, Attendance]), GuardsModule],
  providers: [EmployeesService, AttendancesService],
  controllers: [EmployeesController, AttendancesController],
  exports: [EmployeesService, AttendancesService],
})
export class EmployeesModule {}
