import { PrismaClient, DepartmentType, FolderStatus } from "@prisma/client";

const prisma = new PrismaClient();
const demoYear = Number.parseInt(process.env.SIGEDA_DEMO_YEAR ?? String(new Date().getFullYear()), 10);

const roleDefinitions = [
  ["ADMIN", "Administrateur"],
  ["DIRECTEUR_GENERAL", "Directeur General"],
  ["DIRECTEUR", "Directeur"],
  ["MANAGER", "Manager"],
  ["AGENT", "Agent"],
  ["AUDITEUR", "Auditeur"]
] as const;

const departmentDefinitions = {
  dg: {
    code: "DG",
    designation: "Direction Generale",
    type: DepartmentType.DIRECTION_GENERALE
  },
  dgBureau: {
    code: "B_DG",
    designation: "Bureau du Directeur General",
    type: DepartmentType.BUREAU
  },
  technique: {
    code: "DIR_TECH",
    designation: "Direction Technique",
    type: DepartmentType.DIRECTION
  },
  techniqueService: {
    code: "SRV_TECH",
    designation: "Service Technique",
    type: DepartmentType.SERVICE
  },
  techniqueBureau: {
    code: "BUR_TECH",
    designation: "Bureau Technique",
    type: DepartmentType.BUREAU
  },
  commerciale: {
    code: "DIR_COM",
    designation: "Direction Commerciale",
    type: DepartmentType.DIRECTION
  },
  commercialeService: {
    code: "SRV_COM",
    designation: "Service Commercial",
    type: DepartmentType.SERVICE
  },
  commercialeBackofficeService: {
    code: "SRV_COM_BO",
    designation: "Service Back Office Commercial",
    type: DepartmentType.SERVICE
  },
  commercialeBureau: {
    code: "BUR_COM",
    designation: "Bureau Commercial",
    type: DepartmentType.BUREAU
  },
  commercialeBackofficeBureau: {
    code: "BUR_COM_BO",
    designation: "Bureau Back Office Commercial",
    type: DepartmentType.BUREAU
  },
  finances: {
    code: "DIR_FIN",
    designation: "Direction des Finances",
    type: DepartmentType.DIRECTION
  },
  comptaService: {
    code: "SRV_COMPTA",
    designation: "Service Comptabilite",
    type: DepartmentType.SERVICE
  },
  comptaBureau: {
    code: "B_CADRE",
    designation: "Bureau du Cadre",
    type: DepartmentType.BUREAU
  },
  comptaAnnexe: {
    code: "BUR_COMPTA_ANN",
    designation: "Bureau Comptable Annexe",
    type: DepartmentType.BUREAU
  },
  tresoService: {
    code: "SRV_TRESO",
    designation: "Service Tresorerie Demo",
    type: DepartmentType.SERVICE
  },
  tresoBureau: {
    code: "BUR_TRESO",
    designation: "Bureau Tresorerie Demo",
    type: DepartmentType.BUREAU
  },
  administrative: {
    code: "DIR_ADM",
    designation: "Direction Administrative",
    type: DepartmentType.DIRECTION
  },
  administrativeService: {
    code: "SRV_ADM",
    designation: "Service Administratif",
    type: DepartmentType.SERVICE
  },
  administrativeBureau: {
    code: "BUR_ADM",
    designation: "Bureau Administratif",
    type: DepartmentType.BUREAU
  }
} as const;

