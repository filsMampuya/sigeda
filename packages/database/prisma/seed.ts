import { PrismaClient, DepartmentType } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const adminRole = await prisma.role.upsert({
    where: { code: "ADMIN" },
    update: {},
    create: { code: "ADMIN", name: "Administrateur" }
  });

  for (const role of [
    ["DIRECTEUR_GENERAL", "Directeur General"],
    ["DIRECTEUR", "Directeur"],
    ["MANAGER", "Manager"],
    ["AGENT", "Agent"],
    ["AUDITEUR", "Auditeur"]
  ] as const) {
    await prisma.role.upsert({
      where: { code: role[0] },
      update: {},
      create: { code: role[0], name: role[1] }
    });
  }

  const dg = await prisma.department.upsert({
    where: { code: "DG" },
    update: {},
    create: {
      code: "DG",
      designation: "Direction Generale",
      type: DepartmentType.DIRECTION_GENERALE
    }
  });

  const direction = await prisma.department.upsert({
    where: { code: "DIR_FIN" },
    update: {},
    create: {
      code: "DIR_FIN",
      designation: "Direction des Finances",
      type: DepartmentType.DIRECTION,
      parentId: dg.id
    }
  });

  const service = await prisma.department.upsert({
    where: { code: "SRV_COMPTA" },
    update: {},
    create: {
      code: "SRV_COMPTA",
      designation: "Service Comptabilite",
      type: DepartmentType.SERVICE,
      parentId: direction.id
    }
  });

  const bureau = await prisma.department.upsert({
    where: { code: "B_CADRE" },
    update: {},
    create: {
      code: "B_CADRE",
      designation: "Bureau du Cadre",
      type: DepartmentType.BUREAU,
      parentId: service.id
    }
  });

  await prisma.user.upsert({
    where: { email: "admin@sigeda.local" },
    update: {},
    create: {
      keycloakId: "seed-admin",
      matricule: "ADM-001",
      email: "admin@sigeda.local",
      nom: "ADMIN",
      prenom: "SIGEDA",
      roleId: adminRole.id,
      departmentId: bureau.id
    }
  });
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  });
