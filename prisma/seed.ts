import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
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

async function main() {
  console.log("Initializing seeding...");

  const roles = ["God", "Student", "Teacher"];

  console.log("Creating Roles...");
  for (const roleName of roles) {
    await prisma.role.upsert({
      where: { name: roleName },
      update: {},
      create: { name: roleName },
    });
  }

  console.log("Creating users...");

  const saltRounds = 10;
  const defaultPassword = "AdminPassword123!!";
  const hashedPassword = await bcrypt.hash(defaultPassword, saltRounds);

  // Usuario God
  const adminUser = await prisma.user.upsert({
    where: { email: "admin@admin.com" },
    update: {},
    create: {
      email: "admin@admin.com",
      name: "Admin",
      lastName: "Master",
      passwordHash: hashedPassword,
      role: {
        connect: { name: "God" },
      },
    },
  });
  console.log(`God user created: ${adminUser.email} with password: ${defaultPassword}`);

  //Usuario Teacher
  const teacherUser = await prisma.user.upsert({
    where: { email: "profesor@uady.mx" },
    update: {},
    create: {
      email: "profesor@uady.mx",
      name: "Alan",
      lastName: "Turing",
      passwordHash: hashedPassword,
      role: {
        connect: { name: "Teacher" },
      },
    },
  });
  console.log(`Teacher user created: ${teacherUser.email} with password: ${defaultPassword}`);

  console.log("Adding default languages (C++, Python, Node.js)...");
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
      editorIdentifier: "cpp",
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

  const cppLang = await prisma.programmingLanguage.findUnique({
    where: { name_version: { name: "C++", version: "13.2" } },
  });

  if (cppLang) {
    console.log("Creating default Subject...");
    let subject = await prisma.subject.findFirst({
      where: { name: "Estructuras de Datos", userId: teacherUser.id },
    });

    if (!subject) {
      subject = await prisma.subject.create({
        data: {
          name: "Estructuras de Datos",
          userId: teacherUser.id,
        },
      });
    }

    console.log("Creating default Activity and Test Cases...");
    let activity = await prisma.activity.findFirst({
      where: { title: "Suma de dos números", subjectId: subject.id },
    });

    if (!activity) {
      activity = await prisma.activity.create({
        data: {
          professorId: teacherUser.id,
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
              // "int main() { \n // Tu codigo aqui \n return 0; \n}"
              content:
                "I2luY2x1ZGUgPGlvc3RyZWFtPgp1c2luZyBuYW1lc3BhY2Ugc3RkOwppbnQgbWFpbigpIHsKICAgIC8vIFR1IGNvZGlnbyBhcXVpCiAgICByZXR1cm4gMDsKfQ==",
            },
          ],
        },
      });

      await prisma.testCase.createMany({
        data: [
          {
            activityId: activity.id,
            input: "NQo3", // "5\n7"
            expectedOutput: "MTI=", // "12"
            isHidden: false,
          },
          {
            activityId: activity.id,
            input: "MTAwCi0yNQ==", // "100\n-25"
            expectedOutput: "NzU=", // "75"
            isHidden: true,
          },
        ],
      });
      console.log(`Activity created with ID: ${activity.id}`);
    }
  }

  console.log(`Successfully seeded database 🌱`);
}

main()
  .catch((e) => {
    console.error("Error ", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
