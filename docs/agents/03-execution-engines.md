# Execution & Evaluation Engines

## 8. Motor de ejecución de código (`execution.service.ts`)

El corazón del sistema. Flujo interno:

1. Recibe `languageId`, archivos (Base64), `stdin` (Base64 opcional).
2. Busca el lenguaje en BD → obtiene imagen Docker y comando de ejecución.
3. Si la imagen no existe localmente, la descarga del registry.
4. Crea un contenedor **efímero** con restricciones estrictas:
   - 128 MB RAM, sin swap
   - CPU quota 50000
   - PID limit 30
   - Red deshabilitada
   - WorkingDir `/app`
5. Empaqueta los archivos de código y stdin en un **tar stream** y los copia al contenedor.
6. Arranca el contenedor y espera máximo **10 segundos** (SIGKILL si excede).
7. Lee los logs (stdout/stderr), destruye el contenedor.
8. Retorna: `status` (SUCCESS / TIME_LIMIT_EXCEEDED / COMPILE_ERROR / RUNTIME_ERROR), `stdout`, `stderr`, `timeMs`.

---

## 9. Motor de evaluación (`evaluation.service.ts`)

1. Recibe casos de prueba y archivos de código.
2. Itera cada caso de prueba, ejecutando el código con `executionService.runCodeWithFiles`.
3. Clasifica el resultado:
   - **COMPILE_ERROR / RUNTIME_ERROR** → aborta, calificación 0.
   - **TIME_LIMIT_EXCEEDED** → aborta, calificación 0.
   - **SUCCESS** → compara `stdout` con `expectedOutput` (decodificado de Base64).
4. Cuenta tests pasados vs totales.
5. Calcula `finalGrade = (passedTests / totalTests) * 100` (redondeado a 2 decimales).
