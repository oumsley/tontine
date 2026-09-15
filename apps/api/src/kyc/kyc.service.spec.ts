import { Test } from "@nestjs/testing";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { KycStatus } from "@bingmoney/shared";
import { KycService } from "./kyc.service";
import { PrismaService } from "../prisma/prisma.service";
import { KycStorageService } from "./storage/kyc-storage.service";
import { NotificationsService } from "../notifications/notifications.service";

describe("KycService", () => {
  let service: KycService;
  let prisma: {
    user: Record<string, jest.Mock>;
    kycDocument: Record<string, jest.Mock>;
  };
  let storage: { saveDocument: jest.Mock };
  let notifications: { notify: jest.Mock };

  beforeEach(async () => {
    prisma = {
      user: { findUnique: jest.fn(), update: jest.fn() },
      kycDocument: { create: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
    };
    storage = { saveDocument: jest.fn().mockResolvedValue("/uploads/kyc/user-1/file.jpg") };
    notifications = { notify: jest.fn().mockResolvedValue(true) };

    const moduleRef = await Test.createTestingModule({
      providers: [
        KycService,
        { provide: PrismaService, useValue: prisma },
        { provide: KycStorageService, useValue: storage },
        { provide: NotificationsService, useValue: notifications },
      ],
    }).compile();

    service = moduleRef.get(KycService);
  });

  describe("submit", () => {
    it("rejects when the user does not exist", async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.submit("user-1", "Aïcha Diallo", "a", "b")).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it("rejects when identity is already verified", async () => {
      prisma.user.findUnique.mockResolvedValue({ id: "user-1", kycStatus: KycStatus.VERIFIED });
      await expect(service.submit("user-1", "Aïcha Diallo", "a", "b")).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it("stores both documents and moves the user to PENDING", async () => {
      prisma.user.findUnique.mockResolvedValue({ id: "user-1", kycStatus: KycStatus.UNVERIFIED });
      prisma.kycDocument.create.mockResolvedValue({
        status: KycStatus.PENDING,
        submittedAt: new Date("2026-01-01T00:00:00Z"),
      });
      prisma.user.update.mockResolvedValue({});

      const result = await service.submit("user-1", "Aïcha Diallo", "id-b64", "selfie-b64");

      expect(storage.saveDocument).toHaveBeenCalledWith("user-1", "id", "id-b64");
      expect(storage.saveDocument).toHaveBeenCalledWith("user-1", "selfie", "selfie-b64");
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: "user-1" },
        data: { fullName: "Aïcha Diallo", kycStatus: KycStatus.PENDING },
      });
      expect(result.status).toBe(KycStatus.PENDING);
    });
  });

  describe("getStatus", () => {
    it("returns UNVERIFIED when no submission exists", async () => {
      prisma.kycDocument.findFirst.mockResolvedValue(null);
      const result = await service.getStatus("user-1");
      expect(result.status).toBe(KycStatus.UNVERIFIED);
    });
  });

  describe("review", () => {
    it("rejects when there is no pending submission", async () => {
      prisma.kycDocument.findFirst.mockResolvedValue(null);
      await expect(service.review("user-1", KycStatus.VERIFIED)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it("marks the document verified and syncs the user status", async () => {
      prisma.kycDocument.findFirst.mockResolvedValue({
        id: "doc-1",
        submittedAt: new Date("2026-01-01T00:00:00Z"),
      });
      prisma.kycDocument.update.mockResolvedValue({});
      prisma.user.update.mockResolvedValue({});

      const result = await service.review("user-1", KycStatus.VERIFIED);

      expect(prisma.kycDocument.update).toHaveBeenCalledWith({
        where: { id: "doc-1" },
        data: { status: KycStatus.VERIFIED, reviewedAt: expect.any(Date), rejectionReason: null },
      });
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: "user-1" },
        data: { kycStatus: KycStatus.VERIFIED, trustScore: 60 },
      });
      expect(result.status).toBe(KycStatus.VERIFIED);
      expect(notifications.notify).not.toHaveBeenCalled();
    });

    it("records a rejection reason and notifies the user an action is required", async () => {
      prisma.kycDocument.findFirst.mockResolvedValue({
        id: "doc-1",
        submittedAt: new Date("2026-01-01T00:00:00Z"),
      });
      prisma.kycDocument.update.mockResolvedValue({});
      prisma.user.update.mockResolvedValue({});

      const result = await service.review("user-1", KycStatus.REJECTED, "Photo illisible");

      expect(result.rejectionReason).toBe("Photo illisible");
      expect(notifications.notify).toHaveBeenCalledWith(
        expect.objectContaining({ userId: "user-1", type: "KYC_ACTION_REQUIRED" }),
      );
    });
  });
});