const userDefinitions = [
  {
    keycloakId: "00000000-0000-0000-0000-000000000001",
    matricule: "ADM-001",
    email: "admin@sigeda.local",
    nom: "SIGEDA",
    prenom: "ADMIN",
    roleCode: "ADMIN",
    departmentCode: "B_DG"
  },
  {
    keycloakId: "00000000-0000-0000-0000-000000000002",
    matricule: "DG-001",
    email: "dg.demo@sigeda.local",
    nom: "Direction",
    prenom: "Generale",
    roleCode: "DIRECTEUR_GENERAL",
    departmentCode: "B_DG"
  },
  {
    keycloakId: "00000000-0000-0000-0000-000000000003",
    matricule: "DIR-TECH-001",
    email: "directeur.technique@sigeda.local",
    nom: "Directeur",
    prenom: "Technique",
    roleCode: "DIRECTEUR",
    departmentCode: "BUR_TECH"
  },
  {
    keycloakId: "00000000-0000-0000-0000-000000000004",
    matricule: "DIR-COM-001",
    email: "directeur.commerciale@sigeda.local",
    nom: "Directeur",
    prenom: "Commerciale",
    roleCode: "DIRECTEUR",
    departmentCode: "BUR_COM"
  },
  {
    keycloakId: "00000000-0000-0000-0000-000000000005",
    matricule: "DIR-FIN-001",
    email: "directeur.finance@sigeda.local",
    nom: "Directeur",
    prenom: "Finance",
    roleCode: "DIRECTEUR",
    departmentCode: "B_CADRE"
  },
  {
    keycloakId: "00000000-0000-0000-0000-000000000006",
    matricule: "MNG-TECH-001",
    email: "manager.technique@sigeda.local",
    nom: "Manager",
    prenom: "Technique",
    roleCode: "MANAGER",
    departmentCode: "BUR_TECH"
  },
  {
    keycloakId: "00000000-0000-0000-0000-000000000007",
    matricule: "MNG-COM-001",
    email: "manager.commercial@sigeda.local",
    nom: "Manager",
    prenom: "Commercial",
    roleCode: "MANAGER",
    departmentCode: "BUR_COM"
  },
  {
    keycloakId: "00000000-0000-0000-0000-000000000008",
    matricule: "MNG-CPT-001",
    email: "manager.compta@sigeda.local",
    nom: "Manager",
    prenom: "Compta",
    roleCode: "MANAGER",
    departmentCode: "B_CADRE"
  },
  {
    keycloakId: "00000000-0000-0000-0000-000000000009",
    matricule: "AGT-TECH-001",
    email: "agent.technique@sigeda.local",
    nom: "Agent",
    prenom: "Technique",
    roleCode: "AGENT",
    departmentCode: "BUR_TECH"
  },
  {
    keycloakId: "00000000-0000-0000-0000-000000000010",
    matricule: "AGT-COM-001",
    email: "agent.commercial@sigeda.local",
    nom: "Agent",
    prenom: "Commercial",
    roleCode: "AGENT",
    departmentCode: "BUR_COM"
  },
  {
    keycloakId: "00000000-0000-0000-0000-000000000011",
    matricule: "AGT-FIN-001",
    email: "agent.cadre@sigeda.local",
    nom: "Agent",
    prenom: "Cadre",
    roleCode: "AGENT",
    departmentCode: "B_CADRE"
  },
  {
    keycloakId: "00000000-0000-0000-0000-000000000012",
    matricule: "AGT-FIN-002",
    email: "agent.annexe@sigeda.local",
    nom: "Agent",
    prenom: "Annexe",
    roleCode: "AGENT",
    departmentCode: "BUR_COMPTA_ANN"
  },
  {
    keycloakId: "00000000-0000-0000-0000-000000000013",
    matricule: "AGT-TRE-001",
    email: "agent.treso@sigeda.local",
    nom: "Agent",
    prenom: "Tresorerie",
    roleCode: "AGENT",
    departmentCode: "BUR_TRESO"
  },
  {
    keycloakId: "00000000-0000-0000-0000-000000000014",
    matricule: "AGT-ADM-001",
    email: "agent.administratif@sigeda.local",
    nom: "Agent",
    prenom: "Administratif",
    roleCode: "AGENT",
    departmentCode: "BUR_ADM"
  },
  {
    keycloakId: "00000000-0000-0000-0000-000000000015",
    matricule: "AUD-001",
    email: "auditeur.demo@sigeda.local",
    nom: "Auditeur",
    prenom: "Demo",
    roleCode: "AUDITEUR",
    departmentCode: "B_DG"
  }
] as const;

