import { prisma } from "../db";
import { AppError } from "../errors";

export const SOCIETY_CATEGORIES = [
  "Technology",
  "Arts & Culture",
  "Sports",
  "Academic",
  "Social Welfare",
  "Business",
  "Literary",
  "Other",
] as const;

export type SocietyCategory = (typeof SOCIETY_CATEGORIES)[number];

export async function getSocieties(params?: { category?: string; query?: string }) {
  const where: any = {};

  if (params?.category && params.category !== "ALL") {
    where.category = params.category;
  }

  if (params?.query) {
    const q = params.query.trim();
    where.OR = [
      { name: { contains: q } },
      { description: { contains: q } },
    ];
  }

  return prisma.society.findMany({
    where,
    include: {
      president: {
        select: { id: true, name: true, email: true },
      },
      _count: {
        select: {
          memberships: { where: { status: "APPROVED" } },
          events: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getSocietyById(id: string) {
  const society = await prisma.society.findUnique({
    where: { id },
    include: {
      president: {
        select: { id: true, name: true, email: true },
      },
      _count: {
        select: {
          memberships: { where: { status: "APPROVED" } },
          events: true,
        },
      },
    },
  });

  if (!society) {
    throw new AppError("SOCIETY_NOT_FOUND", "Society not found", 404);
  }

  return society;
}

export async function getPresidentSociety(presidentId: string) {
  return prisma.society.findUnique({
    where: { presidentId },
    include: {
      president: {
        select: { id: true, name: true, email: true },
      },
      _count: {
        select: {
          memberships: { where: { status: "APPROVED" } },
          events: true,
        },
      },
    },
  });
}

export async function createSociety(
  presidentId: string,
  data: {
    name: string;
    description: string;
    category: string;
    contactEmail: string;
    contactPhone?: string | null;
  }
) {
  // Check if president already owns a society (exactly ONE per president)
  const existingForPresident = await prisma.society.findUnique({
    where: { presidentId },
  });

  if (existingForPresident) {
    throw new AppError(
      "ALREADY_HAS_SOCIETY",
      "President already owns a society. You can only create one society.",
      400
    );
  }

  // Validate category
  if (!SOCIETY_CATEGORIES.includes(data.category as SocietyCategory)) {
    throw new AppError("INVALID_CATEGORY", "Invalid society category specified.", 400);
  }

  // Check unique name
  const existingByName = await prisma.society.findUnique({
    where: { name: data.name.trim() },
  });

  if (existingByName) {
    throw new AppError("NAME_TAKEN", "A society with this name already exists.", 400);
  }

  return prisma.society.create({
    data: {
      name: data.name.trim(),
      description: data.description.trim(),
      category: data.category,
      contactEmail: data.contactEmail.trim().toLowerCase(),
      contactPhone: data.contactPhone ? data.contactPhone.trim() : null,
      presidentId,
    },
  });
}

export async function updateSociety(
  presidentId: string,
  societyId: string,
  data: {
    name?: string;
    description?: string;
    category?: string;
    contactEmail?: string;
    contactPhone?: string | null;
    logoUrl?: string | null;
  }
) {
  const society = await prisma.society.findUnique({
    where: { id: societyId },
  });

  if (!society) {
    throw new AppError("SOCIETY_NOT_FOUND", "Society not found", 404);
  }

  if (society.presidentId !== presidentId) {
    throw new AppError("FORBIDDEN", "You do not have permission to edit this society.", 403);
  }

  const updateData: any = {};

  if (data.name && data.name.trim() !== society.name) {
    const existing = await prisma.society.findUnique({
      where: { name: data.name.trim() },
    });
    if (existing && existing.id !== societyId) {
      throw new AppError("NAME_TAKEN", "A society with this name already exists.", 400);
    }
    updateData.name = data.name.trim();
  }

  if (data.description !== undefined) updateData.description = data.description.trim();
  if (data.category) {
    if (!SOCIETY_CATEGORIES.includes(data.category as SocietyCategory)) {
      throw new AppError("INVALID_CATEGORY", "Invalid society category.", 400);
    }
    updateData.category = data.category;
  }
  if (data.contactEmail !== undefined) updateData.contactEmail = data.contactEmail.trim().toLowerCase();
  if (data.contactPhone !== undefined) updateData.contactPhone = data.contactPhone;
  if (data.logoUrl !== undefined) updateData.logoUrl = data.logoUrl;

  return prisma.society.update({
    where: { id: societyId },
    data: updateData,
  });
}
