import type { Request, Response } from "express";
import type { ISettingService } from "../services/interfaces/setting.service.interface.js";
import type { UpdateEmailDomainsRequest } from "../types/requests/update-email-domains-request.model.js";
import type { EmailDomainsResponse } from "../types/responses/email-domains-response.model.js";

export class SettingsController {
  constructor(private readonly settingService: ISettingService) {}

  public getEmailDomains = async (_req: Request, res: Response): Promise<void> => {
    try {
      const domains = await this.settingService.getAllowedEmailDomains();
      const body: EmailDomainsResponse = { domains };
      res.status(200).json(body);
    } catch (error: unknown) {
      res.status(500).json({
        error: error instanceof Error ? error.message : "Error al obtener la configuración",
      });
    }
  };

  public updateEmailDomains = async (req: Request, res: Response): Promise<void> => {
    try {
      const data: UpdateEmailDomainsRequest = req.body;
      const domains = await this.settingService.setAllowedEmailDomains(data.domains);
      const body: EmailDomainsResponse = { domains };
      res.status(200).json(body);
    } catch (error: unknown) {
      res.status(500).json({
        error: error instanceof Error ? error.message : "Error al actualizar la configuración",
      });
    }
  };
}