async function main() {
  const roles = new Map<string, { id: string }>();

  for (const [code, name] of roleDefinitions) {
    const role = await prisma.role.upsert({
      where: { code },
      update: { name },
      create: { code, name }
    });
    roles.set(code, role);
  }

  const departments = await seedDepartments();
  await seedUsers(roles, departments);
  await seedFolders(departments);

  console.log(
    JSON.stringify(
      {
        status: "ok",
        demoYear,
        departments: departments.size,
        users: userDefinitions.length
      },
      null,
      2
    )
  );
}

async function seedDepartments() {
  const departments = new Map<string, { id: string; code: string; type: DepartmentType; directionId: string | null }>();

  const dg = await prisma.department.upsert({
    where: { code: departmentDefinitions.dg.code },
    update: {
      designation: departmentDefinitions.dg.designation,
      type: departmentDefinitions.dg.type,
      parentId: null,
      directionId: null,
      serviceId: null
    },
    create: {
      code: departmentDefinitions.dg.code,
      designation: departmentDefinitions.dg.designation,
      type: departmentDefinitions.dg.type
    }
  });
  departments.set(dg.code, dg);

  const topDirections = await Promise.all(
    [departmentDefinitions.technique, departmentDefinitions.commerciale, departmentDefinitions.finances, departmentDefinitions.administrative].map(
      (definition) =>
        prisma.department.upsert({
          where: { code: definition.code },
          update: {
            designation: definition.designation,
            type: definition.type,
            parentId: dg.id,
            directionId: null,
            serviceId: null
          },
          create: {
            code: definition.code,
            designation: definition.designation,
            type: definition.type,
            parentId: dg.id
          }
        })
    )
  );

  for (const department of topDirections) {
    departments.set(department.code, department);
  }

  const dgBureau = await prisma.department.upsert({
    where: { code: departmentDefinitions.dgBureau.code },
    update: {
      designation: departmentDefinitions.dgBureau.designation,
      type: DepartmentType.BUREAU,
      parentId: dg.id,
      directionId: dg.id,
      serviceId: null
    },
    create: {
      code: departmentDefinitions.dgBureau.code,
      designation: departmentDefinitions.dgBureau.designation,
      type: DepartmentType.BUREAU,
      parentId: dg.id,
      directionId: dg.id
    }
  });
  departments.set(dgBureau.code, dgBureau);

  const serviceDefinitions = [
    { definition: departmentDefinitions.techniqueService, directionCode: departmentDefinitions.technique.code },
    { definition: departmentDefinitions.commercialeService, directionCode: departmentDefinitions.commerciale.code },
    { definition: departmentDefinitions.commercialeBackofficeService, directionCode: departmentDefinitions.commerciale.code },
    { definition: departmentDefinitions.comptaService, directionCode: departmentDefinitions.finances.code },
    { definition: departmentDefinitions.tresoService, directionCode: departmentDefinitions.finances.code },
    { definition: departmentDefinitions.administrativeService, directionCode: departmentDefinitions.administrative.code }
  ] as const;

  for (const { definition, directionCode } of serviceDefinitions) {
    const direction = departments.get(directionCode);
    if (!direction) {
      throw new Error(`Direction introuvable pour ${definition.code}`);
    }

    const service = await prisma.department.upsert({
      where: { code: definition.code },
      update: {
        designation: definition.designation,
        type: DepartmentType.SERVICE,
        parentId: direction.id,
        directionId: direction.id,
        serviceId: null
      },
      create: {
        code: definition.code,
        designation: definition.designation,
        type: DepartmentType.SERVICE,
        parentId: direction.id,
        directionId: direction.id
      }
    });
    departments.set(service.code, service);
  }

  const bureauDefinitions = [
    { definition: departmentDefinitions.techniqueBureau, serviceCode: departmentDefinitions.techniqueService.code },
    { definition: departmentDefinitions.commercialeBureau, serviceCode: departmentDefinitions.commercialeService.code },
    { definition: departmentDefinitions.commercialeBackofficeBureau, serviceCode: departmentDefinitions.commercialeBackofficeService.code },
    { definition: departmentDefinitions.comptaBureau, serviceCode: departmentDefinitions.comptaService.code },
    { definition: departmentDefinitions.comptaAnnexe, serviceCode: departmentDefinitions.comptaService.code },
    { definition: departmentDefinitions.tresoBureau, serviceCode: departmentDefinitions.tresoService.code },
    { definition: departmentDefinitions.administrativeBureau, serviceCode: departmentDefinitions.administrativeService.code }
  ] as const;

  for (const { definition, serviceCode } of bureauDefinitions) {
    const service = departments.get(serviceCode);
    if (!service) {
      throw new Error(`Service introuvable pour ${definition.code}`);
    }

    const bureau = await prisma.department.upsert({
      where: { code: definition.code },
      update: {
        designation: definition.designation,
        type: DepartmentType.BUREAU,
        parentId: service.id,
        directionId: service.directionId,
        serviceId: service.id
      },
      create: {
        code: definition.code,
        designation: definition.designation,
        type: DepartmentType.BUREAU,
        parentId: service.id,
        directionId: service.directionId,
        serviceId: service.id
      }
    });
    departments.set(bureau.code, bureau);
  }

  return departments;
}

