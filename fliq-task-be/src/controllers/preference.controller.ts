import { type Request, type Response } from "express";

import crypto from "crypto";
import { createPreferenceSchema } from "../types/preference.type.js";
import db from "../db/db.js";

export const createPreference = (req: Request, res: Response) => {
  try {
    const { name, email, dateTime, phoneNumber, timeZone } = createPreferenceSchema.parse(
      req.body
    );

    const id = crypto.randomUUID();

    db.preferences.push({ id, name, email, dateTime, phoneNumber, timeZone });

    res.status(201).json({
      message: "Preference created successfully",
      preference: { id, name, email, dateTime, phoneNumber, timeZone },
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

    const { name, email, dateTime, phoneNumber, timeZone } = createPreferenceSchema.parse(
      req.body
    );

    preference.name = name;
    preference.email = email;
    preference.dateTime = dateTime;
    preference.phoneNumber = phoneNumber;
    if (timeZone !== undefined) {
      preference.timeZone = timeZone;
    }
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
