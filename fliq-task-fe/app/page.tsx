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
    const systemTz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    return new Date().toISOString().slice(0, 16);
  });
  const [ipTimeZone, setIpTimeZone] = useState<string>("");
  const [ipTzError, setIpTzError] = useState<string | null>(null);
  const [userSelectedTimezone, setUserSelectedTimezone] = useState<boolean>(false);

  const systemTimeZone = useMemo<string>(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
      console.log("System timezone detected:", tz);
      return tz;
    } catch {
      console.log("Could not detect system timezone, using UTC");
      return "UTC";
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

    const uniqueZones = Array.from(new Set(ordered));
    console.log("Timezones array created:", { ipTimeZone, systemTimeZone, total: uniqueZones.length });
    return uniqueZones;
  }, [systemTimeZone, ipTimeZone]);

  const [selectedTimeZone, setSelectedTimeZone] = useState<string>(systemTimeZone);
  const [now, setNow] = useState<Date>(() => new Date());

  const getTimezoneOffsetMinutes = (timeZone: string, date: Date): number => {
    try {
      // Get the UTC time components
      const utcTime = date.getTime();
      
      const tzFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timeZone,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
      
      const utcFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'UTC',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
      
      // Format both
      const tzParts = tzFormatter.formatToParts(date);
      const utcParts = utcFormatter.formatToParts(date);
      
      const tzHour = parseInt(tzParts.find(p => p.type === 'hour')?.value || '0');
      const tzMinute = parseInt(tzParts.find(p => p.type === 'minute')?.value || '0');
      const utcHour = parseInt(utcParts.find(p => p.type === 'hour')?.value || '0');
      const utcMinute = parseInt(utcParts.find(p => p.type === 'minute')?.value || '0');
      
      // Calculate the difference in minutes
      const tzTotalMinutes = tzHour * 60 + tzMinute;
      const utcTotalMinutes = utcHour * 60 + utcMinute;
      let offsetMinutes = tzTotalMinutes - utcTotalMinutes;
      
      // Handle day boundaries (if difference is more than 12 hours, it wrapped around)
      if (offsetMinutes > 720) offsetMinutes -= 1440;
      if (offsetMinutes < -720) offsetMinutes += 1440;
      
      return offsetMinutes;
    } catch {
      return 0;
    }
  };

  const convertToDateTimeLocal = useCallback(
    (date: Date, timeZone: string): string => {
      if (!timeZone) return "";

      try {
        console.log("convertToDateTimeLocal called:", { 
          date: date.toISOString(), 
          timeZone,
          currentUTCTime: new Date().toISOString()
        });
        
        // Get the time in the selected timezone
        const timeInSelectedTz = date.toLocaleString('sv-SE', {
          timeZone: timeZone,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        });

        console.log("Time in selected timezone:", timeInSelectedTz);
        
        // The datetime-local input interprets values in the browser's local timezone
        // So we need to convert: what time in the browser's local timezone represents
        // the same moment as this time in the selected timezone?
        
        // Step 1: Parse the time components from the selected timezone
        const [datePart, timePart] = timeInSelectedTz.split(' ');
        const [year, month, day] = datePart.split('-').map(Number);
        const [hours, minutes] = timePart.split(':').map(Number);
        
        // Step 2: Find the UTC time that would display as this time in the selected timezone
        const utcCandidate = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0));
        const targetOffsetMinutes = getTimezoneOffsetMinutes(timeZone, utcCandidate);
        const actualUtcTime = utcCandidate.getTime() - (targetOffsetMinutes * 60000);
        const actualUtcDate = new Date(actualUtcTime);
        
        // Step 3: Convert this UTC time to the browser's local timezone
        const localTimeString = actualUtcDate.toLocaleString('sv-SE', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        });
        
        console.log("Conversion:", {
          timeInSelectedTz,
          targetOffsetMinutes,
          actualUtcTime: actualUtcDate.toISOString(),
          localTimeString
        });
        
        // Format for datetime-local input (this is now in browser's local timezone)
        const [localDatePart, localTimePart] = localTimeString.split(' ');
        const result = `${localDatePart}T${localTimePart}`;
        
        console.log("convertToDateTimeLocal result:", result);
        return result;
      } catch (error) {
        console.error("Error in convertToDateTimeLocal:", error);
        return date.toISOString().slice(0, 16);
      }
    },
    []
  );

  const convertFromDateTimeLocal = (
    dateTimeLocal: string,
    timeZone: string
  ): string => {
    if (!dateTimeLocal || !timeZone) return "";

    try {
      console.log("Converting datetime-local to ISO:", { dateTimeLocal, timeZone });
      
      // Parse the datetime-local value (format: "YYYY-MM-DDTHH:mm")
      const [datePart, timePart] = dateTimeLocal.split('T');
      const [year, month, day] = datePart.split('-').map(Number);
      const [hours, minutes] = timePart.split(':').map(Number);
      
      // The datetime-local input value is now in the browser's local timezone
      // (because we converted it in convertToDateTimeLocal to show the equivalent local time)
      // So we interpret it as local time and convert directly to UTC
      const localDate = new Date(year, month - 1, day, hours, minutes, 0);
      // getTimezoneOffset() returns offset in minutes (positive means behind UTC)
      // So to convert to UTC, we subtract the offset
      const adjustedDate = new Date(localDate.getTime() - (localDate.getTimezoneOffset() * 60000));
      
      // Verify the conversion by formatting back to the selected timezone
      const formattedInSelectedTz = adjustedDate.toLocaleString('sv-SE', {
        timeZone: timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }).replace(' ', 'T');
      
      console.log("Conversion result:", {
        original: dateTimeLocal,
        timezone: timeZone,
        localDate: localDate.toISOString(),
        result: adjustedDate.toISOString(),
        formattedInSelectedTz: formattedInSelectedTz
      });
      
      return adjustedDate.toISOString();
    } catch (error) {
      console.error("Error converting datetime:", error);
      return "";
    }
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
    console.log("IP timezone effect triggered:", { ipTimeZone, editingId, userSelectedTimezone, selectedTimeZone });
    if (!ipTimeZone || editingId || userSelectedTimezone) return;
    if (selectedTimeZone === ipTimeZone) return;

    console.log("Setting timezone to IP-detected timezone:", ipTimeZone);
    setSelectedTimeZone(ipTimeZone);
    if (!editingId) {
      setDateTime(convertToDateTimeLocal(new Date(), ipTimeZone));
    }
  }, [ipTimeZone, editingId, userSelectedTimezone, selectedTimeZone, convertToDateTimeLocal]);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (selectedTimeZone && !editingId) {
      console.log("Updating datetime for selected timezone:", selectedTimeZone);
      const currentTimeInTz = convertToDateTimeLocal(
        new Date(),
        selectedTimeZone
      );
      console.log("Setting datetime to:", currentTimeInTz);
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
    } catch (error) {
      console.error("Error formatting datetime:", error);
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
              value={selectedTimeZone || ""}
              onChange={(e) => {
                const newTz = e.target.value;
                console.log("User manually selected timezone:", newTz);
                setSelectedTimeZone(newTz);
                setUserSelectedTimezone(true);

                if (newTz && !editingId) {
                  const currentTime = new Date();
                  console.log("Current UTC time:", currentTime.toISOString());
                  const localTimeValue = convertToDateTimeLocal(currentTime, newTz);
                  console.log("Setting datetime-local value to:", localTimeValue);
                  setDateTime(localTimeValue);
                }
              }}
              required
            >
              {Array.isArray(timeZones) && timeZones.map((timeZone) => (
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
