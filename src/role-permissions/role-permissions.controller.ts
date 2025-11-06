import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RolePermissionsService } from './role-permissions.service';
import { AssignPermissionsDto } from './dto/assign-permissions.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('role-permissions')
@Controller('roles/:roleId/permissions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class RolePermissionsController {
  constructor(
    private readonly rolePermissionsService: RolePermissionsService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Assign permissions to a role' })
  assignPermissions(
    @Param('roleId') roleId: string,
    @Body() assignPermissionsDto: AssignPermissionsDto,
  ) {
    return this.rolePermissionsService.assignPermissions(
      +roleId,
      assignPermissionsDto,
    );
  }

  @Get()
  @ApiOperation({ summary: 'Get all permissions for a role' })
  getRolePermissions(@Param('roleId') roleId: string) {
    return this.rolePermissionsService.getRolePermissions(+roleId);
  }

  @Post('permission/:permissionId')
  @ApiOperation({ summary: 'Add a single permission to a role' })
  addPermission(
    @Param('roleId') roleId: string,
    @Param('permissionId') permissionId: string,
  ) {
    return this.rolePermissionsService.addPermission(+roleId, +permissionId);
  }

  @Delete('permission/:permissionId')
  @ApiOperation({ summary: 'Remove a permission from a role' })
  removePermission(
    @Param('roleId') roleId: string,
    @Param('permissionId') permissionId: string,
  ) {
    return this.rolePermissionsService.removePermission(+roleId, +permissionId);
  }
}


