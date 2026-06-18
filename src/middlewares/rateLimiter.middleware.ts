import rateLimit from "express-rate-limit";

export const executionLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error:
        "Has excedido el límite de ejecuciones. Por favor, espera cinco antes de volver a intentarlo.",
    });
  },
});
