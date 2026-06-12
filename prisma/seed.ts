import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, User, ProgrammingLanguage } from "@prisma/client";
import * as bcrypt from "bcrypt";

// ==========================================
// 1. CONFIGURACIÓN DE PRISMA
// ==========================================
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

// ==========================================
// 2. FUNCIONES MODULARES DE SEEDING
// ==========================================

async function seedRoles() {
  console.log("\n[1/4] Verificando y creando Roles...");
  const roles = ["God", "Student", "Teacher"];

  for (const roleName of roles) {
    await prisma.role.upsert({
      where: { name: roleName },
      update: {},
      create: { name: roleName },
    });
  }
  console.log("  ✔ Roles configurados (God, Student, Teacher).");
}

async function seedUsers(hashedPassword: string) {
  console.log("\n[2/4] Creando Usuarios por Defecto...");

  const adminUser = await prisma.user.upsert({
    where: { email: "admin@admin.com" },
    update: {},
    create: {
      email: "admin@admin.com",
      name: "Admin",
      lastName: "Master",
      passwordHash: hashedPassword,
      role: { connect: { name: "God" } },
    },
  });
  console.log(`  ✔ God:     ${adminUser.email}`);

  const teacherUser = await prisma.user.upsert({
    where: { email: "profesor@uady.mx" },
    update: {},
    create: {
      email: "profesor@uady.mx",
      name: "Alan",
      lastName: "Turing",
      passwordHash: hashedPassword,
      role: { connect: { name: "Teacher" } },
    },
  });
  console.log(`  ✔ Teacher: ${teacherUser.email}`);

  const studentUser = await prisma.user.upsert({
    where: { email: "estudiante@uady.mx" },
    update: {},
    create: {
      email: "estudiante@uady.mx",
      name: "Von",
      lastName: "Neumann",
      passwordHash: hashedPassword,
      role: { connect: { name: "Student" } },
    },
  });
  console.log(`  ✔ Student: ${studentUser.email}`);

  return { adminUser, teacherUser, studentUser };
}

async function seedLanguages() {
  console.log("\n[3/4] Registrando Lenguajes de Programación...");

  const languages = [
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
      editorIdentifier: "python", // Corregido
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

  for (const lang of languages) {
    await prisma.programmingLanguage.upsert({
      where: { name_version: { name: lang.name, version: lang.version } },
      update: {},
      create: lang,
    });
  }
  console.log("  ✔ Lenguajes configurados (C++, Python, Node.js, Java).");
}

async function seedSubjectsAndActivities(teacher: User, student: User) {
  console.log("\n[4/4] Configurando Cursos, Inscripciones y Actividades...");

  const cppLang = await prisma.programmingLanguage.findUnique({
    where: { name_version: { name: "C++", version: "13.2" } },
  });

  if (!cppLang) {
    console.log("  Lenguaje C++ no encontrado, saltando creación de actividades.");
    return;
  }

  // 1. Crear Materia
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

  // 2. Inscribir Alumno
  let enrollment = await prisma.enrollment.findFirst({
    where: { studentId: student.id, subjectId: subject.id },
  });

  if (!enrollment) {
    await prisma.enrollment.create({
      data: { studentId: student.id, subjectId: subject.id },
    });
    console.log(`  ✔ Alumno ${student.name} inscrito en "${subject.name}".`);
  }

  // 3. Crear Actividad y Casos de Prueba
  let activity = await prisma.activity.findFirst({
    where: { title: "Suma de dos números", subjectId: subject.id },
  });

  if (!activity) {
    activity = await prisma.activity.create({
      data: {
        professorId: teacher.id,
        subjectId: subject.id,
        languageId: cppLang.id,
        title: "Suma de dos números",
        description:
          "Escribe un programa en C++ que lea dos enteros por entrada estándar y devuelva su suma.",
        maxAttempts: 5,
        allowCopy: true,
        allowPaste: true,
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
  } else {
    console.log(`  ✔ Actividad "${activity.title}" ya existía.`);
  }
}

// ==========================================
// 3. ORQUESTADOR PRINCIPAL
// ==========================================
async function main() {
  console.log("=========================================");
  console.log("🌱 INICIANDO SEEDING DE LA BASE DE DATOS");
  console.log("=========================================");

  const defaultPassword = "AdminPassword123!!";
  const hashedPassword = await bcrypt.hash(defaultPassword, 10);

  // Ejecutamos los módulos en orden
  await seedRoles();
  const { teacherUser, studentUser } = await seedUsers(hashedPassword);
  await seedLanguages();
  await seedSubjectsAndActivities(teacherUser, studentUser);

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
