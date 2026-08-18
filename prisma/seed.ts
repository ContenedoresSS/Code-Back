import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, User } from "@prisma/client";
import * as bcrypt from "bcrypt";

const prismaClientSingleton = () => {
  const connectionString = `${process.env.DATABASE_URL}`;
  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
};

declare global {
  var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>;
}

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

if (process.env.NODE_ENV !== "production") {
  globalThis.prismaGlobal = prisma;
}

const ROLES = ["God", "Student", "Teacher"];

const LANGUAGES = [
  {
    name: "C++",
    editorIdentifier: "cpp",
    version: "13.2",
    dockerImage: "gcc:13.2",
    executionCommand: "g++ -o solution *.cpp && ./solution",
    fileExtension: "cpp",
  },
  {
    name: "Python",
    editorIdentifier: "python",
    version: "3.11",
    dockerImage: "python:3.11-slim",
    executionCommand: "python3 ${file}",
    fileExtension: "py",
  },
  {
    name: "Node.js",
    editorIdentifier: "javascript",
    version: "20",
    dockerImage: "node:20-slim",
    executionCommand: "node ${file}",
    fileExtension: "js",
  },
  {
    name: "Java",
    editorIdentifier: "java",
    version: "21-slim",
    dockerImage: "openjdk:21-ea-jdk-slim",
    executionCommand: "javac *.java && java $(basename ${file} .java)",
    fileExtension: "java",
  },
];

async function seedRoles(): Promise<void> {
  for (const name of ROLES) {
    await prisma.role.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }
  console.log(`  ✔ Roles configurados (${ROLES.join(", ")}).`);
}

async function upsertUser(profile: {
  email: string;
  name: string;
  lastName: string;
  role: string;
  passwordHash: string;
}) {
  return prisma.user.upsert({
    where: { email: profile.email },
    update: {},
    create: {
      email: profile.email,
      name: profile.name,
      lastName: profile.lastName,
      passwordHash: profile.passwordHash,
      role: { connect: { name: profile.role } },
    },
  });
}

async function seedUsers(hashedPassword: string) {
  const adminUser = await upsertUser({
    email: "admin@admin.com",
    name: "Admin",
    lastName: "Master",
    role: "God",
    passwordHash: hashedPassword,
  });
  const teacherUser = await upsertUser({
    email: "profesor@uady.mx",
    name: "Alan",
    lastName: "Turing",
    role: "Teacher",
    passwordHash: hashedPassword,
  });
  const studentUser = await upsertUser({
    email: "estudiante@uady.mx",
    name: "Von",
    lastName: "Neumann",
    role: "Student",
    passwordHash: hashedPassword,
  });

  return { adminUser, teacherUser, studentUser };
}

async function seedAppSettings(): Promise<void> {
  await prisma.appSetting.upsert({
    where: { key: "allowedEmailDomains" },
    update: {},
    create: {
      key: "allowedEmailDomains",
      value: ["alumnos.uady.mx", "uady.mx"],
    },
  });
  console.log("  ✔ Dominios de correo permitidos (alumnos.uady.mx, uady.mx).");
}

async function seedLanguages(): Promise<void> {
  for (const lang of LANGUAGES) {
    await prisma.programmingLanguage.upsert({
      where: { name_version: { name: lang.name, version: lang.version } },
      update: {},
      create: lang,
    });
  }
  console.log("  ✔ Lenguajes configurados.");
}

async function seedSubject(teacher: User) {
  let subject = await prisma.subject.findFirst({
    where: { name: "Estructuras de Datos", userId: teacher.id },
  });

  if (!subject) {
    subject = await prisma.subject.create({
      data: { name: "Estructuras de Datos", userId: teacher.id },
    });
    console.log(`  ✔ Curso "${subject.name}" creado.`);
  } else {
    console.log(`  ✔ Curso "${subject.name}" ya existía.`);
  }

  return subject;
}

async function seedEnrollment(student: User, subjectId: number): Promise<void> {
  const existing = await prisma.enrollment.findFirst({
    where: { studentId: student.id, subjectId },
  });

  if (!existing) {
    await prisma.enrollment.create({
      data: { studentId: student.id, subjectId },
    });
    console.log(`  ✔ Alumno ${student.name} inscrito.`);
  }
}

async function seedActivity(teacher: User, subjectId: number): Promise<void> {
  const cppLang = await prisma.programmingLanguage.findUnique({
    where: { name_version: { name: "C++", version: "13.2" } },
  });

  if (!cppLang) {
    console.log("  Lenguaje C++ no encontrado, saltando actividades.");
    return;
  }

  const existing = await prisma.activity.findFirst({
    where: { title: "Suma de dos números", subjectId },
  });

  if (existing) {
    console.log(`  ✔ Actividad "${existing.title}" ya existía.`);
    return;
  }

  const activity = await prisma.activity.create({
    data: {
      professorId: teacher.id,
      subjectId,
      languageId: cppLang.id,
      title: "Suma de dos números",
      description:
        "Escribe un programa en C++ que lea dos enteros por entrada estándar y devuelva su suma.",
      maxAttempts: 5,
      rules: { allowCopy: true, allowPaste: true },
      starterCode: [
        {
          name: "main.cpp",
          content:
            "I2luY2x1ZGUgPGlvc3RyZWFtPgp1c2luZyBuYW1lc3BhY2Ugc3RkOwppbnQgbWFpbigpIHsKICAgIC8vIFR1IGNvZGlnbyBhcXVpCiAgICByZXR1cm4gMDsKfQ==",
        },
      ],
    },
  });

  await prisma.testCase.createMany({
    data: [
      { activityId: activity.id, input: "NQo3", expectedOutput: "MTI=", isHidden: false },
      { activityId: activity.id, input: "MTAwCi0yNQ==", expectedOutput: "NzU=", isHidden: true },
    ],
  });
  console.log(`  ✔ Actividad "${activity.title}" creada con 2 casos de prueba.`);
}

async function main(): Promise<void> {
  console.log("=========================================");
  console.log("🌱 INICIANDO SEEDING DE LA BASE DE DATOS");
  console.log("=========================================");

  const defaultPassword = "AdminPassword123!!";
  const hashedPassword = await bcrypt.hash(defaultPassword, 10);

  await seedRoles();
  await seedAppSettings();
  const { teacherUser, studentUser } = await seedUsers(hashedPassword);
  await seedLanguages();

  const subject = await seedSubject(teacherUser);
  await seedEnrollment(studentUser, subject.id);
  await seedActivity(teacherUser, subject.id);

  console.log("\n=========================================");
  console.log("SEEDING COMPLETADO CON ÉXITO");
  console.log(`Contraseña para todos los usuarios: ${defaultPassword}`);
  console.log("=========================================\n");
}

main()
  .catch((e) => {
    console.error("\nERROR DURANTE EL SEEDING:");
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
