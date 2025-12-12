"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  useCreatePreference,
  useGetPreference,
  useUpdatePreference,
  useDeletePreference,
} from "./hooks/usePreference";

interface Preference {
  id: string;
  name: string;
  email: string;
  phoneNumber: string;
  dateTime: string;
  timeZone?: string;
}

const FALLBACK_TIMEZONES = [
  "UTC",
  "Europe/London",
  "Europe/Berlin",
  "Asia/Tokyo",
  "Asia/Kolkata",
  "America/New_York",
  "America/Los_Angeles",
  "Australia/Sydney",
];

export default function Home() {
  const { mutate: createPreference } = useCreatePreference();
  const { mutate: updatePreference } = useUpdatePreference();
  const { mutate: deletePreference } = useDeletePreference();
  const { data: preferences = [], isLoading } = useGetPreference();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [phoneNumber, setPhoneNumber] = useState<string>("");
  const [dateTime, setDateTime] = useState<string>(() => {
    try {
      const systemTz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
      return new Date().toLocaleString("sv-SE", {
        timeZone: systemTz,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).replace(" ", "T");
    } catch {
      return new Date().toISOString().slice(0, 16);
    }
  });
  const [ipTimeZone, setIpTimeZone] = useState<string>("");
  const [ipTzError, setIpTzError] = useState<string | null>(null);

  const systemTimeZone = useMemo<string>(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    } catch {
      return "";
    }
  }, []);

  const timeZones = useMemo<string[]>(() => {
    const base =
      typeof Intl !== "undefined" &&
      typeof Intl.supportedValuesOf === "function"
        ? Intl.supportedValuesOf("timeZone")
        : FALLBACK_TIMEZONES;

    const ordered = [
      ipTimeZone,
      systemTimeZone,
      ...base.filter(Boolean),
    ].filter(Boolean);

    return Array.from(new Set(ordered));
  }, [systemTimeZone, ipTimeZone]);

  const [selectedTimeZone, setSelectedTimeZone] =
    useState<string>(systemTimeZone);
  const [now, setNow] = useState<Date>(() => new Date());

  const getTimezoneOffsetMinutes = (timeZone: string, date: Date): number => {
    const localeDate = new Date(
      date.toLocaleString("en-US", { timeZone, hour12: false })
    );
    return (localeDate.getTime() - date.getTime()) / 60000;
  };

  const convertToDateTimeLocal = useCallback(
    (date: Date, timeZone: string): string => {
      if (!timeZone) return "";

      const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).formatToParts(date);

      const get = (type: string) =>
        parts.find((p) => p.type === type)?.value || "";

      return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get(
        "minute"
      )}`;
    },
    []
  );

  const convertFromDateTimeLocal = (
    dateTimeLocal: string,
    timeZone: string
  ): string => {
    if (!dateTimeLocal || !timeZone) return "";

    const [datePart, timePart] = dateTimeLocal.split("T");
    if (!datePart || !timePart) return "";

    const dateParts = datePart.split("-").map(Number);
    const timeParts = timePart.split(":").map(Number);

    if (dateParts.length !== 3 || timeParts.length < 2) return "";
    if (dateParts.some(isNaN) || timeParts.some(isNaN)) return "";

    const [year, month, day] = dateParts;
    const [hour, minute] = timeParts;

    if (
      year < 1900 ||
      year > 2100 ||
      month < 1 ||
      month > 12 ||
      day < 1 ||
      day > 31 ||
      hour < 0 ||
      hour > 23 ||
      minute < 0 ||
      minute > 59
    ) {
      return "";
    }

    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    let candidateUTC;
    try {
      candidateUTC = new Date(Date.UTC(year, month - 1, day, hour, minute));
    } catch {
      return "";
    }

    for (let i = 0; i < 5; i++) {
      const formatted = formatter.format(candidateUTC);
      const parts = formatted.split(/[-T:]/).map(Number);

      if (
        parts[0] === year &&
        parts[1] === month &&
        parts[2] === day &&
        parts[3] === hour &&
        parts[4] === minute
      ) {
        return candidateUTC.toISOString();
      }

      const targetTime = new Date(Date.UTC(year, month - 1, day, hour, minute));
      const formattedTime = new Date(
        Date.UTC(parts[0], parts[1] - 1, parts[2], parts[3], parts[4])
      );
      const diffMs = targetTime.getTime() - formattedTime.getTime();
      candidateUTC = new Date(candidateUTC.getTime() + diffMs);

      if (Math.abs(diffMs) < 60000) break;
    }

    return candidateUTC.toISOString();
  };

  const detectUserTimeZone = useCallback((): string => {
    if (ipTimeZone && timeZones.includes(ipTimeZone)) {
      return ipTimeZone;
    }

    if (systemTimeZone && timeZones.includes(systemTimeZone)) {
      return systemTimeZone;
    }

    const now = new Date();
    const year = now.getFullYear();
    const checkDates = [
      now,
      new Date(Date.UTC(year, 0, 1, 12, 0, 0)),
      new Date(Date.UTC(year, 6, 1, 12, 0, 0)),
    ];

    const matchedZone =
      timeZones.find((tz) =>
        checkDates.every((date) => getTimezoneOffsetMinutes(tz, date) === 0)
      ) || timeZones[0];

    return matchedZone || "";
  }, [ipTimeZone, systemTimeZone, timeZones]);

  useEffect(() => {
    let cancelled = false;
    const fetchIpTimeZone = async () => {
      try {
        const response = await fetch("https://ipapi.co/timezone", {
          headers: { Accept: "text/plain" },
          cache: "no-store",
        });
        if (!response.ok) throw new Error("Failed to fetch IP timezone");
        const tzText = (await response.text()).trim();
        if (!cancelled && tzText) {
          setIpTimeZone(tzText);
          setIpTzError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setIpTzError("Could not detect timezone from IP");
        }
      }
    };
    fetchIpTimeZone();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ipTimeZone || editingId) return;
    if (selectedTimeZone === ipTimeZone) return;

    // Auto-select IP timezone when it loads
    setSelectedTimeZone(ipTimeZone);
    if (!editingId) {
      setDateTime(convertToDateTimeLocal(new Date(), ipTimeZone));
    }
  }, [ipTimeZone, editingId, selectedTimeZone, convertToDateTimeLocal]);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Initialize datetime when timezone changes and not editing
  useEffect(() => {
    if (selectedTimeZone && !editingId) {
      const currentTimeInTz = convertToDateTimeLocal(
        new Date(),
        selectedTimeZone
      );
      setDateTime(currentTimeInTz);
    }
  }, [selectedTimeZone, editingId, convertToDateTimeLocal]);

  const formattedDateTime = useMemo(() => {
    if (!selectedTimeZone) return "";
    try {
      return new Intl.DateTimeFormat("en-US", {
        dateStyle: "full",
        timeStyle: "long",
        timeZone: selectedTimeZone,
      }).format(now);
    } catch {
      return now.toLocaleString();
    }
  }, [now, selectedTimeZone]);

  const resetForm = () => {
    setName("");
    setEmail("");
    setPhoneNumber("");
    if (selectedTimeZone) {
      setDateTime(convertToDateTimeLocal(new Date(), selectedTimeZone));
    }
    setEditingId(null);
  };

  const handleEdit = (preference: Preference) => {
    setName(preference.name);
    setEmail(preference.email);
    setPhoneNumber(preference.phoneNumber);
    const prefDate = new Date(preference.dateTime);
    const zoneForEdit =
      preference.timeZone || selectedTimeZone || detectUserTimeZone();
    if (zoneForEdit) {
      setSelectedTimeZone(zoneForEdit);
      setDateTime(convertToDateTimeLocal(prefDate, zoneForEdit));
    }
    setEditingId(preference.id);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !email || !phoneNumber || !dateTime) {
      alert("Please fill in all required fields.");
      return;
    }

    // Use selected timezone or fallback to system timezone
    const effectiveTimeZone = selectedTimeZone || systemTimeZone || "UTC";

    let isoDateTime = "";
    if (effectiveTimeZone) {
      isoDateTime = convertFromDateTimeLocal(dateTime, effectiveTimeZone);
    }

    // Fallback if conversion failed
    if (!isoDateTime) {
      try {
        isoDateTime = new Date(dateTime).toISOString();
      } catch {
        alert("Invalid date/time format. Please select a valid date and time.");
        return;
      }
    }

    const formData = {
      name,
      email,
      phoneNumber,
      dateTime: isoDateTime,
      // timeZone: effectiveTimeZone,
    };

    if (editingId) {
      updatePreference({ id: editingId, data: formData });
    } else {
      createPreference(formData);
    }
    resetForm();
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this preference?")) {
      deletePreference(id);
    }
  };

  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-center">Preference Form</h1>

        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">
            {editingId ? "Edit Preference" : "Create New Preference"}
          </h2>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <input
              type="text"
              placeholder="Enter your name"
              className="border-2 border-gray-300 rounded-md p-2 focus:outline-none focus:border-neutral-200"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <input
              type="email"
              placeholder="Enter your email"
              className="border-2 border-gray-300 rounded-md p-2 focus:outline-none focus:border-neutral-200"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <input
              type="tel"
              placeholder="Enter your phone number"
              className="border-2 border-gray-300 rounded-md p-2 focus:outline-none focus:border-neutral-200"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              required
            />
            <select
              className="border-2 border-gray-300 rounded-md p-2 focus:outline-none focus:border-neutral-200"
              value={selectedTimeZone}
              onChange={(e) => {
                const newTz = e.target.value;
                setSelectedTimeZone(newTz);

                if (newTz && !editingId) {
                  setDateTime(convertToDateTimeLocal(new Date(), newTz));
                }
              }}
              required
            >
              {timeZones.map((timeZone) => (
                <option key={timeZone} value={timeZone}>
                  {timeZone}
                </option>
              ))}
            </select>

            {formattedDateTime && (
              <div className="text-sm text-gray-600 bg-gray-100 p-2 rounded">
                Current time in {selectedTimeZone}: {formattedDateTime}
              </div>
            )}

            <input
              type="datetime-local"
              className="border-2 border-gray-300 rounded-md p-2 focus:outline-none focus:border-neutral-300"
              value={dateTime}
              onChange={(e) => setDateTime(e.target.value)}
              required
            />
            <div className="flex gap-2">
              <button
                type="submit"
                className="bg-black hover:bg-neutral-800 text-white rounded-md p-2 flex-1 transition-colors cursor-pointer"
              >
                {editingId ? "Update" : "Submit"}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="bg-gray-500 hover:bg-gray-600 text-white rounded-md p-2 px-4 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        <div className="mb-4">
          <h2 className="text-2xl font-semibold mb-4">Saved Preferences</h2>
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">Loading...</div>
          ) : preferences.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No preferences yet. Create one above!
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {preferences.map((preference: Preference) => (
                <div
                  key={preference.id}
                  className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
                >
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold mb-2">
                      {preference.name}
                    </h3>
                    <p className="text-sm text-gray-600 mb-1">
                      <span className="font-medium">Email:</span>{" "}
                      {preference.email}
                    </p>
                    <p className="text-sm text-gray-600 mb-1">
                      <span className="font-medium">Phone:</span>{" "}
                      {preference.phoneNumber}
                    </p>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Date/Time:</span>{" "}
                      {preference.timeZone
                        ? new Intl.DateTimeFormat("en-US", {
                            dateStyle: "full",
                            timeStyle: "long",
                            timeZone: preference.timeZone,
                          }).format(new Date(preference.dateTime))
                        : new Date(preference.dateTime).toLocaleString()}
                    </p>
                    {/* <p className="text-sm text-gray-600">
                      <span className="font-medium">Time Zone:</span>{" "}
                      {preference.timeZone || "Not provided"}
                    </p> */}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(preference)}
                      className="bg-yellow-500 hover:bg-yellow-600 text-white rounded-md px-4 py-2 flex-1 transition-colors text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(preference.id)}
                      className="bg-red-500 hover:bg-red-600 text-white rounded-md px-4 py-2 flex-1 transition-colors text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
