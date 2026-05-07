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

  console.log("Creating default user...");

  const saltRounds = 10;
  const defaultPassword = "AdminPassword123!!";
  const hashedPassword = await bcrypt.hash(defaultPassword, saltRounds);

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
  console.log(`God user created: ${adminUser.email}`);

  console.log("Adding default languages (C++, Python, Node.js)...");
  const languages = [
    {
      name: "C++",
      version: "13.2",
      dockerImage: "gcc:13.2",
      executionCommand: "g++ -o solution solution.cpp && ./solution",
      fileExtension: "cpp",
    },
    {
      name: "Python",
      version: "3.11",
      dockerImage: "python:3.11-slim",
      executionCommand: "python3 solution.py",
      fileExtension: "py",
    },
    {
      name: "Node.js",
      version: "20",
      dockerImage: "node:20-slim",
      executionCommand: "node solution.js",
      fileExtension: "js",
    },
  ];

  for (const lang of languages) {
    await prisma.programmingLanguage.upsert({
      where: { name_version: { name: lang.name, version: lang.version } },
      update: {},
      create: lang,
    });
  }

  console.log(`Successfully seed`);
}

main()
  .catch((e) => {
    console.error("Error ", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
