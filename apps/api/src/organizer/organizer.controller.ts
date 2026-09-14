import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import type { DisbursementRequestSummary, OrganizerStatus, OrganizerTontineDetail, OrganizerTontineSummary } from "@bingmoney/shared";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { JwtPayload } from "../auth/interfaces/jwt-payload.interface";
import { OrganizerService } from "./organizer.service";
import { ActivateOrganizerDto } from "./dto/activate-organizer.dto";
import { CreateTontineDto } from "./dto/create-tontine.dto";
import { RequestDisbursementDto } from "./dto/request-disbursement.dto";
import { ValidateDisbursementDto } from "./dto/validate-disbursement.dto";

@Controller("organizer")
export class OrganizerController {
  constructor(private readonly organizerService: OrganizerService) {}

  @UseGuards(JwtAuthGuard)
  @Get("status")
  getStatus(@CurrentUser() user: JwtPayload): Promise<OrganizerStatus> {
    return this.organizerService.getStatus(user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Post("activate")
  activate(@CurrentUser() user: JwtPayload, @Body() dto: ActivateOrganizerDto): Promise<OrganizerStatus> {
    return this.organizerService.activate(user.sub, dto.acceptedResponsibilities);
  }

  @UseGuards(JwtAuthGuard)
  @Post("tontines")
  createTontine(@CurrentUser() user: JwtPayload, @Body() dto: CreateTontineDto): Promise<OrganizerTontineSummary> {
    return this.organizerService.createTontine(user.sub, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get("tontines")
  listMyTontines(@CurrentUser() user: JwtPayload): Promise<OrganizerTontineSummary[]> {
    return this.organizerService.listMyTontines(user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Get("tontines/:id")
  getTontineDetail(@CurrentUser() user: JwtPayload, @Param("id") id: string): Promise<OrganizerTontineDetail> {
    return this.organizerService.getTontineDetail(user.sub, id);
  }

  @UseGuards(JwtAuthGuard)
  @Get("disbursements/pending")
  listPendingValidations(@CurrentUser() user: JwtPayload): Promise<DisbursementRequestSummary[]> {
    return this.organizerService.listPendingValidations(user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Post("tontines/:id/disbursements")
  requestDisbursement(
    @CurrentUser() user: JwtPayload,
    @Param("id") id: string,
    @Body() dto: RequestDisbursementDto,
  ): Promise<DisbursementRequestSummary> {
    return this.organizerService.requestDisbursement(user.sub, id, dto.cycleNumber);
  }

  @UseGuards(JwtAuthGuard)
  @Post("disbursements/:id/validate")
  validateDisbursement(
    @CurrentUser() user: JwtPayload,
    @Param("id") id: string,
    @Body() dto: ValidateDisbursementDto,
  ): Promise<DisbursementRequestSummary> {
    return this.organizerService.validateDisbursement(user.sub, id, dto);
  }
}
