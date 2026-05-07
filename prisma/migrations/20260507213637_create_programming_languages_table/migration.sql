-- CreateTable
CREATE TABLE "programming_languages" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "version" VARCHAR(20) NOT NULL,
    "docker_image" VARCHAR(255) NOT NULL,
    "execution_command" VARCHAR(255) NOT NULL,
    "file_extension" VARCHAR(10) NOT NULL,

    CONSTRAINT "programming_languages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "programming_languages_name_version_key" ON "programming_languages"("name", "version");
