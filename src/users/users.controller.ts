import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { Roles } from 'src/authentication/decorator/roles.decorator';
import { Role } from 'src/authentication/enum/role.enum';
import { UpdateUserDTO } from './dto/update-user.dto';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/authentication/guard/jwt-auth.guard';
import { RoleGuard } from 'src/authentication/guard/role.guard';
import { SearchUserDTO } from './dto/search-user.dto';

@ApiTags('Users') // Groups this under "Users" in Swagger
@ApiBearerAuth() // Enables Bearer token authentication in Swagger
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // Get all users
  @ApiOperation({ summary: 'Get all users (Admin only)' })
  @ApiResponse({ status: 200, description: 'List of users' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden (Admins only)' })
  @UseGuards(JwtAuthGuard, RoleGuard) // Ensures authentication & role-based access
  @Roles(Role.Admin) // Restricts access to Admins only
  @Get()
  async users() {
    return this.usersService.users();
  }

  // Search user
  @ApiOperation({ summary: 'Search users by first name with pagination' })
  @ApiResponse({ status: 200, description: 'List of matching users' })
  @ApiResponse({ status: 400, description: 'Bad Request: Missing firstName' })
  @Get('search')
  async searchUser(@Query() query: SearchUserDTO) {
    const { firstName, page = 1, limit = 10 } = query;

    if (!firstName) {
      throw new BadRequestException('Please provide a first name to search.');
    }

    return this.usersService.searchUser(firstName, +page, +limit);
  }

  // Get user by id
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiParam({ name: 'id', description: 'User ID', example: 1 })
  @ApiResponse({ status: 200, description: 'User details' })
  @ApiResponse({ status: 400, description: 'Invalid ID' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @Get(':id')
  async userById(@Param('id', ParseIntPipe) id: number) {
    const user = await this.usersService.userById(id);

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found.`);
    }

    return user;
  }

  // Update user by id
  @ApiOperation({ summary: 'Update user by ID (Admin only)' })
  @ApiParam({ name: 'id', description: 'User ID', example: 1 })
  @ApiResponse({
    status: 200,
    description: 'User updated successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid ID or input' })
  @ApiResponse({ status: 403, description: 'Forbidden (Admins only)' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @UseGuards(JwtAuthGuard, RoleGuard) // Ensures authentication & role-based access
  @Roles(Role.Admin) // Restricts access to Admins only
  @Put(':id')
  async updateUser(
    @Param('id', ParseIntPipe) id: number, // Ensures ID is a number
    @Body() updateUserDto: UpdateUserDTO,
  ) {
    const user = await this.usersService.updateUser(id, updateUserDto);

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found.`);
    }

    return user;
  }

  // Delete user by id
  @ApiOperation({ summary: 'Delete user by ID (Admin only)' })
  @ApiParam({ name: 'id', description: 'User ID', example: 1 })
  @ApiResponse({ status: 200, description: 'User deleted successfully' })
  @ApiResponse({ status: 400, description: 'Invalid ID' })
  @ApiResponse({ status: 403, description: 'Forbidden (Admins only)' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @UseGuards(JwtAuthGuard, RoleGuard) // Ensures authentication & role-based access
  @Roles(Role.Admin) // Restricts access to Admins only
  @Delete(':id')
  async delete(@Param('id', ParseIntPipe) id: number) {
    const deleted = await this.usersService.delete(id);

    if (!deleted) {
      throw new NotFoundException(`User with ID ${id} not found.`);
    }

    return { message: `User with ID ${id} has been deleted successfully.` };
  }
}