async function seedUsers(
  roles: Map<string, { id: string }>,
  departments: Map<string, { id: string; code: string; type: DepartmentType }>
) {
  for (const definition of userDefinitions) {
    const role = roles.get(definition.roleCode);
    const department = departments.get(definition.departmentCode);

    if (!role || !department) {
      throw new Error(`Configuration utilisateur incomplete pour ${definition.email}`);
    }

    await prisma.user.upsert({
      where: { email: definition.email },
      update: {
        keycloakId: definition.keycloakId,
        matricule: definition.matricule,
        nom: definition.nom,
        prenom: definition.prenom,
        roleId: role.id,
        departmentId: department.id,
        isActive: true
      },
      create: {
        keycloakId: definition.keycloakId,
        matricule: definition.matricule,
        email: definition.email,
        nom: definition.nom,
        prenom: definition.prenom,
        roleId: role.id,
        departmentId: department.id,
        isActive: true
      }
    });
  }
}

async function seedFolders(departments: Map<string, { id: string; code: string; type: DepartmentType; directionId: string | null }>) {
  const topLevelDirections = Array.from(departments.values()).filter((department) =>
    [DepartmentType.DIRECTION_GENERALE, DepartmentType.DIRECTION].includes(department.type)
  );
  const bureaux = Array.from(departments.values()).filter((department) => department.type === DepartmentType.BUREAU);

  for (const bureau of bureaux) {
    const ownerDirectionId = bureau.directionId;
    if (!ownerDirectionId) {
      continue;
    }

    for (const partnerDirection of topLevelDirections) {
      if (partnerDirection.id === ownerDirectionId) {
        continue;
      }

      await prisma.folder.upsert({
        where: {
          year_bureauId_ownerDirectionId_partnerDirectionId: {
            year: demoYear,
            bureauId: bureau.id,
            ownerDirectionId,
            partnerDirectionId: partnerDirection.id
          }
        },
        update: {
          accessibleBureauIds: [bureau.id],
          status: FolderStatus.ACTIVE
        },
        create: {
          year: demoYear,
          bureauId: bureau.id,
          accessibleBureauIds: [bureau.id],
          ownerDirectionId,
          partnerDirectionId: partnerDirection.id,
          status: FolderStatus.ACTIVE
        }
      });
    }
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
