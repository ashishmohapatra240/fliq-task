import { type Request, type Response } from "express";

import crypto from "crypto";
import { createPreferenceSchema, updatePreferenceSchema } from "../types/preference.type.js";
import db from "../db/db.js";
import type { Preference } from "../db/db.js";

export const createPreference = (req: Request, res: Response) => {
  try {
    const { name, email, dateTime, phoneNumber, timeZone } = createPreferenceSchema.parse(
      req.body
    );

    const id = crypto.randomUUID();

    const preference: Preference = { id, name, email, dateTime, phoneNumber };
    if (timeZone) {
      preference.timeZone = timeZone;
    }
    db.preferences.push(preference);

    res.status(201).json({
      message: "Preference created successfully",
      preference: preference,
    });
  } catch (error) {
    res.status(500).json({ message: "Internal server error", error: error });
  }
};

export const getPreferences = (req: Request, res: Response) => {
  try {
    res.json(db.preferences);
  } catch (error) {
    res.status(500).json({ message: "Internal server error", error: error });
  }
};

export const updatePreference = (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const preference = db.preferences.find(
      (preference) => preference.id === id
    );
    if (!preference) {
      return res.status(404).json({ message: "Preference not found" });
    }

    const parsed = updatePreferenceSchema.parse(req.body);

    if (parsed.name !== undefined) preference.name = parsed.name;
    if (parsed.email !== undefined) preference.email = parsed.email;
    if (parsed.dateTime !== undefined) preference.dateTime = parsed.dateTime;
    if (parsed.phoneNumber !== undefined) preference.phoneNumber = parsed.phoneNumber;
    if (parsed.timeZone !== undefined) preference.timeZone = parsed.timeZone;
    res
      .status(200)
      .json({
        message: "Preference updated successfully",
        preference: preference,
      });
  } catch (error) {
    res.status(500).json({ message: "Internal server error", error: error });
  }
};

export const deletePreference = (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const preference = db.preferences.find(
      (preference) => preference.id === id
    );
    if (!preference) {
      return res.status(404).json({ message: "Preference not found" });
    }
    db.preferences = db.preferences.filter(
      (preference) => preference.id !== id
    );
    res.status(200).json({ message: "Preference deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Internal server error", error: error });
  }
};
