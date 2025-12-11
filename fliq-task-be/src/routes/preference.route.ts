import { Router } from "express";
import { createPreference, deletePreference, getPreferences, updatePreference } from "../controllers/preference.controller.js";

const router = Router();

router.post("/", createPreference);
router.get("/", getPreferences);
router.put("/:id", updatePreference);
router.delete("/:id", deletePreference);

export default router;