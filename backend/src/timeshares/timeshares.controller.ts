import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards, ValidationPipe } from '@nestjs/common';
import { TimesharesService } from './timeshares.service';
import { SuitesService } from '../suites/suites.service';
import { PromotionsService } from '../promotions/promotions.service';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CreateSharePlanDto, UpdateSharePlanDto } from './dto/shareplan.dto';

@Controller('timeshares')
export class TimesharesController {
  private suites = new SuitesService();

  constructor(
    private readonly service: TimesharesService,
    private readonly promotions: PromotionsService
  ) {}

  @Get()
  async list() {
    const plans = await this.service.list();
    const active = await this.promotions.listActive();
    if (!active.length) return plans;
    const suites = (await this.suites.list()) as any[];
    const typeBySuite = Object.fromEntries(suites.map((s) => [s.id, s.type]));
    return Promise.all(
      plans.map(async (p: any) => {
        const d = await this.promotions.discountForPlan(p, p.suiteId ? typeBySuite[p.suiteId] : null);
        return d ? { ...p, ...d } : p;
      })
    );
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    const plan: any = await this.service.get(id);
    if (!plan) return plan;
    let suiteType: string | null = null;
    if (plan.suiteId) {
      const suite: any = await this.suites.get(plan.suiteId);
      suiteType = suite?.type ?? null;
    }
    const d = await this.promotions.discountForPlan(plan, suiteType);
    return d ? { ...plan, ...d } : plan;
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('admin')
  async create(@Body(new ValidationPipe({ whitelist: true })) body: CreateSharePlanDto) {
    const id = (body?.id ?? '').trim();
    if (!id) return { ok: false, error: 'missing_id' };
    return this.service.create({ ...(body as any), id });
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async update(@Param('id') id: string, @Body(new ValidationPipe({ whitelist: true })) body: UpdateSharePlanDto) {
    return this.service.update(id, body as any);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async remove(@Param('id') id: string) {
    const ok = await this.service.remove(id);
    return { ok };
  }

  @Delete('admin/blank')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async removeBlank() {
    const removed = await this.service.cleanupBlank();
    return { ok: true, removed };
  }
}

