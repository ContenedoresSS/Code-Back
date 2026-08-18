import type { Request, Response } from "express";
import settingService from "../services/setting.service.js";
import type { UpdateEmailDomainsRequest } from "../types/requests/update-email-domains-request.model.js";
import type { EmailDomainsResponse } from "../types/responses/email-domains-response.model.js";

class SettingsController {
  public async getEmailDomains(_req: Request, res: Response): Promise<void> {
    try {
      const domains = await settingService.getAllowedEmailDomains();
      const body: EmailDomainsResponse = { domains };
      res.status(200).json(body);
    } catch (error: unknown) {
      res.status(500).json({
        error: error instanceof Error ? error.message : "Error al obtener la configuración",
      });
    }
  }

  public async updateEmailDomains(req: Request, res: Response): Promise<void> {
    try {
      const data: UpdateEmailDomainsRequest = req.body;
      const domains = await settingService.setAllowedEmailDomains(data.domains);
      const body: EmailDomainsResponse = { domains };
      res.status(200).json(body);
    } catch (error: unknown) {
      res.status(500).json({
        error: error instanceof Error ? error.message : "Error al actualizar la configuración",
      });
    }
  }
}

export default new SettingsController();
