import prisma from "../config/prisma.js";

class UserService {
  async create(data: any, tx?: any) {
    const db = tx || prisma;
    return await db.user.create({ data });
  }

  async findByAnyIdentifierAndRole(identifier: string) {
    try {
      const user = await prisma.user.findFirst({
        where: {
          OR: [{ email: identifier }, { identifier: identifier }],
        },
        include: { role: true },
      });

      return user;
    } catch (error: any) {
      throw new Error("Invalid credentials");
    }
  }

  async findByIdWithRole(id: string) {
    try {
      const user = await prisma.user.findFirst({
        where: {
          id,
        },
        include: { role: true },
      });

      return user;
    } catch (error: any) {
      throw new Error("Invalid credentials");
    }
  }
}

export default new UserService();
