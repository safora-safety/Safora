import { Router } from "express";
import {
  triggerSOS,
  getContacts,
  addContact,
  deleteContact,
  checkGuardian,
  testGuardian,
} from "../controllers/sosController";
import { authMiddleware } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { sosAlertSchema, trustedContactSchema } from "../validation/schemas";

const router = Router();

router.use(authMiddleware as any);

// SOS
router.post("/", validateBody(sosAlertSchema), triggerSOS);

// Guardian verification and test alert
router.get("/check-guardian", checkGuardian);
router.post("/test-guardian", testGuardian);

// Trusted Contacts
router.get("/contacts", getContacts);
router.post("/contacts", validateBody(trustedContactSchema), addContact);
router.delete("/contacts/:id", deleteContact);

export default router;
