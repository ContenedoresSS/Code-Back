import { createContainer, asClass, asFunction, asValue, InjectionMode } from "awilix";
import type { AwilixContainer } from "awilix";
import { AuthService } from "../services/auth.service.js";
import { ExecutionService } from "../services/execution.service.js";
import { EvaluationService } from "../services/evaluation.service.js";
import { SubmissionService } from "../services/submission.service.js";
import { ActivityService } from "../services/activity.service.js";
import { TestCaseService } from "../services/test-case.service.js";
import { EnrollmentService } from "../services/enrollment.service.js";
import { InvitationService } from "../services/invitation.service.js";
import { ProgrammingLanguageService } from "../services/programming-language.service.js";
import { SettingService } from "../services/setting.service.js";
import { TokenService } from "../services/token.service.js";
import { UserService } from "../services/user.service.js";
import { SubjectService } from "../services/subject.service.js";
import mailProviderFactory from "../services/mail/mail-provider.factory.js";
import mailTemplateService from "../services/mail/mail-template.service.js";
import { AuthController } from "../controllers/auth.controller.js";
import { ActivityController } from "../controllers/activity.controller.js";
import { SubjectController } from "../controllers/subject.controller.js";
import { EnrollmentController } from "../controllers/enrollment.controller.js";
import { InvitationController } from "../controllers/invitation.controller.js";
import { ExecutionController } from "../controllers/execution.controller.js";
import { ProgrammingLanguageController } from "../controllers/programming-language.controller.js";
import { SettingsController } from "../controllers/settings.controller.js";
import { SubmissionController } from "../controllers/submission.controller.js";
import { TestCaseController } from "../controllers/test-case.controller.js";
import { UserController } from "../controllers/user.controller.js";
import { UserAdminController } from "../controllers/user-admin.controller.js";
import { createAuthenticate, createOptionalAuthenticate } from "../middlewares/auth.middleware.js";
import { createRbac } from "../middlewares/rbac.middleware.js";

export interface Cradle {
  authService: AuthService;
  executionService: ExecutionService;
  evaluationService: EvaluationService;
  submissionService: SubmissionService;
  activityService: ActivityService;
  testCaseService: TestCaseService;
  enrollmentService: EnrollmentService;
  invitationService: InvitationService;
  programmingLanguageService: ProgrammingLanguageService;
  settingService: SettingService;
  tokenService: TokenService;
  userService: UserService;
  subjectService: SubjectService;
  mailProviderFactory: typeof mailProviderFactory;
  mailTemplateService: typeof mailTemplateService;
  authController: AuthController;
  activityController: ActivityController;
  subjectController: SubjectController;
  enrollmentController: EnrollmentController;
  invitationController: InvitationController;
  executionController: ExecutionController;
  programmingLanguageController: ProgrammingLanguageController;
  settingsController: SettingsController;
  submissionController: SubmissionController;
  testCaseController: TestCaseController;
  userController: UserController;
  userAdminController: UserAdminController;
  authenticate: ReturnType<typeof createAuthenticate>;
  optionalAuthenticate: ReturnType<typeof createOptionalAuthenticate>;
  rbac: ReturnType<typeof createRbac>;
}

export type AppContainer = AwilixContainer<Cradle>;

export const container: AppContainer = createContainer<Cradle>({
  injectionMode: InjectionMode.CLASSIC,
});

container.register({
  authService: asClass(AuthService).singleton(),
  executionService: asClass(ExecutionService).singleton(),
  evaluationService: asClass(EvaluationService).singleton(),
  submissionService: asClass(SubmissionService).singleton(),
  activityService: asClass(ActivityService).singleton(),
  testCaseService: asClass(TestCaseService).singleton(),
  enrollmentService: asClass(EnrollmentService).singleton(),
  invitationService: asClass(InvitationService).singleton(),
  programmingLanguageService: asClass(ProgrammingLanguageService).singleton(),
  settingService: asClass(SettingService).singleton(),
  tokenService: asClass(TokenService).singleton(),
  userService: asClass(UserService).singleton(),
  subjectService: asClass(SubjectService).singleton(),
  mailProviderFactory: asValue(mailProviderFactory),
  mailTemplateService: asValue(mailTemplateService),
  authController: asClass(AuthController).singleton(),
  activityController: asClass(ActivityController).singleton(),
  subjectController: asClass(SubjectController).singleton(),
  enrollmentController: asClass(EnrollmentController).singleton(),
  invitationController: asClass(InvitationController).singleton(),
  executionController: asClass(ExecutionController).singleton(),
  programmingLanguageController: asClass(ProgrammingLanguageController).singleton(),
  settingsController: asClass(SettingsController).singleton(),
  submissionController: asClass(SubmissionController).singleton(),
  testCaseController: asClass(TestCaseController).singleton(),
  userController: asClass(UserController).singleton(),
  userAdminController: asClass(UserAdminController).singleton(),
  authenticate: asFunction(createAuthenticate).singleton(),
  optionalAuthenticate: asFunction(createOptionalAuthenticate).singleton(),
  rbac: asFunction(createRbac).singleton(),
});
