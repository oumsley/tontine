import { Controller, Get, HttpCode, Param, Post, UseGuards } from "@nestjs/common";
import type { NotificationSummary, UnreadCount } from "@bingmoney/shared";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { JwtPayload } from "../auth/interfaces/jwt-payload.interface";
import { AdminGuard } from "../common/guards/admin.guard";
import { NotificationsService } from "./notifications.service";

@Controller("notifications")
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  list(@CurrentUser() user: JwtPayload): Promise<NotificationSummary[]> {
    return this.notificationsService.list(user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Get("unread-count")
  async unreadCount(@CurrentUser() user: JwtPayload): Promise<UnreadCount> {
    const count = await this.notificationsService.unreadCount(user.sub);
    return { count };
  }

  @UseGuards(JwtAuthGuard)
  @Post(":id/read")
  @HttpCode(204)
  async markRead(@CurrentUser() user: JwtPayload, @Param("id") id: string): Promise<void> {
    await this.notificationsService.markRead(user.sub, id);
  }

  @UseGuards(JwtAuthGuard)
  @Post("read-all")
  @HttpCode(204)
  async markAllRead(@CurrentUser() user: JwtPayload): Promise<void> {
    await this.notificationsService.markAllRead(user.sub);
  }

  // Simulates the daily cron a real deployment would schedule; exposed as
  // an admin-guarded endpoint until a scheduler is wired up.
  @UseGuards(AdminGuard)
  @Post("run-reminders")
  runReminders(): Promise<{ created: number }> {
    return this.notificationsService.runReminders();
  }
}
