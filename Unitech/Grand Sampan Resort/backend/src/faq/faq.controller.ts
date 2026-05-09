import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards, ValidationPipe } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import {
  CreateFaqCategoryDto,
  CreateFaqEntryDto,
  ReorderFaqCategoriesDto,
  ReorderFaqEntriesDto,
  UpdateFaqCategoryDto,
  UpdateFaqEntryDto
} from './dto/faq.dto';
import { FaqService } from './faq.service';

@Controller('faq')
export class FaqController {
  constructor(private readonly service: FaqService) {}

  @Get()
  async list(@Query('q') q?: string, @Query('category') category?: string) {
    const items = await this.service.list({ q, category });
    const categories = await this.service.categories();
    return { ok: true, items, categories };
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async create(@Body(new ValidationPipe({ whitelist: true })) body: CreateFaqEntryDto) {
    const item = await this.service.create(body);
    return { ok: true, item };
  }

  @Get('categories')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async listCategories() {
    const categories = await this.service.listCategoryEntities();
    return { ok: true, categories };
  }

  @Post('categories')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async createCategory(@Body(new ValidationPipe({ whitelist: true })) body: CreateFaqCategoryDto) {
    const category = await this.service.createCategory({ name: body.name });
    return { ok: true, category };
  }

  @Put('categories/reorder')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async reorderCategories(@Body(new ValidationPipe({ whitelist: true })) body: ReorderFaqCategoriesDto) {
    const categories = await this.service.reorderCategories(body.orderedIds);
    return { ok: true, categories };
  }

  @Put('categories/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async updateCategory(@Param('id') id: string, @Body(new ValidationPipe({ whitelist: true })) body: UpdateFaqCategoryDto) {
    const category = await this.service.updateCategory(id, { name: body.name });
    return { ok: true, category };
  }

  @Delete('categories/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async deleteCategory(@Param('id') id: string) {
    await this.service.deleteCategory(id);
    return { ok: true };
  }

  @Put('reorder')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async reorder(@Body(new ValidationPipe({ whitelist: true })) body: ReorderFaqEntriesDto) {
    const items = await this.service.reorder(body.category, body.orderedIds);
    return { ok: true, items };
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async update(@Param('id') id: string, @Body(new ValidationPipe({ whitelist: true })) body: UpdateFaqEntryDto) {
    const item = await this.service.update(id, body);
    return { ok: true, item };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async remove(@Param('id') id: string) {
    await this.service.remove(id);
    return { ok: true };
  }
}
