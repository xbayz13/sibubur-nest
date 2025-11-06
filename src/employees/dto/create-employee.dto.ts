import { IsString, IsOptional, IsInt, IsEnum, IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { EmployeeStatus } from '../../entities/employee.entity';

export class CreateEmployeeDto {
  @ApiProperty({ example: 'John Doe' })
  @IsString()
  name: string;

  @ApiProperty({ example: 1, required: false })
  @IsOptional()
  @IsInt()
  storeId?: number;

  @ApiProperty({ enum: EmployeeStatus, default: EmployeeStatus.ACTIVE })
  @IsOptional()
  @IsEnum(EmployeeStatus)
  status?: EmployeeStatus;

  @ApiProperty({ example: 100000, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  dailySalary?: number;
}


